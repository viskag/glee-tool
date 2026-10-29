import gleeGlossary from "./glee-glossary.json";

export type DashboardAdvicePayload = {
  study: {
    name: string;
    description: string;
    gameName: string;
  };
  responseCount: number;
  constructs: {
    construct: string;
    average: number | null;
    measurementStatus: "Gemeten" | "Niet gemeten";
    answers: number;
    participants: number;
  }[];
  likertScale: {
    minimum: 1;
    maximum: 7;
  };
  learningGain: {
    pre: number;
    post: number;
    gain: number;
    total: number;
    participants: number;
  } | null;
  backgroundGroups: {
    questionId: string;
    questionText: string;
    scoredQuestionCount: number;
    answers: {
      answer: string;
      participants: number;
      pre: number;
      post: number;
      gain: number;
      preSd: number;
      postSd: number;
    }[];
  }[];
};

export type DashboardAdviceMessage = {
  role: "user" | "assistant";
  content: string;
};

type GlossaryEntry = {
  name: string;
  aliases: string[];
  paperDefinition: string;
  paperReference: string;
  questionnaireMeasurement: string;
};

function isGlossaryEntry(value: unknown): value is GlossaryEntry {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    Array.isArray(value.aliases) &&
    value.aliases.every((alias) => typeof alias === "string") &&
    typeof value.paperDefinition === "string" &&
    typeof value.paperReference === "string" &&
    typeof value.questionnaireMeasurement === "string"
  );
}

function collectGlossaryEntries(value: unknown): GlossaryEntry[] {
  if (isGlossaryEntry(value)) return [value];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  return Object.values(value).flatMap(collectGlossaryEntries);
}

function normalizeGlossaryTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function containsTerm(message: string, term: string): boolean {
  const normalizedMessage = normalizeGlossaryTerm(message);
  const normalizedTerm = normalizeGlossaryTerm(term);
  const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escapedTerm}(?=$|[^a-z0-9])`).test(
    normalizedMessage
  );
}

export function getRelevantGlossaryContext(message: string): string | null {
  const entries = collectGlossaryEntries(gleeGlossary.gleeGlossary);
  const matchedEntries = entries.filter((entry) =>
    [entry.name, ...entry.aliases].some((term) => containsTerm(message, term))
  );

  if (matchedEntries.length === 0) return null;

  return [
    "GLOSSARY REFERENCE (provided by the researcher; not independently verified against the paper):",
    ...matchedEntries.map(
      (entry) =>
        `- ${entry.name}: ${entry.paperDefinition} Source reference: ${entry.paperReference}. Measurement information in glossary: ${entry.questionnaireMeasurement}`
    ),
    "Use these entries as the source for construct definitions and cite the supplied section/page when useful. Measurement information describes what the glossary says about common instruments/examples; it does not prove which instrument or exact items this study used. Do not claim that these exact items were used in this study unless the study's actual questionnaire is available.",
  ].join("\n");
}

export function isBackgroundSummaryRequest(message: string): boolean {
  return (
    /achtergrond|background|leeftijd|age|internet/i.test(message) &&
    /samenvat|overzicht|groepen|groep|vragen|waarom|data|resultat/i.test(message)
  );
}

export function formatBackgroundGroupSummary(
  groups: DashboardAdvicePayload["backgroundGroups"]
): string {
  if (!groups.length) {
    return "Voor deze dashboardgegevens zijn geen achtergrondgroepscores beschikbaar om samen te vatten. Dat betekent niet automatisch dat de achtergrondvragen niet zijn gesteld: er zijn alleen geen bruikbare antwoorden gekoppeld aan gescoorde kennis-tests.";
  }

  const formatScore = (score: number) =>
    score.toLocaleString("nl-NL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  return [
    "Samenvatting van de achtergrondgroepen:",
    ...groups.flatMap((group) => [
      `\n${group.questionText} (scores uit ${group.scoredQuestionCount} kennisvragen):`,
      ...group.answers.map(
        (answer) =>
          `- ${answer.answer}: n=${answer.participants}; pre-test ${formatScore(answer.pre)}, post-test ${formatScore(answer.post)}, leerwinst ${answer.gain > 0 ? "+" : ""}${formatScore(answer.gain)}.`
      ),
    ]),
    "\nDit zijn beschrijvende groepsgemiddelden. Groepen met weinig deelnemers—vooral n=1—zijn geen betrouwbare basis voor conclusies of vergelijkingen. Dat betekent niet dat de achtergrondvraag niet is gemeten; bovenstaande categorieën hebben wel antwoorden.",
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDashboardAdviceMessage(
  value: unknown
): value is DashboardAdviceMessage {
  return (
    isRecord(value) &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    value.content.trim().length > 0 &&
    value.content.length <= (value.role === "user" ? 2000 : 12000)
  );
}

export function isDashboardAdviceMessageHistory(
  value: unknown
): value is DashboardAdviceMessage[] {
  if (!Array.isArray(value) || value.length > 12) return false;
  if (!value.every(isDashboardAdviceMessage)) return false;
  if (value.length === 0) return true;
  if (value[value.length - 1].role !== "user") return false;

  return value.every(
    (message, index) => index === 0 || message.role !== value[index - 1].role
  );
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isDashboardAdvicePayload(
  value: unknown
): value is DashboardAdvicePayload {
  if (!isRecord(value) || !isRecord(value.study)) return false;

  if (
    !isBoundedString(value.study.name, 200) ||
    !isBoundedString(value.study.description, 2000) ||
    !isBoundedString(value.study.gameName, 200) ||
    !isNonNegativeInteger(value.responseCount) ||
    !Array.isArray(value.constructs) ||
    value.constructs.length > 40 ||
    !isRecord(value.likertScale) ||
    value.likertScale.minimum !== 1 ||
    value.likertScale.maximum !== 7 ||
    !Array.isArray(value.backgroundGroups) ||
    value.backgroundGroups.length > 40
  ) {
    return false;
  }

  const validConstructs = value.constructs.every((construct) => {
    if (!isRecord(construct)) return false;
    return (
      isBoundedString(construct.construct, 100) &&
      (construct.measurementStatus === "Gemeten" ||
        construct.measurementStatus === "Niet gemeten") &&
      (construct.average === null ||
        (isFiniteNumber(construct.average) &&
          construct.average >= 1 &&
          construct.average <= 7)) &&
      (construct.average === null) ===
        (construct.measurementStatus === "Niet gemeten") &&
      isNonNegativeInteger(construct.answers) &&
      isNonNegativeInteger(construct.participants)
    );
  });

  if (!validConstructs) return false;

  const validBackgroundGroups = value.backgroundGroups.every((group) => {
    if (
      !isRecord(group) ||
      !isBoundedString(group.questionId, 100) ||
      !isBoundedString(group.questionText, 2000) ||
      !Array.isArray(group.answers) ||
      group.answers.length > 100
    ) {
      return false;
    }

    const scoredQuestionCount = group.scoredQuestionCount;
    if (!isNonNegativeInteger(scoredQuestionCount) || scoredQuestionCount === 0) {
      return false;
    }

    return group.answers.every((answer) => {
      if (
        !isRecord(answer) ||
        !isBoundedString(answer.answer, 500) ||
        !isNonNegativeInteger(answer.participants) ||
        answer.participants === 0
      ) {
        return false;
      }

      return (
        isFiniteNumber(answer.pre) &&
        answer.pre >= 0 &&
        answer.pre <= scoredQuestionCount &&
        isFiniteNumber(answer.post) &&
        answer.post >= 0 &&
        answer.post <= scoredQuestionCount &&
        isFiniteNumber(answer.gain) &&
        answer.gain >= -scoredQuestionCount &&
        answer.gain <= scoredQuestionCount &&
        isFiniteNumber(answer.preSd) &&
        answer.preSd >= 0 &&
        isFiniteNumber(answer.postSd) &&
        answer.postSd >= 0
      );
    });
  });

  if (!validBackgroundGroups) return false;
  if (value.learningGain === null) return true;
  if (!isRecord(value.learningGain)) return false;

  return (
    isFiniteNumber(value.learningGain.pre) &&
    isFiniteNumber(value.learningGain.post) &&
    isFiniteNumber(value.learningGain.gain) &&
    isNonNegativeInteger(value.learningGain.total) &&
    value.learningGain.total > 0 &&
    isNonNegativeInteger(value.learningGain.participants)
  );
}
