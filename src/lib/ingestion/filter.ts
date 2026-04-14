import { RawTender } from "@/lib/ingestion/types";

const GERMAN_LOCATION_HINTS = [
  "deutschland",
  "germany",
  "berlin",
  "hamburg",
  "münchen",
  "munich",
  "köln",
  "cologne",
  "frankfurt",
  "nordrhein-westfalen",
  "bayern",
  "sachsen",
  "hessen",
  "bundesweit",
];

function containsGermanLocationHint(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return GERMAN_LOCATION_HINTS.some((hint) => normalized.includes(hint));
}

function hasGermanCpvContext(cpvContext: string[] | undefined): boolean {
  if (!cpvContext || cpvContext.length === 0) {
    return false;
  }

  return cpvContext.some((entry) => containsGermanLocationHint(entry));
}

export function isGermanTender(rawTender: RawTender): boolean {
  const countryCode = rawTender.countryCode?.toLowerCase();

  if (countryCode === "de" || countryCode === "deu" || countryCode === "deutschland") {
    return true;
  }

  if (containsGermanLocationHint(rawTender.region)) {
    return true;
  }

  if (containsGermanLocationHint(rawTender.city)) {
    return true;
  }

  if (hasGermanCpvContext(rawTender.cpvContext)) {
    return true;
  }

  return false;
}

export function filterGermanTenders(rawTenders: RawTender[]): RawTender[] {
  return rawTenders.filter(isGermanTender);
}
