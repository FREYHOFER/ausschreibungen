import { TenderFocusArea } from "@/lib/domain/types";

export const focusAreaLabels: Record<TenderFocusArea, string> = {
  cloud: "Cloud Plattform",
  cybersecurity: "Cybersecurity",
  "data-analytics": "Datenanalyse",
  "software-engineering": "Softwareentwicklung",
  "managed-services": "Managed Services",
  networking: "Netzwerkbetrieb",
  reinigung: "Gebäudereinigung",
  bau: "Bauleistungen",
  "facility-management": "Facility Management",
  "transport-logistik": "Transport & Logistik",
};

export function labelFocusArea(area: TenderFocusArea): string {
  return focusAreaLabels[area];
}

export function labelFocusAreas(areas: TenderFocusArea[]): string {
  return areas.map((area) => labelFocusArea(area)).join(" · ");
}
