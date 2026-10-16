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
    answers: number;
    participants: number;
  }[];
  learningGain: {
    pre: number;
    post: number;
    gain: number;
    total: number;
    participants: number;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    value.constructs.length > 40
  ) {
    return false;
  }

  const validConstructs = value.constructs.every((construct) => {
    if (!isRecord(construct)) return false;
    return (
      isBoundedString(construct.construct, 100) &&
      (construct.average === null ||
        (isFiniteNumber(construct.average) &&
          construct.average >= 0 &&
          construct.average <= 7)) &&
      isNonNegativeInteger(construct.answers) &&
      isNonNegativeInteger(construct.participants)
    );
  });

  if (!validConstructs) return false;
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
