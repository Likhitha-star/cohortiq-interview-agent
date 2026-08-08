import { getCandidateById } from "@/lib/data/candidates";
import { getCurriculumDay } from "@/lib/data/curriculum";

import type {
  Candidate,
  CandidateMission,
  CandidateMissionAttempted,
  CurriculumDay,
} from "@/lib/types";

/** Minimum number of questions before an interview can complete. */
export const MIN_INTERVIEW_QUESTIONS = 8;

/** Minimum distinct curriculum days that must be covered. */
export const MIN_CURRICULUM_DAYS = 4;

/** Structured feedback returned when the interview completes. */
export interface InterviewFeedback {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

export type QuestionKind = "primary" | "follow_up";

/** A single interview question tied to a curriculum day. */
export interface InterviewQuestion {
  id: string;
  text: string;
  day: number;
  dayTitle: string;
  kind: QuestionKind;
  parentQuestionId?: string;
}

/** A recorded candidate answer paired with its question. */
export interface InterviewAnswer {
  questionId: string;
  questionText: string;
  answer: string;
  day: number;
}

/** Internal topic plan entry used for day selection. */
export interface ScoredTopic {
  day: number;
  score: number;
  mission: CandidateMission;
  curriculumDay: CurriculumDay;
}

/** Full interview state managed by the engine. */
export interface InterviewState {
  sessionId: string;
  candidateId: string;
  candidate: Candidate;
  /** Questions asked so far (each turn with a question increments this). */
  questionCount: number;
  /** Distinct curriculum days that have been asked about. */
  daysCovered: number[];
  /** Exact question texts already used — prevents duplicates. */
  askedQuestionTexts: string[];
  /** All candidate answers in chronological order. */
  answers: InterviewAnswer[];
  /** The question currently awaiting an answer, or null when complete. */
  currentQuestion: InterviewQuestion | null;
  /** Whether the interview has finished. */
  completed: boolean;
  /** Populated only when `completed` is true. */
  feedback: InterviewFeedback | null;
  /** Ordered list of curriculum days to prioritize during the interview. */
  topicPlan: number[];
  /** Index into `topicPlan` for the next primary question day. */
  topicPlanIndex: number;
  /** Whether the next question should be a follow-up on the current day. */
  pendingFollowUpDay: number | null;
  /** Objectives/tools already referenced when questioning each day. */
  coveredPromptsByDay: Record<number, string[]>;
}

export interface InterviewTurnResult {
  reply: string;
  done: boolean;
  feedback?: InterviewFeedback;
  state: InterviewState;
}

function isMissionAttempted(
  mission: CandidateMission,
): mission is CandidateMissionAttempted {
  return "passed" in mission;
}

function isMissionSkipped(mission: CandidateMission): boolean {
  return "skipped" in mission && mission.skipped === true;
}

/** Score a mission for topic selection — higher means more useful to interview. */
function scoreMission(mission: CandidateMission, candidate: Candidate): number {
  const curriculumDay = getCurriculumDay(mission.day);
  if (!curriculumDay) {
    return 0;
  }

  let score = 40;

  if (isMissionSkipped(mission)) {
    score = 95;
  } else if (isMissionAttempted(mission)) {
    if (!mission.passed) {
      score = 110;
    } else if (mission.attempts >= 4) {
      score = 85;
    } else if (mission.attempts >= 2) {
      score = 75;
    } else {
      score = 60;
    }
  }

  const completionRate =
    candidate.signals.missionsCompleted > 0
      ? candidate.signals.missionsFirstTry / candidate.signals.missionsCompleted
      : 0;

  if (
    completionRate < 0.5 &&
    isMissionAttempted(mission) &&
    mission.attempts > 1
  ) {
    score += 8;
  }

  if (
    candidate.signals.commitDays < 20 &&
    isMissionAttempted(mission) &&
    mission.attempts >= 3
  ) {
    score += 5;
  }

  return score;
}

/** Rank candidate missions into a deterministic topic plan. */
export function buildTopicPlan(candidate: Candidate): ScoredTopic[] {
  const scored: ScoredTopic[] = [];

  for (const mission of candidate.missions) {
    const curriculumDay = getCurriculumDay(mission.day);
    if (!curriculumDay) {
      continue;
    }

    scored.push({
      day: mission.day,
      score: scoreMission(mission, candidate),
      mission,
      curriculumDay,
    });
  }

  return scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.day - b.day;
  });
}

/** Select at least `MIN_CURRICULUM_DAYS` distinct days from the topic plan. */
export function selectTopicDays(scoredTopics: ScoredTopic[]): number[] {
  const days: number[] = [];

  for (const topic of scoredTopics) {
    if (!days.includes(topic.day)) {
      days.push(topic.day);
    }
    if (days.length >= MIN_CURRICULUM_DAYS) {
      break;
    }
  }

  return days;
}

function promptKey(day: number, kind: string, index: number): string {
  return `${day}:${kind}:${index}`;
}

function isPromptUsed(
  coveredPromptsByDay: Record<number, string[]>,
  day: number,
  key: string,
): boolean {
  return (coveredPromptsByDay[day] ?? []).includes(key);
}

function markPromptUsed(
  coveredPromptsByDay: Record<number, string[]>,
  day: number,
  key: string,
): Record<number, string[]> {
  const existing = coveredPromptsByDay[day] ?? [];
  if (existing.includes(key)) {
    return coveredPromptsByDay;
  }
  return {
    ...coveredPromptsByDay,
    [day]: [...existing, key],
  };
}

/** Build candidate question templates from curriculum objectives and tools. */
function buildQuestionCandidates(
  day: CurriculumDay,
  coveredPromptsByDay: Record<number, string[]>,
): Array<{ text: string; key: string }> {
  const candidates: Array<{ text: string; key: string }> = [];

  day.objectives.forEach((objective, index) => {
    const key = promptKey(day.day, "objective", index);
    if (!isPromptUsed(coveredPromptsByDay, day.day, key)) {
      candidates.push({
        key,
        text: `Day ${day.day} — ${day.title}: ${objective} How did you approach this during the cohort project?`,
      });
    }
  });

  day.tools.forEach((tool, index) => {
    const key = promptKey(day.day, "tool", index);
    if (!isPromptUsed(coveredPromptsByDay, day.day, key)) {
      candidates.push({
        key,
        text: `On Day ${day.day} (${day.title}), you worked with ${tool}. What role did it play in your solution, and what challenges did you encounter?`,
      });
    }
  });

  return candidates;
}

function createQuestion(
  day: CurriculumDay,
  text: string,
  kind: QuestionKind,
  promptKeyValue: string,
  parentQuestionId?: string,
): InterviewQuestion {
  return {
    id: `${day.day}-${promptKeyValue}-${kind}`,
    text,
    day: day.day,
    dayTitle: day.title,
    kind,
    parentQuestionId,
  };
}

/** Pick the next unused primary question for a curriculum day. */
export function buildPrimaryQuestion(
  day: CurriculumDay,
  askedQuestionTexts: string[],
  coveredPromptsByDay: Record<number, string[]>,
): { question: InterviewQuestion; promptKey: string } | null {
  const candidates = buildQuestionCandidates(day, coveredPromptsByDay);

  for (const candidate of candidates) {
    if (!askedQuestionTexts.includes(candidate.text)) {
      return {
        question: createQuestion(
          day,
          candidate.text,
          "primary",
          candidate.key,
        ),
        promptKey: candidate.key,
      };
    }
  }

  return null;
}

/** Generate a deterministic follow-up based on the previous answer. */
export function buildFollowUpQuestion(
  day: CurriculumDay,
  previousAnswer: string,
  previousQuestion: InterviewQuestion,
  askedQuestionTexts: string[],
  coveredPromptsByDay: Record<number, string[]>,
): { question: InterviewQuestion; promptKey: string } | null {
  const answerLower = previousAnswer.toLowerCase().trim();
  const followUpCandidates: Array<{ text: string; key: string }> = [];

  const unmentionedTools = day.tools.filter(
    (tool) => !answerLower.includes(tool.toLowerCase()),
  );

  if (unmentionedTools.length > 0) {
    const tool = unmentionedTools[0];
    const key = promptKey(day.day, "followup-tool", day.tools.indexOf(tool));
    followUpCandidates.push({
      key,
      text: `Following up on ${day.title}: you did not mention ${tool}. How did you use ${tool} in your implementation, and what would you improve?`,
    });
  }

  const unmentionedObjectives = day.objectives.filter((objective) => {
    const snippet = objective.slice(0, 24).toLowerCase();
    return !answerLower.includes(snippet);
  });

  if (unmentionedObjectives.length > 0) {
    const objective = unmentionedObjectives[0];
    const index = day.objectives.indexOf(objective);
    const key = promptKey(day.day, "followup-objective", index);
    followUpCandidates.push({
      key,
      text: `Digging deeper into Day ${day.day}: ${objective} Can you walk me through how you implemented this?`,
    });
  }

  if (answerLower.length < 80) {
    const key = promptKey(day.day, "followup-detail", 0);
    followUpCandidates.push({
      key,
      text: `Could you expand on your experience with ${day.title}? Include specific tools, decisions, and outcomes from your project work.`,
    });
  }

  const remainingPrimary = buildQuestionCandidates(day, coveredPromptsByDay);
  for (const candidate of remainingPrimary) {
    followUpCandidates.push(candidate);
  }

  for (const candidate of followUpCandidates) {
    if (!askedQuestionTexts.includes(candidate.text)) {
      return {
        question: createQuestion(
          day,
          candidate.text,
          "follow_up",
          candidate.key,
          previousQuestion.id,
        ),
        promptKey: candidate.key,
      };
    }
  }

  return null;
}

function uniqueDays(days: number[]): number[] {
  return [...new Set(days)].sort((a, b) => a - b);
}

function requirementsMet(state: InterviewState): boolean {
  const answeredDays = uniqueDays(state.answers.map((entry) => entry.day));
  return (
    state.answers.length >= MIN_INTERVIEW_QUESTIONS &&
    answeredDays.length >= MIN_CURRICULUM_DAYS
  );
}

function dayNeedsCoverage(state: InterviewState): number | null {
  const covered = new Set(state.daysCovered);
  for (const day of state.topicPlan) {
    if (!covered.has(day)) {
      return day;
    }
  }
  return null;
}

function nextPrimaryDay(state: InterviewState): number {
  const uncovered = dayNeedsCoverage(state);
  if (uncovered !== null) {
    return uncovered;
  }

  if (state.topicPlan.length === 0) {
    throw new Error("Interview topic plan is empty.");
  }

  const day =
    state.topicPlan[state.topicPlanIndex % state.topicPlan.length] ??
    state.topicPlan[0];
  return day;
}

function recordQuestion(
  state: InterviewState,
  question: InterviewQuestion,
  promptKeyValue: string,
): InterviewState {
  const daysCovered = state.daysCovered.includes(question.day)
    ? state.daysCovered
    : [...state.daysCovered, question.day];

  return {
    ...state,
    questionCount: state.questionCount + 1,
    daysCovered,
    askedQuestionTexts: [...state.askedQuestionTexts, question.text],
    currentQuestion: question,
    coveredPromptsByDay: markPromptUsed(
      state.coveredPromptsByDay,
      question.day,
      promptKeyValue,
    ),
    pendingFollowUpDay: null,
  };
}

function pickNextQuestion(state: InterviewState): {
  question: InterviewQuestion;
  promptKey: string;
} | null {
  if (state.pendingFollowUpDay !== null) {
    const day = getCurriculumDay(state.pendingFollowUpDay);
    const lastAnswer = state.answers[state.answers.length - 1];
    const previousQuestion = state.currentQuestion;

    if (day && lastAnswer && previousQuestion) {
      const followUp = buildFollowUpQuestion(
        day,
        lastAnswer.answer,
        previousQuestion,
        state.askedQuestionTexts,
        state.coveredPromptsByDay,
      );
      if (followUp) {
        return followUp;
      }
    }
  }

  const primaryDayNumber = nextPrimaryDay(state);
  const primaryDay = getCurriculumDay(primaryDayNumber);
  if (!primaryDay) {
    return null;
  }

  const primary = buildPrimaryQuestion(
    primaryDay,
    state.askedQuestionTexts,
    state.coveredPromptsByDay,
  );

  if (primary) {
    return primary;
  }

  for (const dayNumber of state.topicPlan) {
    const day = getCurriculumDay(dayNumber);
    if (!day) {
      continue;
    }
    const fallback = buildPrimaryQuestion(
      day,
      state.askedQuestionTexts,
      state.coveredPromptsByDay,
    );
    if (fallback) {
      return fallback;
    }
  }

  return null;
}

function shouldOfferFollowUp(state: InterviewState, answer: string): boolean {
  if (!state.currentQuestion) {
    return false;
  }

  if (state.currentQuestion.kind === "follow_up") {
    return false;
  }

  const distinctDays = uniqueDays(state.daysCovered).length;
  const questionsRemaining = MIN_INTERVIEW_QUESTIONS - state.answers.length;
  const daysStillNeeded = MIN_CURRICULUM_DAYS - distinctDays;

  if (daysStillNeeded > 0 && questionsRemaining <= daysStillNeeded) {
    return false;
  }

  if (
    state.answers.length >= MIN_INTERVIEW_QUESTIONS &&
    distinctDays >= MIN_CURRICULUM_DAYS
  ) {
    return false;
  }

  const day = getCurriculumDay(state.currentQuestion.day);
  if (!day) {
    return false;
  }

  const followUp = buildFollowUpQuestion(
    day,
    answer,
    state.currentQuestion,
    [...state.askedQuestionTexts, "__probe__"],
    state.coveredPromptsByDay,
  );

  return followUp !== null;
}

function advanceTopicPlanIndex(state: InterviewState): number {
  if (state.topicPlan.length === 0) {
    return 0;
  }
  return (state.topicPlanIndex + 1) % state.topicPlan.length;
}

/** Produce deterministic feedback from interview performance and candidate data. */
export function generateFeedback(state: InterviewState): InterviewFeedback {
  const { candidate, answers, daysCovered } = state;
  const strengths: string[] = [];
  const gaps: string[] = [];
  const nextSteps: string[] = [];

  for (const mission of candidate.missions) {
    if (isMissionAttempted(mission) && mission.passed && mission.attempts === 1) {
      strengths.push(
        `Demonstrated first-try mastery on Day ${mission.day}: ${mission.title}.`,
      );
    }

    if (isMissionSkipped(mission)) {
      gaps.push(`Skipped Day ${mission.day}: ${mission.title}.`);
      const day = getCurriculumDay(mission.day);
      if (day && day.objectives[0]) {
        nextSteps.push(
          `Complete Day ${mission.day} and practice: ${day.objectives[0]}`,
        );
      }
    }

    if (isMissionAttempted(mission) && !mission.passed) {
      gaps.push(`Did not pass Day ${mission.day}: ${mission.title}.`);
      nextSteps.push(
        `Revisit Day ${mission.day} mission requirements and retry the project.`,
      );
    }

    if (isMissionAttempted(mission) && mission.passed && mission.attempts >= 4) {
      gaps.push(
        `Needed multiple attempts (${mission.attempts}) on Day ${mission.day}: ${mission.title}.`,
      );
      nextSteps.push(
        `Strengthen fundamentals from Day ${mission.day} through additional hands-on practice.`,
      );
    }
  }

  const detailedAnswers = answers.filter((entry) => entry.answer.trim().length >= 100);
  if (detailedAnswers.length >= Math.min(4, answers.length)) {
    strengths.push(
      "Provided detailed, substantive answers during the technical interview.",
    );
  }

  const shortAnswers = answers.filter((entry) => entry.answer.trim().length < 50);
  if (shortAnswers.length >= 3) {
    gaps.push("Several interview answers lacked sufficient technical depth.");
    nextSteps.push(
      "Practice explaining project decisions with concrete examples, tools used, and trade-offs.",
    );
  }

  const interviewedDays = uniqueDays(daysCovered);
  const summary = `Interview with ${candidate.member.name} (${candidate.member.jobRole}) covered ${interviewedDays.length} curriculum days across ${answers.length} questions. Overall cohort progress: ${candidate.signals.missionsCompleted} missions completed with ${candidate.signals.missionsFirstTry} first-try passes.`;

  return {
    summary,
    strengths: strengths.slice(0, 5),
    gaps: gaps.slice(0, 5),
    next: nextSteps.slice(0, 5),
  };
}

function completeInterview(state: InterviewState): InterviewState {
  const feedback = generateFeedback(state);
  return {
    ...state,
    currentQuestion: null,
    completed: true,
    feedback,
    pendingFollowUpDay: null,
  };
}

function formatQuestionReply(question: InterviewQuestion): string {
  return question.text;
}

function formatWelcome(candidate: Candidate, question: InterviewQuestion): string {
  return `Welcome, ${candidate.member.name}. Let's begin your AI cohort interview.\n\n${formatQuestionReply(question)}`;
}

function formatCompletionReply(): string {
  return "Interview completed. Thank you for your thoughtful responses.";
}

/** Create initial interview state for a candidate without asking a question yet. */
export function createInterviewState(
  sessionId: string,
  candidateId: string,
): InterviewState {
  const candidate = getCandidateById(candidateId);
  if (!candidate) {
    throw new Error(`Candidate not found: ${candidateId}`);
  }

  const scoredTopics = buildTopicPlan(candidate);
  const topicPlan = selectTopicDays(scoredTopics);

  if (topicPlan.length < MIN_CURRICULUM_DAYS) {
    throw new Error(
      `Unable to plan ${MIN_CURRICULUM_DAYS} curriculum days for candidate ${candidateId}.`,
    );
  }

  return {
    sessionId,
    candidateId,
    candidate,
    questionCount: 0,
    daysCovered: [],
    askedQuestionTexts: [],
    answers: [],
    currentQuestion: null,
    completed: false,
    feedback: null,
    topicPlan,
    topicPlanIndex: 0,
    pendingFollowUpDay: null,
    coveredPromptsByDay: {},
  };
}

/**
 * Start a new interview session for the given candidate.
 * Returns the welcome message and first question.
 */
export function startInterview(
  sessionId: string,
  candidateId: string,
): InterviewTurnResult {
  let state = createInterviewState(sessionId, candidateId);

  const next = pickNextQuestion(state);
  if (!next) {
    throw new Error("Unable to generate the first interview question.");
  }

  state = recordQuestion(state, next.question, next.promptKey);
  state = {
    ...state,
    topicPlanIndex: advanceTopicPlanIndex(state),
  };

  return {
    reply: formatWelcome(state.candidate, next.question),
    done: false,
    state,
  };
}

/**
 * Process a candidate answer and advance the interview.
 * When complete, returns structured feedback.
 */
export function submitAnswer(
  state: InterviewState,
  answer: string,
): InterviewTurnResult {
  if (state.completed) {
    return {
      reply: formatCompletionReply(),
      done: true,
      feedback: state.feedback ?? undefined,
      state,
    };
  }

  if (!state.currentQuestion) {
    throw new Error("No current question to answer.");
  }

  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) {
    return {
      reply: "Please provide an answer before we continue.",
      done: false,
      state,
    };
  }

  let nextState: InterviewState = {
    ...state,
    answers: [
      ...state.answers,
      {
        questionId: state.currentQuestion.id,
        questionText: state.currentQuestion.text,
        answer: trimmedAnswer,
        day: state.currentQuestion.day,
      },
    ],
  };

  const offerFollowUp = shouldOfferFollowUp(nextState, trimmedAnswer);

  if (offerFollowUp) {
    nextState = {
      ...nextState,
      pendingFollowUpDay: nextState.currentQuestion!.day,
    };
  } else {
    nextState = {
      ...nextState,
      topicPlanIndex: advanceTopicPlanIndex(nextState),
      pendingFollowUpDay: null,
    };
  }

  if (requirementsMet(nextState) && !offerFollowUp) {
    nextState = completeInterview(nextState);
    return {
      reply: formatCompletionReply(),
      done: true,
      feedback: nextState.feedback ?? undefined,
      state: nextState,
    };
  }

  const next = pickNextQuestion(nextState);
  if (!next) {
    if (requirementsMet(nextState)) {
      nextState = completeInterview(nextState);
      return {
        reply: formatCompletionReply(),
        done: true,
        feedback: nextState.feedback ?? undefined,
        state: nextState,
      };
    }

    throw new Error("Unable to generate the next interview question.");
  }

  nextState = recordQuestion(nextState, next.question, next.promptKey);

  if (next.question.kind === "primary") {
    nextState = {
      ...nextState,
      topicPlanIndex: advanceTopicPlanIndex(nextState),
    };
  }

  return {
    reply: formatQuestionReply(next.question),
    done: false,
    state: nextState,
  };
}

/** Convenience helper to run a full deterministic interview loop (for tests). */
export function runInterviewToCompletion(
  sessionId: string,
  candidateId: string,
  answers: string[],
): InterviewTurnResult {
  let result = startInterview(sessionId, candidateId);

  for (const answer of answers) {
    if (result.done) {
      break;
    }
    result = submitAnswer(result.state, answer);
  }

  return result;
}
