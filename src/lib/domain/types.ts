export type TenderFocusArea =
  | "cloud"
  | "cybersecurity"
  | "data-analytics"
  | "software-engineering"
  | "managed-services"
  | "networking"
  | "reinigung"
  | "bau"
  | "facility-management"
  | "transport-logistik";

export interface Tender {
  id: string;
  title: string;
  issuer: string;
  region: string;
  publicationDate: string;
  deadlineDate: string;
  procedureType: "offen" | "nicht-offen" | "verhandlungsverfahren";
  estimatedValueMin: number;
  estimatedValueMax: number;
  focusAreas: TenderFocusArea[];
  keywords: string[];
  requiredEvidence: string[];
  description: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  headquarter: string;
  serviceRegions: string[];
  focusAreas: TenderFocusArea[];
  keywords: string[];
  certifications: string[];
  minProjectVolume: number;
  maxProjectVolume: number;
}

export interface MatchCriterion {
  name: string;
  weight: number;
  score: number;
  explanation: string;
}

export interface MatchResult {
  tenderId: string;
  companyId: string;
  fitScore: number;
  reasons: string[];
  missingEvidence: string[];
  criteria: MatchCriterion[];
}
