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
  const selectedTender = getTenderById(id);

  if (!selectedTender) {
    notFound();
    return null;
  }

  const tender = selectedTender;

  const companies = getCompanies();
  const company = companies[0];
  const match = company ? calculateMatchesForTender(tender, [company])[0] : undefined;

  return (
    <div className="app-shell">
      <AppHeader subtitle="Detailansicht mit transparenter Score-Begründung für dein Profil." />

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
          <h2>Fit-Analyse für dein Unternehmen</h2>
          <p className="muted">
            Gründe, fehlende Nachweise und Kriterienwerte für dein Profil im Überblick.
          </p>
        </div>

        {match ? (
          <div className="stack">
            <article key={match.companyId} className="stack-item">
              <MatchCard
                companyName={company?.name ?? "Dein Unternehmen"}
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
          </div>
        ) : (
          <p className="muted">Kein Unternehmensprofil hinterlegt.</p>
        )}
      </section>
    </div>
  );
}
