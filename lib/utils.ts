// Minimal utility until shadcn/ui is initialized
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/** CSS var color for a 0–100 competency score, matching the rubric score bands. */
export function verdictColor(score: number): string {
  if (score >= 90) return "var(--verdict-exceptional)";
  if (score >= 70) return "var(--verdict-pass)";
  if (score >= 60) return "var(--verdict-border)";
  return "var(--verdict-fail)";
}

/** Tailwind text-class variant of verdictColor (for the score-band label). */
export function verdictClass(score: number): string {
  if (score >= 90) return "verdict-exceptional";
  if (score >= 80) return "verdict-pass";
  if (score >= 70) return "verdict-pass";
  if (score >= 60) return "verdict-border";
  return "verdict-fail";
}
