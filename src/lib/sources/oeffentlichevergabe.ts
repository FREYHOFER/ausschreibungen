import { RawTender } from "@/lib/ingestion/types";

interface RawRecord {
  [key: string]: unknown;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return normalized.length > 0 ? normalized : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function mapRecordToRawTender(record: RawRecord): RawTender {
  return {
    source: "oeffentlichevergabe",
    externalNoticeId: asString(record.externalNoticeId ?? record.noticeId ?? record.id),
    title: asString(record.title ?? record.titel),
    issuer: asString(record.issuer ?? record.contractingAuthority ?? record.vergabestelle),
    region: asString(record.region ?? record.state ?? record.bundesland),
    city: asString(record.city ?? record.ort),
    countryCode: asString(record.countryCode ?? record.country ?? record.land),
    cpvCodes: asStringArray(record.cpvCodes ?? record.cpv),
    cpvContext: asStringArray(record.cpvContext),
    publicationDate: asString(record.publicationDate ?? record.publishedAt ?? record.veroeffentlichung),
    deadlineDate: asString(record.deadlineDate ?? record.submissionDeadline ?? record.frist),
    procedureType: asString(record.procedureType ?? record.verfahrensart),
    estimatedValueMin: asNumber(record.estimatedValueMin ?? record.valueMin),
    estimatedValueMax: asNumber(record.estimatedValueMax ?? record.valueMax),
    keywords: asStringArray(record.keywords),
    requiredEvidence: asStringArray(record.requiredEvidence),
    description: asString(record.description ?? record.beschreibung),
  };
}

function extractRecords(payload: unknown): RawRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (entry): entry is RawRecord => typeof entry === "object" && entry !== null,
    );
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "items" in payload &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return ((payload as { items: unknown[] }).items ?? []).filter(
      (entry): entry is RawRecord => typeof entry === "object" && entry !== null,
    );
  }

  return [];
}

export async function fetchRawTenders(): Promise<RawTender[]> {
  const url = process.env.OEFFENTLICHEVERGABE_API_URL;

  if (!url) {
    console.warn("[ingest] OEFFENTLICHEVERGABE_API_URL ist nicht gesetzt; Quelle wird übersprungen.");
    return [];
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(process.env.OEFFENTLICHEVERGABE_API_KEY
        ? { Authorization: `Bearer ${process.env.OEFFENTLICHEVERGABE_API_KEY}` }
        : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `[ingest] öffentlichevergabe request failed (${response.status} ${response.statusText})`,
    );
  }

  const payload = (await response.json()) as unknown;
  return extractRecords(payload).map(mapRecordToRawTender);
}
