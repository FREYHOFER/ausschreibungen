import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { MatchCard } from "@/components/match-card";
import { formatDate, formatRange } from "@/lib/domain/format";
import {
  getCompanies,
  getTenderById,
} from "@/lib/domain/repository";
import { calculateMatchesForTender } from "@/lib/matching/score";

interface TenderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenderDetailPage({
  params,
}: TenderDetailPageProps) {
  const { id } = await params;
  const tender = getTenderById(id);

  if (!tender) {
    notFound();
  }

  const companies = getCompanies();
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const matches = calculateMatchesForTender(tender, companies);

  return (
    <div className="app-shell">
      <AppHeader subtitle="Detailansicht mit transparenter Score-Begründung pro Anbieter." />

      <section className="panel">
        <p className="eyebrow">Ausschreibung im Fokus</p>
        <h2>{tender.title}</h2>
        <p className="muted">{tender.description}</p>

        <div className="meta-row">
          <span>Vergabestelle {tender.issuer}</span>
          <span>Region {tender.region}</span>
          <span>Verfahren {tender.procedureType}</span>
          <span>Frist {formatDate(tender.deadlineDate)}</span>
          <span>Volumen {formatRange(tender.estimatedValueMin, tender.estimatedValueMax)}</span>
        </div>

        {tender.sourceUrl && (
          <Link className="inline-link" href={tender.sourceUrl} target="_blank" rel="noopener noreferrer">
            Zur Originalanzeige ↗
          </Link>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Match-Ranking</h2>
          <p className="muted">
            Je Treffer werden Gründe, fehlende Nachweise und Kriterienwerte offengelegt.
          </p>
        </div>

        <div className="stack">
          {matches.map((match) => (
            <article key={match.companyId} className="stack-item">
              <MatchCard
                companyName={companyById.get(match.companyId)?.name ?? "Unbekannt"}
                result={match}
              />

              <div className="criteria-grid" aria-label="Kriterienaufschlüsselung">
                {match.criteria.map((criterion) => (
                  <div key={criterion.name} className="criterion-card">
                    <header>
                      <h4>{criterion.name}</h4>
                      <strong>{Math.round(criterion.score * 100)}%</strong>
                    </header>
                    <p>{criterion.explanation}</p>
                    <small>Gewichtung {criterion.weight}%</small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
