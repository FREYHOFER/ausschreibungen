interface ScorePillProps {
  score: number;
}

function pickTone(score: number): "high" | "mid" | "low" {
  if (score >= 75) {
    return "high";
  }

  if (score >= 55) {
    return "mid";
  }

  return "low";
}

export function ScorePill({ score }: ScorePillProps) {
  const tone = pickTone(score);

  return (
    <span className={`score-pill score-pill--${tone}`}>
      Fit {score}%
    </span>
  );
}
