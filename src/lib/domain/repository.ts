import { readFileSync } from "node:fs";
import { join } from "node:path";
import { seedCompanies, seedTenders } from "@/data/seed";
import { CompanyProfile, Tender } from "@/lib/domain/types";

interface IngestedSnapshot {
  tenders?: Tender[];
}

function getIngestedTenders(): Tender[] {
  try {
    const snapshotPath = join(process.cwd(), "src/data/ingested-tenders.json");
    const snapshotContent = readFileSync(snapshotPath, "utf8");
    const parsed = JSON.parse(snapshotContent) as IngestedSnapshot;

    if (Array.isArray(parsed.tenders) && parsed.tenders.length > 0) {
      return parsed.tenders;
    }
  } catch {}

  return seedTenders;
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
