import { readFileSync } from "node:fs";
import { join } from "node:path";
import { seedCompanies, seedTenders } from "@/data/seed";
import { CompanyProfile, Tender } from "@/lib/domain/types";

interface IngestedSnapshot {
  tenders?: Tender[];
}

function buildSourceUrlFromTenderId(tenderId: string): string | undefined {
  if (tenderId.startsWith("oeffentlichevergabe-")) {
    const noticeId = tenderId.slice("oeffentlichevergabe-".length).trim();

    if (noticeId.length > 0) {
      return `https://www.oeffentlichevergabe.de/ui/notice/${noticeId}`;
    }
  }

  return undefined;
}

function withSourceUrls(tenders: Tender[]): Tender[] {
  return tenders.map((tender) => {
    if (tender.sourceUrl) {
      return tender;
    }

    const derivedSourceUrl = buildSourceUrlFromTenderId(tender.id);

    if (!derivedSourceUrl) {
      return tender;
    }

    return {
      ...tender,
      sourceUrl: derivedSourceUrl,
    };
  });
}

function getIngestedTenders(): Tender[] {
  try {
    const snapshotPath = join(process.cwd(), "src/data/ingested-tenders.json");
    const snapshotContent = readFileSync(snapshotPath, "utf8");
    const parsed = JSON.parse(snapshotContent) as IngestedSnapshot;

    if (Array.isArray(parsed.tenders) && parsed.tenders.length > 0) {
      return withSourceUrls(parsed.tenders);
    }
  } catch {}

  return withSourceUrls(seedTenders);
}

export function getTenders(): Tender[] {
  return getIngestedTenders();
}

export function getCompanies(): CompanyProfile[] {
  return seedCompanies;
}

export function getTenderById(tenderId: string): Tender | undefined {
  return getTenders().find((tender) => tender.id === tenderId);
}

export function getCompanyById(companyId: string): CompanyProfile | undefined {
  return seedCompanies.find((company) => company.id === companyId);
}
