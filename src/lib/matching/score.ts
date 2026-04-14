import {
  CompanyProfile,
  MatchCriterion,
  MatchResult,
  Tender,
} from "@/lib/domain/types";
import { buildFallbackReason, buildReasons } from "@/lib/matching/reasons";

const WEIGHTS = {
  focusAreas: 30,
  keywords: 25,
  region: 15,
  evidence: 20,
  budget: 10,
} as const;

function intersectionSize(left: string[], right: string[]): number {
  const rightSet = new Set(right.map((entry) => entry.toLowerCase()));

  return left.reduce((count, entry) => {
    return rightSet.has(entry.toLowerCase()) ? count + 1 : count;
  }, 0);
}

function scoreFocusAreas(tender: Tender, company: CompanyProfile): MatchCriterion {
  const matches = intersectionSize(tender.focusAreas, company.focusAreas);
  const denominator = Math.max(1, tender.focusAreas.length);
  const score = matches / denominator;

  return {
    name: "Fachgebiet",
    weight: WEIGHTS.focusAreas,
    score,
    explanation: `${matches}/${denominator} Kernbereiche werden direkt abgedeckt.`,
  };
}

function scoreKeywords(tender: Tender, company: CompanyProfile): MatchCriterion {
  const tenderKeywordPool = [tender.title, tender.description, ...tender.keywords]
    .join(" ")
    .toLowerCase();

  const keywordHits = company.keywords.filter((keyword) =>
    tenderKeywordPool.includes(keyword.toLowerCase()),
  ).length;

  const score = keywordHits / Math.max(1, company.keywords.length);

  return {
    name: "Technologie-Keywords",
    weight: WEIGHTS.keywords,
    score,
    explanation: `${keywordHits} relevante Keyword-Treffer in Leistungsbeschreibung und Titel.`,
  };
}

function scoreRegion(tender: Tender, company: CompanyProfile): MatchCriterion {
  const hasRegionalFit =
    company.serviceRegions.includes(tender.region) ||
    company.serviceRegions.includes("Bundesweit");

  return {
    name: "Region",
    weight: WEIGHTS.region,
    score: hasRegionalFit ? 1 : 0,
    explanation: hasRegionalFit
      ? "Leistungsgebiet deckt die ausgeschriebene Region ab."
      : "Region liegt außerhalb des hinterlegten Leistungsgebiets.",
  };
}

function scoreEvidence(tender: Tender, company: CompanyProfile): MatchCriterion {
  if (tender.requiredEvidence.length === 0) {
    return {
      name: "Nachweise",
      weight: WEIGHTS.evidence,
      score: 1,
      explanation: "Keine verpflichtenden Nachweise hinterlegt.",
    };
  }

  const matches = intersectionSize(tender.requiredEvidence, company.certifications);
  const score = matches / tender.requiredEvidence.length;

  return {
    name: "Nachweise",
    weight: WEIGHTS.evidence,
    score,
    explanation: `${matches}/${tender.requiredEvidence.length} Pflichtnachweise sind bereits vorhanden.`,
  };
}

function scoreBudget(tender: Tender, company: CompanyProfile): MatchCriterion {
  const tenderMidpoint = (tender.estimatedValueMin + tender.estimatedValueMax) / 2;
  const withinRange =
    tenderMidpoint >= company.minProjectVolume &&
    tenderMidpoint <= company.maxProjectVolume;

  const score = withinRange ? 1 : 0.35;

  return {
    name: "Projektvolumen",
    weight: WEIGHTS.budget,
    score,
    explanation: withinRange
      ? "Projektvolumen liegt im bevorzugten Auftragskorridor."
      : "Projektvolumen weicht vom hinterlegten Zielkorridor ab.",
  };
}

function collectMissingEvidence(tender: Tender, company: CompanyProfile): string[] {
  const companyEvidenceSet = new Set(
    company.certifications.map((entry) => entry.toLowerCase()),
  );

  return tender.requiredEvidence.filter(
    (evidence) => !companyEvidenceSet.has(evidence.toLowerCase()),
  );
}

function scoreToPercent(criteria: MatchCriterion[]): number {
  const weighted = criteria.reduce(
    (sum, criterion) => sum + criterion.score * criterion.weight,
    0,
  );

  return Math.round(Math.max(0, Math.min(100, weighted)));
}

export function calculateMatch(tender: Tender, company: CompanyProfile): MatchResult {
  const criteria = [
    scoreFocusAreas(tender, company),
    scoreKeywords(tender, company),
    scoreRegion(tender, company),
    scoreEvidence(tender, company),
    scoreBudget(tender, company),
  ];

  const reasons = buildReasons(criteria);
  const missingEvidence = collectMissingEvidence(tender, company);

  if (reasons.length === 0) {
    reasons.push(buildFallbackReason(criteria));
  }

  return {
    tenderId: tender.id,
    companyId: company.id,
    fitScore: scoreToPercent(criteria),
    reasons,
    missingEvidence,
    criteria,
  };
}

export function calculateMatchesForTender(
  tender: Tender,
  companies: CompanyProfile[],
): MatchResult[] {
  return companies
    .map((company) => calculateMatch(tender, company))
    .sort((left, right) => right.fitScore - left.fitScore);
}

export function calculateMatchesForAllTenders(
  tenders: Tender[],
  companies: CompanyProfile[],
): Record<string, MatchResult[]> {
  return tenders.reduce<Record<string, MatchResult[]>>((acc, tender) => {
    acc[tender.id] = calculateMatchesForTender(tender, companies);
    return acc;
  }, {});
}
