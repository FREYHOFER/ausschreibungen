export type TenderSource = "oeffentlichevergabe" | "ted";

export interface RawTender {
  source: TenderSource;
  externalNoticeId?: string;
  title?: string;
  issuer?: string;
  region?: string;
  city?: string;
  countryCode?: string;
  cpvCodes?: string[];
  cpvContext?: string[];
  publicationDate?: string;
  deadlineDate?: string;
  procedureType?: string;
  estimatedValueMin?: number;
  estimatedValueMax?: number;
  keywords?: string[];
  requiredEvidence?: string[];
  description?: string;
}
