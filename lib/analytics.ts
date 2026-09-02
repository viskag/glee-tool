import type { ConstructMetric, ParticipantResponseExport, Question } from "./study-model";
import { constructAliases, dashboardGroups } from "./study-model";

function parseLikertValue(answer: string) {
  const match = answer.trim().match(/^[1-7]/);
  return match ? Number(match[0]) : null;
}

export function calculateConstructMetrics(responses: ParticipantResponseExport[]): ConstructMetric[] {
  const buckets = new Map<string, { total: number; answers: number; participants: Set<string> }>();
  responses.forEach((response) => {
    Object.entries(response.questionnaire.questions).forEach(([section, questions]) => {
      questions.forEach((question) => {
        if (question.type !== "Likert scale" || !question.construct || section === "TEST") return;
        const normalizedConstruct = constructAliases[question.construct.trim().toLowerCase().replace(/\s+/g, " ")];
        if (!normalizedConstruct) return;
        const answer = response.answers[section as keyof ParticipantResponseExport["answers"]][question.id];
        const value = answer ? parseLikertValue(answer) : null;
        if (value === null) return;
        const bucket = buckets.get(normalizedConstruct) ?? { total: 0, answers: 0, participants: new Set<string>() };
        bucket.total += value;
        bucket.answers += 1;
        bucket.participants.add(response.responseId);
        buckets.set(normalizedConstruct, bucket);
      });
    });
  });
  const allConstructs = [...dashboardGroups.design, ...dashboardGroups.experiential, ...dashboardGroups.subjective];
  return allConstructs.map((construct) => {
    const bucket = buckets.get(construct);
    return { construct, average: bucket ? bucket.total / bucket.answers : null, answers: bucket?.answers ?? 0, participants: bucket?.participants.size ?? 0 };
  });
}

export function calculateLearningGain(responses: ParticipantResponseExport[]) {
  let preScoreTotal = 0;
  let postScoreTotal = 0;
  let scoredParticipants = 0;
  let questionCount = 0;
  function isCorrect(answer: string | undefined, question: Question) {
    if (!answer || !question.correct) return false;
    if (answer === question.correct) return true;
    const correctIndex = /^[A-G]$/i.test(question.correct) ? question.correct.toUpperCase().charCodeAt(0) - 65 : -1;
    return correctIndex >= 0 && question.options[correctIndex] === answer;
  }

  responses.forEach((response) => {
    const scoredQuestions = response.questionnaire.questions.TEST.filter((question) => question.correct);
    if (!scoredQuestions.length) return;
    questionCount = Math.max(questionCount, scoredQuestions.length);
    preScoreTotal += scoredQuestions.filter((question) => isCorrect(response.answers.PRE_TEST[question.id], question)).length;
    postScoreTotal += scoredQuestions.filter((question) => isCorrect(response.answers.POST_TEST[question.id], question)).length;
    scoredParticipants += 1;
  });
  if (!scoredParticipants || !questionCount) return null;
  return { pre: preScoreTotal / scoredParticipants, post: postScoreTotal / scoredParticipants, gain: (postScoreTotal - preScoreTotal) / scoredParticipants, total: questionCount };
}

export type BackgroundGainGroup = {
  question: string;
  answer: string;
  participants: number;
  pre: number;
  post: number;
  gain: number;
  preSd: number;
  postSd: number;
};

export function calculateBackgroundLearningGain(responses: ParticipantResponseExport[]): BackgroundGainGroup[] {
  const groups = new Map<string, { question: string; answer: string; pre: number[]; post: number[] }>();
  responses.forEach((response) => {
    const testQuestions = response.questionnaire.questions.TEST.filter((question) => question.correct);
    const scored = (phase: "PRE_TEST" | "POST_TEST") => testQuestions.filter((question) => {
      const answer = response.answers[phase][question.id];
      if (answer === question.correct) return true;
      const index = /^[A-G]$/i.test(question.correct) ? question.correct.toUpperCase().charCodeAt(0) - 65 : -1;
      return index >= 0 && question.options[index] === answer;
    }).length;
    if (!testQuestions.length) return;
    const pre = scored("PRE_TEST");
    const post = scored("POST_TEST");
    response.questionnaire.questions.BACKGROUND.forEach((question) => {
      const answer = response.answers.BACKGROUND[question.id];
      if (!answer) return;
      const key = `${question.id}:${answer}`;
      const group = groups.get(key) ?? { question: question.text, answer, pre: [], post: [] };
      group.pre.push(pre);
      group.post.push(post);
      groups.set(key, group);
    });
  });
  const standardDeviation = (values: number[]) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
  };
  return Array.from(groups.values()).map((group) => {
    const pre = group.pre.reduce((sum, value) => sum + value, 0) / group.pre.length;
    const post = group.post.reduce((sum, value) => sum + value, 0) / group.post.length;
    return { question: group.question, answer: group.answer, participants: group.pre.length, pre, post, gain: post - pre, preSd: standardDeviation(group.pre), postSd: standardDeviation(group.post) };
  });
}
