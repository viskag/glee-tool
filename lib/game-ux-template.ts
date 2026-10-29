import template from "./game-ux-template.json";
import type { Question } from "./study-model";

export const gameUxConstructs = template.minelabsUxTemplate.constructs;
export const gameUxScaleOptions = template.minelabsUxTemplate.scale;

function questionIdPart(construct: string): string {
  return construct.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function createGameUxQuestions(
  selectedConstructs: readonly string[]
): Question[] {
  const selected = new Set(selectedConstructs);

  return gameUxConstructs
    .filter(({ construct }) => selected.has(construct))
    .flatMap(({ construct, source, questions }) =>
      questions.map((text, index) => ({
        id: `UX_${questionIdPart(construct)}_${String(index + 1).padStart(2, "0")}`,
        text,
        type: "Likert scale" as const,
        required: true,
        objective: "",
        bloom: "",
        correct: "",
        label: "",
        construct,
        source,
        options: [...gameUxScaleOptions],
      }))
    );
}
