import { inflateRawSync } from "node:zlib";
import { RawTender } from "@/lib/ingestion/types";

interface CsvRow {
  [key: string]: string | undefined;
}

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_FILE_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const sanitized = value.replace(/[^\d.,-]/g, "").trim();

  if (!sanitized) {
    return undefined;
  }

  let normalized = sanitized;

  if (sanitized.includes(",") && sanitized.includes(".")) {
    if (sanitized.lastIndexOf(",") > sanitized.lastIndexOf(".")) {
      normalized = sanitized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = sanitized.replace(/,/g, "");
    }
  } else if (sanitized.includes(",")) {
    normalized = sanitized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractZipEntries(buffer: Buffer): Map<string, Buffer> {
  let eocdOffset = -1;
  const minOffset = Math.max(0, buffer.length - 65_557);

  for (let index = buffer.length - 22; index >= minOffset; index -= 1) {
    if (buffer.readUInt32LE(index) === ZIP_EOCD_SIGNATURE) {
      eocdOffset = index;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("[ingest] Ungueltiges ZIP: End of central directory nicht gefunden.");
  }

  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  const files = new Map<string, Buffer>();
  let cursor = centralDirectoryOffset;

  while (cursor < centralDirectoryEnd) {
    if (buffer.readUInt32LE(cursor) !== ZIP_CENTRAL_FILE_SIGNATURE) {
      throw new Error("[ingest] Ungueltiges ZIP: Eintrag im central directory ist fehlerhaft.");
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);

    const fileName = buffer.toString("utf8", cursor + 46, cursor + 46 + fileNameLength);
    cursor += 46 + fileNameLength + extraLength + commentLength;

    if (!fileName || fileName.endsWith("/")) {
      continue;
    }

    if (buffer.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_FILE_SIGNATURE) {
      throw new Error(`[ingest] Ungueltiges ZIP: local header fuer ${fileName} nicht gefunden.`);
    }

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    const compressedData = buffer.subarray(dataStart, dataEnd);

    let content: Buffer;

    if (compressionMethod === 0) {
      content = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      content = inflateRawSync(compressedData);
    } else {
      throw new Error(
        `[ingest] ZIP-Kompressionsmethode ${compressionMethod} wird nicht unterstuetzt (${fileName}).`,
      );
    }

    files.set(fileName.toLowerCase(), content);
  }

  return files;
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((entry) => entry.trim());
  headers[0] = headers[0]?.replace(/^\uFEFF/, "") ?? headers[0];

  return rows
    .slice(1)
    .filter((entries) => entries.some((entry) => entry.length > 0))
    .map((entries) => {
      const mapped: CsvRow = {};

      for (let index = 0; index < headers.length; index += 1) {
        mapped[headers[index]] = entries[index]?.trim() ?? "";
      }

      return mapped;
    });
}

function parseCsvEntry(entries: Map<string, Buffer>, fileName: string): CsvRow[] {
  const content = entries.get(fileName.toLowerCase());

  if (!content) {
    return [];
  }

  return parseCsv(content.toString("utf8"));
}

function buildNoticeKey(row: CsvRow): string | undefined {
  const noticeIdentifier = row.noticeIdentifier?.trim();
  const noticeVersion = row.noticeVersion?.trim();

  if (!noticeIdentifier || !noticeVersion) {
    return undefined;
  }

  return `${noticeIdentifier}::${noticeVersion}`;
}

function compareNoticeVersion(a: string, b: string): number {
  const asNumber = Number(a);
  const bsNumber = Number(b);

  if (Number.isFinite(asNumber) && Number.isFinite(bsNumber)) {
    return asNumber - bsNumber;
  }

  return a.localeCompare(b);
}

function isCompetitionNotice(row: CsvRow): boolean {
  const formType = row.formType?.toLowerCase();
  const noticeType = row.noticeType?.toLowerCase() ?? "";

  if (formType !== "competition") {
    return false;
  }

  return noticeType.startsWith("cn");
}

function selectLatestCompetitionNotices(rows: CsvRow[]): CsvRow[] {
  const selected = new Map<string, CsvRow>();

  for (const row of rows) {
    if (!isCompetitionNotice(row)) {
      continue;
    }

    const noticeIdentifier = row.noticeIdentifier?.trim();
    const noticeVersion = row.noticeVersion?.trim();

    if (!noticeIdentifier || !noticeVersion) {
      continue;
    }

    const existing = selected.get(noticeIdentifier);

    if (!existing) {
      selected.set(noticeIdentifier, row);
      continue;
    }

    const existingVersion = existing.noticeVersion?.trim() ?? "0";

    if (compareNoticeVersion(noticeVersion, existingVersion) > 0) {
      selected.set(noticeIdentifier, row);
    }
  }

  return [...selected.values()];
}

function groupByNoticeKey(rows: CsvRow[]): Map<string, CsvRow[]> {
  const grouped = new Map<string, CsvRow[]>();

  for (const row of rows) {
    const key = buildNoticeKey(row);

    if (!key) {
      continue;
    }

    const bucket = grouped.get(key);

    if (bucket) {
      bucket.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }

  return grouped;
}

function pickNoticeRow(rows: CsvRow[]): CsvRow | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  return rows.find((row) => !row.lotIdentifier) ?? rows[0];
}

function extractCpvCodes(rows: CsvRow[]): string[] | undefined {
  const codes = new Set<string>();

  for (const row of rows) {
    const source = [row.mainClassificationCode, row.additionalClassificationCodes]
      .filter((value): value is string => Boolean(value))
      .join(" ");

    const matches = source.match(/\b\d{8}\b/g) ?? [];

    for (const code of matches) {
      codes.add(code);
    }
  }

  return codes.size > 0 ? [...codes] : undefined;
}

function mapNoticeToRawTender(
  notice: CsvRow,
  proceduresByNotice: Map<string, CsvRow[]>,
  purposesByNotice: Map<string, CsvRow[]>,
  classificationsByNotice: Map<string, CsvRow[]>,
  placesByNotice: Map<string, CsvRow[]>,
  submissionTermsByNotice: Map<string, CsvRow[]>,
  organisationsByNotice: Map<string, CsvRow[]>,
): RawTender | undefined {
  const noticeKey = buildNoticeKey(notice);

  if (!noticeKey) {
    return undefined;
  }

  const purposeRows = purposesByNotice.get(noticeKey) ?? [];
  const classificationRows = classificationsByNotice.get(noticeKey) ?? [];
  const placeRows = placesByNotice.get(noticeKey) ?? [];
  const submissionTermRows = submissionTermsByNotice.get(noticeKey) ?? [];
  const organisationRows = organisationsByNotice.get(noticeKey) ?? [];

  const procedure = (proceduresByNotice.get(noticeKey) ?? [])[0];
  const purpose = pickNoticeRow(purposeRows);
  const place = pickNoticeRow(placeRows);
  const submissionTerms = pickNoticeRow(submissionTermRows);

  const buyer =
    organisationRows.find((row) => row.organisationRole?.toLowerCase().includes("buyer")) ??
    organisationRows[0];

  const estimatedValues = purposeRows
    .map((row) => parseNumber(row.estimatedValue))
    .filter((value): value is number => value !== undefined);

  const estimatedValueMin =
    estimatedValues.length > 0 ? Math.min(...estimatedValues) : undefined;
  const estimatedValueMax =
    estimatedValues.length > 0 ? Math.max(...estimatedValues) : undefined;

  const keywords = [
    purpose?.mainNature,
    purpose?.additionalNature,
    notice.noticeType,
    procedure?.procedureFeatures,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return {
    source: "oeffentlichevergabe",
    externalNoticeId: notice.noticeIdentifier?.trim(),
    title: firstNonEmpty(purpose?.title, purpose?.internalIdentifier),
    issuer: buyer?.organisationName?.trim(),
    region: firstNonEmpty(
      place?.placePerformanceCountrySubdivision,
      buyer?.organisationCountrySubdivision,
    ),
    city: firstNonEmpty(place?.placePerformanceCity, buyer?.organisationCity),
    countryCode: firstNonEmpty(
      place?.placePerformanceCountryCode,
      buyer?.organisationCountryCode,
    ),
    cpvCodes: extractCpvCodes(classificationRows),
    publicationDate: notice.publicationDate?.trim(),
    deadlineDate: firstNonEmpty(
      submissionTerms?.tenderValidityDeadline,
      submissionTerms?.publicOpeningDate,
    ),
    procedureType: procedure?.procedureType?.trim(),
    estimatedValueMin,
    estimatedValueMax,
    keywords: keywords.length > 0 ? keywords : undefined,
    description: purpose?.description?.trim(),
    sourceUrl: notice.noticeIdentifier?.trim()
      ? `https://www.oeffentlichevergabe.de/ui/notice/${notice.noticeIdentifier.trim()}`
      : undefined,
  };
}

function getDefaultPubDay(): string {
  const todayInBerlin = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [year, month, day] = todayInBerlin.split("-").map((entry) => Number(entry));
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - 1);

  return utcDate.toISOString().slice(0, 10);
}

function buildOpenDataUrl(): string {
  const configuredUrl = readEnv("OEFFENTLICHEVERGABE_API_URL");

  if (configuredUrl) {
    const parsedUrl = new URL(configuredUrl);

    if (
      !parsedUrl.searchParams.has("pubMonth") &&
      !parsedUrl.searchParams.has("pubDay")
    ) {
      parsedUrl.searchParams.set("pubDay", getDefaultPubDay());
    }

    if (!parsedUrl.searchParams.has("format")) {
      parsedUrl.searchParams.set("format", "csv.zip");
    }

    return parsedUrl.toString();
  }

  const pubMonth = readEnv("OEFFENTLICHEVERGABE_PUB_MONTH");
  const pubDay = readEnv("OEFFENTLICHEVERGABE_PUB_DAY");

  if (pubMonth && pubDay) {
    throw new Error(
      "[ingest] OEFFENTLICHEVERGABE_PUB_MONTH und OEFFENTLICHEVERGABE_PUB_DAY schliessen sich gegenseitig aus.",
    );
  }

  const params = new URLSearchParams();

  if (pubMonth) {
    params.set("pubMonth", pubMonth);
  } else {
    params.set("pubDay", pubDay ?? getDefaultPubDay());
  }

  params.set("format", "csv.zip");

  return `https://oeffentlichevergabe.de/api/notice-exports?${params.toString()}`;
}

export async function fetchRawTenders(): Promise<RawTender[]> {
  const url = buildOpenDataUrl();

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.bekanntmachungsservice.csv.zip+zip",
    },
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(
      `[ingest] öffentlichevergabe request failed (${response.status} ${response.statusText})`,
    );
  }

  const zipBuffer = Buffer.from(await response.arrayBuffer());
  const entries = extractZipEntries(zipBuffer);

  const notices = parseCsvEntry(entries, "notice.csv");

  if (notices.length === 0) {
    console.warn("[ingest] OEFFENTLICHEVERGABE notice.csv ist leer oder nicht vorhanden.");
    return [];
  }

  const proceduresByNotice = groupByNoticeKey(parseCsvEntry(entries, "procedure.csv"));
  const purposesByNotice = groupByNoticeKey(parseCsvEntry(entries, "purpose.csv"));
  const classificationsByNotice = groupByNoticeKey(parseCsvEntry(entries, "classification.csv"));
  const placesByNotice = groupByNoticeKey(parseCsvEntry(entries, "placeOfPerformance.csv"));
  const submissionTermsByNotice = groupByNoticeKey(parseCsvEntry(entries, "submissionTerms.csv"));
  const organisationsByNotice = groupByNoticeKey(parseCsvEntry(entries, "organisation.csv"));

  const latestCompetitionNotices = selectLatestCompetitionNotices(notices);

  return latestCompetitionNotices
    .map((notice) =>
      mapNoticeToRawTender(
        notice,
        proceduresByNotice,
        purposesByNotice,
        classificationsByNotice,
        placesByNotice,
        submissionTermsByNotice,
        organisationsByNotice,
      ),
    )
    .filter((row): row is RawTender => Boolean(row));
}
