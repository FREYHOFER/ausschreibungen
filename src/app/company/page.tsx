"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ScorePill } from "@/components/score-pill";
import { seedTenders } from "@/data/seed";
import { focusAreaLabels } from "@/lib/domain/catalogs";
import { formatDate, formatRange } from "@/lib/domain/format";
import { CompanyProfile, TenderFocusArea } from "@/lib/domain/types";
import { calculateMatch } from "@/lib/matching/score";

const focusOptions = Object.keys(focusAreaLabels) as TenderFocusArea[];
const regionOptions = [
  "Bundesweit",
  "Berlin",
  "Hamburg",
  "Bayern",
  "Nordrhein-Westfalen",
  "Brandenburg",
  "Sachsen",
];

function parseList(input: string): string[] {
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function toggleArrayValue<T extends string>(values: T[], value: T): T[] {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }

  return [...values, value];
}

export default function CompanyPage() {
  const [companyName, setCompanyName] = useState("Neues IT-Unternehmen");
  const [focusAreas, setFocusAreas] = useState<TenderFocusArea[]>([
    "cloud",
    "software-engineering",
  ]);
  const [serviceRegions, setServiceRegions] = useState<string[]>(["Bundesweit"]);
  const [keywordsInput, setKeywordsInput] = useState(
    "AWS, React, TypeScript, Monitoring, CI/CD",
  );
  const [certificationsInput, setCertificationsInput] = useState(
    "ISO 27001, DSGVO Konzept",
  );
  const [minProjectVolume, setMinProjectVolume] = useState(90000);
  const [maxProjectVolume, setMaxProjectVolume] = useState(420000);

  const simulatedCompany = useMemo<CompanyProfile>(() => {
    const parsedKeywords = parseList(keywordsInput);
    const parsedCertifications = parseList(certificationsInput);

    return {
      id: "simulated-company",
      name: companyName.trim().length > 0 ? companyName.trim() : "Unbenanntes Unternehmen",
      headquarter: "Nicht hinterlegt",
      serviceRegions,
      focusAreas,
      keywords: parsedKeywords,
      certifications: parsedCertifications,
      minProjectVolume,
      maxProjectVolume,
    };
  }, [
    certificationsInput,
    companyName,
    focusAreas,
    keywordsInput,
    maxProjectVolume,
    minProjectVolume,
    serviceRegions,
  ]);

  const rankedMatches = useMemo(() => {
    return seedTenders
      .map((tender) => ({
        tender,
        result: calculateMatch(tender, simulatedCompany),
      }))
      .sort((left, right) => right.result.fitScore - left.result.fitScore);
  }, [simulatedCompany]);

  return (
    <div className="app-shell">
      <AppHeader subtitle="Interaktive Profilerfassung mit sofortigem Fit-Ranking." />

      <section className="panel">
        <div className="section-head">
          <h2>Unternehmensprofil</h2>
          <p className="muted">
            Dieses Formular simuliert das spätere Firmenprofil und berechnet sofort
            passende Ausschreibungen.
          </p>
        </div>

        <div className="form-grid">
          <label className="form-field">
            Unternehmensname
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="z. B. Muster IT GmbH"
            />
          </label>

          <label className="form-field">
            Minimales Projektvolumen (EUR)
            <input
              type="number"
              min={0}
              value={minProjectVolume}
              onChange={(event) => setMinProjectVolume(Number(event.target.value) || 0)}
            />
          </label>

          <label className="form-field">
            Maximales Projektvolumen (EUR)
            <input
              type="number"
              min={0}
              value={maxProjectVolume}
              onChange={(event) => setMaxProjectVolume(Number(event.target.value) || 0)}
            />
          </label>

          <label className="form-field form-field--wide">
            Keywords (Komma-getrennt)
            <textarea
              value={keywordsInput}
              onChange={(event) => setKeywordsInput(event.target.value)}
              rows={3}
            />
          </label>

          <label className="form-field form-field--wide">
            Zertifikate/Nachweise (Komma-getrennt)
            <textarea
              value={certificationsInput}
              onChange={(event) => setCertificationsInput(event.target.value)}
              rows={3}
            />
          </label>

          <fieldset className="form-field form-field--wide">
            <legend>Fokusbereiche</legend>
            <div className="toggle-grid">
              {focusOptions.map((focusArea) => (
                <label key={focusArea} className="toggle-item">
                  <input
                    type="checkbox"
                    checked={focusAreas.includes(focusArea)}
                    onChange={() =>
                      setFocusAreas((prev) => toggleArrayValue(prev, focusArea))
                    }
                  />
                  <span>{focusAreaLabels[focusArea]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="form-field form-field--wide">
            <legend>Leistungsregionen</legend>
            <div className="toggle-grid">
              {regionOptions.map((region) => (
                <label key={region} className="toggle-item">
                  <input
                    type="checkbox"
                    checked={serviceRegions.includes(region)}
                    onChange={() =>
                      setServiceRegions((prev) => toggleArrayValue(prev, region))
                    }
                  />
                  <span>{region}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Live Match-Ergebnisse</h2>
          <p className="muted">Sortiert nach Fit-Score für {simulatedCompany.name}.</p>
        </div>

        <div className="stack">
          {rankedMatches.map(({ tender, result }) => (
            <article key={tender.id} className="sim-match-card">
              <div className="sim-match-head">
                <div>
                  <p className="eyebrow">{tender.issuer}</p>
                  <h3>{tender.title}</h3>
                </div>
                <ScorePill score={result.fitScore} />
              </div>

              <div className="meta-row">
                <span>{tender.region}</span>
                <span>{formatRange(tender.estimatedValueMin, tender.estimatedValueMax)}</span>
                <span>Frist {formatDate(tender.deadlineDate)}</span>
              </div>

              <ul className="chip-list">
                {result.reasons.map((reason) => (
                  <li key={reason} className="chip">
                    {reason}
                  </li>
                ))}
              </ul>

              {result.missingEvidence.length > 0 ? (
                <p className="muted">
                  Fehlende Nachweise: {result.missingEvidence.join(", ")}
                </p>
              ) : (
                <p className="ok-panel">Keine kritischen Nachweislücken erkannt.</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
