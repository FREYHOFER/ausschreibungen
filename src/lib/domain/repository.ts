import { seedCompanies, seedTenders } from "@/data/seed";
import { CompanyProfile, Tender } from "@/lib/domain/types";

export function getTenders(): Tender[] {
  return seedTenders;
}

export function getCompanies(): CompanyProfile[] {
  return seedCompanies;
}

export function getTenderById(tenderId: string): Tender | undefined {
  return seedTenders.find((tender) => tender.id === tenderId);
}

export function getCompanyById(companyId: string): CompanyProfile | undefined {
  return seedCompanies.find((company) => company.id === companyId);
}
