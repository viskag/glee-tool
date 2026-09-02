export type SectionKey = "BACKGROUND" | "TEST" | "GAME_UX";
export type QuestionType = "Multiple choice" | "Likert scale" | "Short answer";

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  objective: string;
  bloom: string;
  correct: string;
  pair: string;
  construct: string;
  options: string[];
};

export type Study = {
  id: string;
  name: string;
  description: string;
  gameName: string;
  gameInstructions: string;
  duration: string;
  welcomeText: string;
  anonymous: boolean;
  consentRequired: boolean;
  postTestRandomized: boolean;
  displayMode: "one-at-a-time" | "section";
};

export type StudySummary = {
  id: string;
  name: string;
  description: string;
  status: "Draft" | "Published";
  updated: string;
  questions: number;
};

export type QuestionnaireExport = {
  format: "glee-questionnaire";
  formatVersion: 1;
  exportedAt: string;
  study: Study;
  questions: Record<SectionKey, Question[]>;
};

export type QuestionnaireRecord = {
  study: Study;
  questions: Record<SectionKey, Question[]>;
  published: boolean;
};

export type ParticipantResponseExport = {
  format: "glee-participant-response";
  formatVersion: 1;
  responseId: string;
  submittedAt: string;
  questionnaire: {
    id: string;
    name: string;
    gameName: string;
    description: string;
    questions: Record<SectionKey, Question[]>;
  };
  answers: {
    BACKGROUND: Record<string, string>;
    PRE_TEST: Record<string, string>;
    POST_TEST: Record<string, string>;
    GAME_UX: Record<string, string>;
  };
  presentation: { displayMode: Study["displayMode"]; postTestRandomized: boolean };
};

export type ConstructMetric = {
  construct: string;
  average: number | null;
  answers: number;
  participants: number;
};

export const dashboardGroups = {
  design: ["Ease of Control", "Progress Feedback", "Audiovisual Appeal", "Challenge", "Goals & Rules"],
  experiential: ["Immersion", "Discovery", "Autonomy", "Relatedness", "Meaning", "Competence", "Narrativity", "Pleasure", "Arousal", "Dominance"],
  subjective: ["Flow", "Game Acceptance", "Perceived Learning"],
};

export const initialStudy: Study = {
  id: "phishing-quest",
  name: "Phishing Quest",
  description: "A serious game evaluation study about recognizing phishing attempts.",
  gameName: "Phishing Quest",
  gameInstructions: "Play the game as you normally would. The post-test will begin when your game session is complete.",
  duration: "15 minutes",
  welcomeText: "Thank you for taking part. This study explores what you learn and how the game feels to play.",
  anonymous: true,
  consentRequired: true,
  postTestRandomized: true,
  displayMode: "one-at-a-time",
};

export const initialStudySummaries: StudySummary[] = [
  { id: "phishing-quest", name: "Phishing Quest", description: "Recognizing phishing attempts", status: "Draft", updated: "Just now", questions: 4 },
];

export const sectionInfo: Record<SectionKey, { label: string; eyebrow: string; detail: string }> = {
  BACKGROUND: { label: "Background", eyebrow: "01", detail: "Participant context" },
  TEST: { label: "Knowledge test", eyebrow: "02", detail: "Used before & after play" },
  GAME_UX: { label: "Game UX", eyebrow: "03", detail: "Experience & GLEE measures" },
};

export const initialQuestions: Record<SectionKey, Question[]> = {
  BACKGROUND: [
    { id: "BG_01", text: "How often do you play digital games?", type: "Multiple choice", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "", options: ["Daily", "A few times a week", "A few times a month", "Rarely"] },
  ],
  TEST: [
    { id: "TEST_Q_01", text: "Which action should you take when you encounter a suspicious email?", type: "Multiple choice", required: true, objective: "Identify phishing attempts", bloom: "Applying", correct: "Report it and avoid opening links", pair: "", construct: "Learning Gain", options: ["Reply to ask who sent it", "Report it and avoid opening links", "Forward it to a friend", "Download the attachment"] },
    { id: "TEST_Q_02", text: "How confident are you in identifying a phishing attempt?", type: "Likert scale", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "Learning Gain", options: ["1 - Completely disagree", "2 - Disagree", "3 - Slightly disagree", "4 - Neutral / neither agree nor disagree", "5 - Slightly agree", "6 - Agree", "7 - Completely agree"] },
  ],
  GAME_UX: [
    { id: "UX_Q_01", text: "I was fully absorbed in the game.", type: "Likert scale", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "Immersion", options: ["1 - Completely disagree", "2 - Disagree", "3 - Slightly disagree", "4 - Neutral / neither agree nor disagree", "5 - Slightly agree", "6 - Agree", "7 - Completely agree"] },
  ],
};

export const constructOptions = ["", "Ease of control", "Goals & rules", "Progress feedback", "Challenge", "Audiovisual appeal", "Competence", "Autonomy", "Discovery", "Immersion", "Meaning", "Narrativity", "Relatedness", "Pleasure", "Arousal", "Dominance", "Flow", "Perceived learning", "Game acceptance"];

export const constructAliases: Record<string, string> = Object.values(dashboardGroups).flat().reduce((aliases, construct) => {
  aliases[construct.toLowerCase().replace(/\s+/g, " ")] = construct;
  return aliases;
}, {} as Record<string, string>);

export function normalizeQuestionnaireConstruct(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return constructOptions.find((option) => option.toLowerCase().replace(/\s+/g, " ") === normalized) ?? "";
}
