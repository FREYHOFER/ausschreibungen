import { MatchCriterion } from "@/lib/domain/types";

const PERCENT_SCALE = 100;

export function buildReasons(criteria: MatchCriterion[]): string[] {
  return criteria
    .filter((criterion) => criterion.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((criterion) => `${criterion.name}: ${Math.round(criterion.score * PERCENT_SCALE)}% Treffer`);
}

export function buildFallbackReason(criteria: MatchCriterion[]): string {
  const bestCriterion = [...criteria].sort((a, b) => b.score - a.score)[0];

  if (!bestCriterion) {
    return "Keine ausreichenden Signale fuer eine belastbare Einschaetzung.";
  }

  return `Bester Treffer in ${bestCriterion.name}, weitere Kriterien sind ausbaufaehig.`;
}
