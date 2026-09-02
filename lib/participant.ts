import type { ParticipantResponseExport, Question, SectionKey, Study } from "./study-model";

export function buildParticipantResponse(study: Study, questions: Record<SectionKey, Question[]>, answers: Record<string, string>): ParticipantResponseExport {
  const responseAnswers: ParticipantResponseExport["answers"] = { BACKGROUND: {}, PRE_TEST: {}, POST_TEST: {}, GAME_UX: {} };
  Object.entries(answers).forEach(([key, value]) => {
    const separator = key.indexOf(":");
    const phase = key.slice(0, separator);
    const questionId = key.slice(separator + 1);
    if (phase === "background") responseAnswers.BACKGROUND[questionId] = value;
    if (phase === "pre-test") responseAnswers.PRE_TEST[questionId] = value;
    if (phase === "post-test") responseAnswers.POST_TEST[questionId] = value;
    if (phase === "game-ux") responseAnswers.GAME_UX[questionId] = value;
  });
  return { format: "glee-participant-response", formatVersion: 1, responseId: `response-${Date.now()}`, submittedAt: new Date().toISOString(), questionnaire: { id: study.id, name: study.name, gameName: study.gameName, description: study.description, questions }, answers: responseAnswers, presentation: { displayMode: study.displayMode, postTestRandomized: study.postTestRandomized } };
}
