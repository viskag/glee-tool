export const constructIcons: Record<string, string> = {
  "Ease of Control": "/constructicons/Ease of Control.png",
  "Goals & Rules": "/constructicons/Goals and Rules.png",
  "Progress Feedback": "/constructicons/Progress Feedback.png",
  "Challenge": "/constructicons/Challenge.png",
  "Audiovisual Appeal": "/constructicons/Audiovisual Appeal.png",
  "Competence": "/constructicons/Competence.png",
  "Autonomy": "/constructicons/Autonomy.png",
  "Discovery": "/constructicons/Discovery.png",
  "Immersion": "/constructicons/Immersion.png",
  "Meaning": "/constructicons/Meaning.png",
  "Narrativity": "/constructicons/Narrativity.png",
  "Relatedness": "/constructicons/Relatedness.png",
  "Pleasure": "/constructicons/Pleasure.png",
  "Arousal": "/constructicons/Arousal.png",
  "Dominance": "/constructicons/Dominance.png",
  "Flow": "/constructicons/Flow.png",
  "Perceived Learning": "/constructicons/Perceived Learning.png",
  "Game Acceptance": "/constructicons/Game Acceptance.png",
  "Learning Gain": "/constructicons/Learning Gain.png",
};

export function getConstructIcon(construct: string): string | null {
  return constructIcons[construct] ?? null;
}
