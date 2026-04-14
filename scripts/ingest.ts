import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { deduplicateTenders } from "../src/lib/ingestion/deduplicate";
import { filterGermanTenders } from "../src/lib/ingestion/filter";
import { normalizeRawTenders } from "../src/lib/ingestion/normalize";
import { fetchRawTenders as fetchOeffentlichevergabeRawTenders } from "../src/lib/sources/oeffentlichevergabe";
import { fetchRawTenders as fetchTedRawTenders } from "../src/lib/sources/ted";

const OUTPUT_FILE = join(process.cwd(), "src/data/ingested-tenders.json");

interface Snapshot {
  generatedAt: string;
  sourceCounts: {
    oeffentlichevergabe: number;
    ted: number;
  };
  filteredCount: number;
  deduplicatedCount: number;
  finalCount: number;
  tenders: unknown[];
}

async function readExistingSnapshotCount(): Promise<number> {
  try {
    const existing = await readFile(OUTPUT_FILE, "utf8");
    const parsed = JSON.parse(existing) as { tenders?: unknown[] };
    return Array.isArray(parsed.tenders) ? parsed.tenders.length : 0;
  } catch {
    return 0;
  }
}

async function main() {
  const [oeffentlichevergabeRaw, tedRaw] = await Promise.all([
    fetchOeffentlichevergabeRawTenders(),
    fetchTedRawTenders(),
  ]);

  const loadedCount = {
    oeffentlichevergabe: oeffentlichevergabeRaw.length,
    ted: tedRaw.length,
  };

  const combined = [...oeffentlichevergabeRaw, ...tedRaw];
  const germanOnly = filterGermanTenders(combined);
  const deduplicated = deduplicateTenders(germanOnly);
  const normalized = normalizeRawTenders(deduplicated);

  const existingCount = await readExistingSnapshotCount();

  if (normalized.length === 0 && existingCount > 0) {
    console.log(
      `[ingest] Keine neuen Daten erhalten; bestehender Snapshot (${existingCount}) bleibt unverändert.`,
    );
    console.log(
      `[ingest] geladen: oeffentlichevergabe=${loadedCount.oeffentlichevergabe}, ted=${loadedCount.ted}, gefiltert(DE)=${germanOnly.length}, dedupliziert=${deduplicated.length}, final=0`,
    );
    return;
  }

  const snapshot: Snapshot = {
    generatedAt: new Date().toISOString(),
    sourceCounts: loadedCount,
    filteredCount: germanOnly.length,
    deduplicatedCount: deduplicated.length,
    finalCount: normalized.length,
    tenders: normalized,
  };

  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(
    `[ingest] geladen: oeffentlichevergabe=${loadedCount.oeffentlichevergabe}, ted=${loadedCount.ted}, gefiltert(DE)=${germanOnly.length}, dedupliziert=${deduplicated.length}, final=${normalized.length}`,
  );
  console.log(`[ingest] Snapshot gespeichert: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
