# Vergabe Radar MVP

MVP fuer erklaerbares Matching von oeffentlichen IT-Ausschreibungen.

Der aktuelle Stand liefert:
- Dashboard mit Ausschreibungen und Top-3 Match-Empfehlungen
- Detailseite pro Ausschreibung mit transparenter Kriterienaufschluesselung
- Profil-Simulator fuer IT-Dienstleister mit Live-Ranking
- API-Endpunkt fuer Match-Daten
- Supabase-Migrationsdatei und Seed-Skript fuer den naechsten Ausbauschritt

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- React 19
- Supabase SDK (inkl. Initialschema)

## Lokaler Start

```bash
npm install
npm run dev
```

App starten unter http://localhost:3000

## MVP Routen

- `/` Dashboard
- `/tenders/[id]` Ausschreibungs-Detailanalyse
- `/company` Profil-Simulator
- `/api/matches` Match-Daten fuer alle Ausschreibungen
- `/api/matches?tenderId=<id>` Match-Daten fuer eine Ausschreibung

## Supabase vorbereiten

1. `.env.example` nach `.env.local` kopieren
2. Werte fuer Supabase URL und Keys eintragen
3. Migration aus `supabase/migrations/001_initial.sql` in Supabase ausfuehren
4. Seed starten:

```bash
npm run seed
```

## Ingestion (oeffentlichevergabe + TED)

- Quelle 1 (offiziell, ohne Key): Open Data des Bekanntmachungsservice
	- Standard-Endpoint: `https://oeffentlichevergabe.de/api/notice-exports`
	- Standardabruf: Vortag (`pubDay`) als `csv.zip`
	- Optional steuerbar via:
		- `OEFFENTLICHEVERGABE_PUB_DAY=YYYY-MM-DD`
		- `OEFFENTLICHEVERGABE_PUB_MONTH=YYYY-MM`
		- `OEFFENTLICHEVERGABE_API_URL` (vollstaendige URL-Override)
- Quelle 2: `TED_API_URL` (+ optional `TED_API_KEY`)
- Lauf:

```bash
npm run ingest
```

Der Lauf schreibt den Snapshot nach `src/data/ingested-tenders.json`.
Die App liest zuerst diesen Snapshot und faellt nur bei leeren/fehlenden Daten auf Seeds zurueck.

## Projektstruktur

- `src/data/seed.ts` Seed-Ausschreibungen und Beispielunternehmen
- `src/lib/matching/score.ts` Match-Engine (gewichtete Kriterien)
- `src/lib/matching/reasons.ts` Begruendungslogik
- `src/app/page.tsx` Dashboard
- `src/app/tenders/[id]/page.tsx` Detailseite
- `src/app/company/page.tsx` Profil-Simulator
- `src/app/api/matches/route.ts` API fuer Match-Ergebnisse
- `supabase/migrations/001_initial.sql` Initiales Datenmodell
