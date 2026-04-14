import { RawTender } from "@/lib/ingestion/types";

function normalizeToken(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildFallbackFingerprint(rawTender: RawTender): string {
  const title = normalizeToken(rawTender.title);
  const issuer = normalizeToken(rawTender.issuer);
  const deadline = normalizeToken(rawTender.deadlineDate);
  const region = normalizeToken(rawTender.region ?? rawTender.city);

  return `${title}|${issuer}|${deadline}|${region}`;
}

export function deduplicateTenders(rawTenders: RawTender[]): RawTender[] {
  const seenExternalIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  return rawTenders.filter((rawTender) => {
    const externalId = normalizeToken(rawTender.externalNoticeId);

    if (externalId) {
      if (seenExternalIds.has(externalId)) {
        return false;
      }

      seenExternalIds.add(externalId);
      return true;
    }

    const fingerprint = buildFallbackFingerprint(rawTender);

    if (seenFingerprints.has(fingerprint)) {
      return false;
    }

    seenFingerprints.add(fingerprint);
    return true;
  });
}
