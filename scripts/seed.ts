import { createClient } from "@supabase/supabase-js";
import { seedCompanies, seedTenders } from "../src/data/seed";
import { calculateMatchesForAllTenders } from "../src/lib/matching/score";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Fehlende Umgebungsvariablen. Bitte NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzen.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error: tenderError } = await supabase.from("tenders").upsert(
    seedTenders.map((tender) => ({
      id: tender.id,
      title: tender.title,
      issuer: tender.issuer,
      region: tender.region,
      publication_date: tender.publicationDate,
      deadline_date: tender.deadlineDate,
      procedure_type: tender.procedureType,
      estimated_value_min: tender.estimatedValueMin,
      estimated_value_max: tender.estimatedValueMax,
      focus_areas: tender.focusAreas,
      keywords: tender.keywords,
      required_evidence: tender.requiredEvidence,
      description: tender.description,
    })),
    { onConflict: "id" },
  );

  if (tenderError) {
    throw tenderError;
  }

  const { error: companyError } = await supabase.from("companies").upsert(
    seedCompanies.map((company) => ({
      id: company.id,
      name: company.name,
      headquarter: company.headquarter,
      service_regions: company.serviceRegions,
      focus_areas: company.focusAreas,
      keywords: company.keywords,
      certifications: company.certifications,
      min_project_volume: company.minProjectVolume,
      max_project_volume: company.maxProjectVolume,
    })),
    { onConflict: "id" },
  );

  if (companyError) {
    throw companyError;
  }

  const matchesByTender = calculateMatchesForAllTenders(seedTenders, seedCompanies);
  const flattenedMatches = Object.values(matchesByTender).flat();

  const { error: matchesError } = await supabase.from("match_results").upsert(
    flattenedMatches.map((match) => ({
      tender_id: match.tenderId,
      company_id: match.companyId,
      fit_score: match.fitScore,
      reasons: match.reasons,
      missing_evidence: match.missingEvidence,
      criteria: match.criteria,
      computed_at: new Date().toISOString(),
    })),
    { onConflict: "tender_id,company_id" },
  );

  if (matchesError) {
    throw matchesError;
  }

  console.log(
    `Seed abgeschlossen: ${seedTenders.length} Ausschreibungen, ${seedCompanies.length} Unternehmen, ${flattenedMatches.length} Matches.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
