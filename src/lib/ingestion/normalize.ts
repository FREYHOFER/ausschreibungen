import { createHash } from "node:crypto";
import { Tender, TenderFocusArea } from "@/lib/domain/types";
import { RawTender } from "@/lib/ingestion/types";

const FOCUS_AREA_KEYWORDS: Record<TenderFocusArea, string[]> = {
  cloud: ["cloud", "aws", "azure", "kubernetes"],
  cybersecurity: ["cyber", "security", "siem", "soc", "nis2", "kritis"],
  "data-analytics": ["data", "analytics", "etl", "dashboard", "bi"],
  "software-engineering": ["software", "entwicklung", "typescript", "react", "api"],
  "managed-services": ["betrieb", "managed", "service desk", "monitoring", "wartung"],
  networking: ["netzwerk", "wlan", "switch", "routing", "lan"],
  reinigung: ["reinigung", "unterhaltsreinigung", "grundreinigung", "hygiene"],
  bau: ["bau", "sanierung", "fassade", "dach", "fenster"],
  "facility-management": ["facility", "gebäudemanagement", "hausmeister", "cafm"],
  "transport-logistik": ["transport", "logistik", "lieferung", "flotte"],
};

function normalizeDate(value: string | undefined, fallbackDate: Date): string {
  if (!value) {
    return fallbackDate.toISOString().slice(0, 10);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate.toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function mapProcedureType(value: string | undefined): Tender["procedureType"] {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("nicht") || normalized.includes("restricted")) {
    return "nicht-offen";
  }

  if (normalized.includes("verhandlung") || normalized.includes("negotiated")) {
    return "verhandlungsverfahren";
  }

  return "offen";
}

function buildFocusAreas(rawTender: RawTender): TenderFocusArea[] {
  const textPool = [
    rawTender.title,
    rawTender.description,
    rawTender.procedureType,
    ...(rawTender.keywords ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  const focusAreas = (Object.keys(FOCUS_AREA_KEYWORDS) as TenderFocusArea[]).filter(
    (focusArea) =>
      FOCUS_AREA_KEYWORDS[focusArea].some((keyword) => textPool.includes(keyword)),
  );

  return focusAreas.length > 0 ? focusAreas : ["software-engineering"];
}

function buildKeywords(rawTender: RawTender): string[] {
  const fromFields = [
    ...(rawTender.keywords ?? []),
    ...(rawTender.cpvCodes ?? []),
    ...(rawTender.cpvContext ?? []),
  ];

  const deduplicated = Array.from(
    new Set(
      fromFields
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );

  return deduplicated.slice(0, 20);
}

function createTenderId(rawTender: RawTender): string {
  if (rawTender.externalNoticeId) {
    return `${rawTender.source}-${rawTender.externalNoticeId}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const hash = createHash("sha256")
    .update(
      [
        rawTender.source,
        rawTender.title ?? "",
        rawTender.issuer ?? "",
        rawTender.deadlineDate ?? "",
        rawTender.region ?? rawTender.city ?? "",
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);

  return `${rawTender.source}-${hash}`;
}

export function normalizeRawTender(rawTender: RawTender): Tender {
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(now.getDate() + 30);

  const estimatedMin = Math.max(0, Math.round(rawTender.estimatedValueMin ?? 0));
  const estimatedMax = Math.max(
    estimatedMin,
    Math.round(rawTender.estimatedValueMax ?? estimatedMin),
  );

  return {
    id: createTenderId(rawTender),
    title: rawTender.title ?? "Unbenannte Ausschreibung",
    issuer: rawTender.issuer ?? "Unbekannte Vergabestelle",
    region: rawTender.region ?? rawTender.city ?? "Bundesweit",
    publicationDate: normalizeDate(rawTender.publicationDate, now),
    deadlineDate: normalizeDate(rawTender.deadlineDate, in30Days),
    procedureType: mapProcedureType(rawTender.procedureType),
    estimatedValueMin: estimatedMin,
    estimatedValueMax: estimatedMax,
    focusAreas: buildFocusAreas(rawTender),
    keywords: buildKeywords(rawTender),
    requiredEvidence: rawTender.requiredEvidence ?? [],
    description:
      rawTender.description ??
      "Automatisch importierte Bekanntmachung aus externer Vergabequelle.",
  };
}

export function normalizeRawTenders(rawTenders: RawTender[]): Tender[] {
  return rawTenders.map(normalizeRawTender);
}
