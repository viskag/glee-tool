import type { Question, SectionKey } from "./study-model";

export type SectionStep =
  | {
      kind: "section";
      questions: Question[];
      section: SectionKey;
      phase: "background" | "pre-test" | "post-test" | "game-ux";
    }
  | {
      kind: "game";
      id: "GAME_SESSION";
      section: "GAME";
      phase: "game";
    };

export type PreviewItem =
  | {
      kind: "question";
      question: Question;
      section: SectionKey;
      phase: "background" | "pre-test" | "post-test" | "game-ux";
    }
  | {
      kind: "game";
      id: "GAME_SESSION";
      section: "GAME";
      phase: "game";
    };

export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function createPreviewItems(
  questions: Record<SectionKey, Question[]>
): PreviewItem[] {
  const background = questions.BACKGROUND.map((question) => ({
    kind: "question" as const,
    question,
    section: "BACKGROUND" as const,
    phase: "background" as const,
  }));
  const preTest = questions.TEST.map((question) => ({
    kind: "question" as const,
    question,
    section: "TEST" as const,
    phase: "pre-test" as const,
  }));
  const postTest = shuffle(questions.TEST).map((question) => ({
    kind: "question" as const,
    question: { ...question, options: shuffle(question.options) },
    section: "TEST" as const,
    phase: "post-test" as const,
  }));
  const gameUx = questions.GAME_UX.map((question) => ({
    kind: "question" as const,
    question,
    section: "GAME_UX" as const,
    phase: "game-ux" as const,
  }));
  return [
    ...background,
    ...preTest,
    { kind: "game", id: "GAME_SESSION", section: "GAME", phase: "game" },
    ...postTest,
    ...gameUx,
  ];
}
