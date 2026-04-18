import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ScorePill } from "@/components/score-pill";
import { daysUntil, formatDate, formatRange } from "@/lib/domain/format";
import { getCompanies, getTenders } from "@/lib/domain/repository";
import { calculateMatchesForAllTenders } from "@/lib/matching/score";

export default function Home() {
  const tenders = getTenders();
  const companies = getCompanies();
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const matchesByTender = calculateMatchesForAllTenders(tenders, companies);
  const averageTopScore = Math.round(
    tenders.reduce((sum, tender) => {
      const topScore = matchesByTender[tender.id]?.[0]?.fitScore ?? 0;
      return sum + topScore;
    }, 0) / Math.max(1, tenders.length),
  );

  return (
    <div className="app-shell">
      <AppHeader subtitle="Erklärbares Matching für öffentliche Ausschreibungen aus allen Branchen." />

      <section className="panel hero">
        <div>
          <p className="eyebrow">MVP Fokus</p>
          <h2>Relevanz statt Ausschreibungs-Rauschen</h2>
          <p>
            Diese Version priorisiert die Frage: Welche Ausschreibung passt wirklich
            zu welchem Dienstleister – ob IT, Reinigung, Bau oder Logistik – und warum?
          </p>
        </div>

        <div className="kpi-grid" aria-label="MVP Kennzahlen">
          <article className="kpi-card">
            <span>Aktive Ausschreibungen</span>
            <strong>{tenders.length}</strong>
          </article>
          <article className="kpi-card">
            <span>Gematchte Dienstleister</span>
            <strong>{companies.length}</strong>
          </article>
          <article className="kpi-card">
            <span>Durchschnitt Top-Fit</span>
            <strong>{averageTopScore}%</strong>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Offene Ausschreibungen</h2>
          <p className="muted">Top-3 Empfehlungen pro Ausschreibung.</p>
        </div>

        <div className="tender-grid">
          {tenders.map((tender) => {
            const topMatches = matchesByTender[tender.id].slice(0, 3);

            return (
              <article key={tender.id} className="tender-card">
                <header>
                  <p className="eyebrow">{tender.issuer}</p>
                  <h3>
                    <Link href={`/tenders/${tender.id}`}>{tender.title}</Link>
                  </h3>
                </header>

                <p className="muted">{tender.description}</p>

                <div className="meta-row">
                  <span>{tender.region}</span>
                  <span>{formatRange(tender.estimatedValueMin, tender.estimatedValueMax)}</span>
                  <span>Deadline {formatDate(tender.deadlineDate)}</span>
                  <span>{daysUntil(tender.deadlineDate)} Tage verbleibend</span>
                </div>

                <div className="match-list">
                  {topMatches.map((match) => (
                    <div className="match-row" key={match.companyId}>
                      <div>
                        <strong>{companyById.get(match.companyId)?.name ?? "Unbekannt"}</strong>
                        <p>{match.reasons[0]}</p>
                      </div>
                      <ScorePill score={match.fitScore} />
                    </div>
                  ))}
                </div>

                <Link className="inline-link" href={`/tenders/${tender.id}`}>
                  Zur Detailanalyse
                </Link>

                {tender.sourceUrl && (
                  <Link className="inline-link" href={tender.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Zur Originalanzeige ↗
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
