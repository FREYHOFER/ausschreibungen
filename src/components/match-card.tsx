import { MatchResult } from "@/lib/domain/types";
import { ScorePill } from "@/components/score-pill";

interface MatchCardProps {
  companyName: string;
  result: MatchResult;
}

export function MatchCard({ companyName, result }: MatchCardProps) {
  return (
    <article className="match-card">
      <div className="match-card__header">
        <h3>{companyName}</h3>
        <ScorePill score={result.fitScore} />
      </div>

      <ul className="chip-list" aria-label="Match Begruendungen">
        {result.reasons.map((reason) => (
          <li key={reason} className="chip">
            {reason}
          </li>
        ))}
      </ul>

      {result.missingEvidence.length > 0 ? (
        <div className="missing-panel">
          <strong>Fehlende Nachweise:</strong>
          <p>{result.missingEvidence.join(", ")}</p>
        </div>
      ) : (
        <div className="ok-panel">Alle Pflichtnachweise laut Profil vorhanden.</div>
      )}
    </article>
  );
}
