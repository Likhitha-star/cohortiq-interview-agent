import { NextRequest, NextResponse } from "next/server";

import { generateAIFeedback } from "@/lib/ai/claude";
import { getCandidateById } from "@/lib/data/candidates";
import {
  startInterview,
  submitAnswer,
  type InterviewFeedback,
  type InterviewState,
  type InterviewTurnResult,
} from "@/lib/interview/engine";
import type { Candidate } from "@/lib/types";

/**
 * In-memory session store — lives for the duration of the running server process.
 */
const sessions = new Map<string, InterviewState>();

/**
 * Response shape defined in data/technical-spec.md
 */
interface InterviewResponse {
  reply: string;
  done: boolean;
  feedback?: InterviewFeedback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCandidate(value: unknown): value is Candidate {
  if (!isRecord(value)) {
    return false;
  }

  const member = value.member;

  if (!isRecord(member) || typeof member.id !== "string") {
    return false;
  }

  return Array.isArray(value.missions) && isRecord(value.signals);
}

function toInterviewResponse(
  result: InterviewTurnResult,
): InterviewResponse {
  const response: InterviewResponse = {
    reply: result.reply,
    done: result.done,
  };

  if (result.done && result.feedback) {
    response.feedback = result.feedback;
  }

  return response;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  const sessionId = body.sessionId;

  if (
    typeof sessionId !== "string" ||
    sessionId.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "sessionId is required." },
      { status: 400 },
    );
  }

  const normalizedSessionId = sessionId.trim();

  /**
   * Start a new interview.
   */
  if (body.candidate !== undefined) {
    if (sessions.has(normalizedSessionId)) {
      return NextResponse.json(
        {
          error:
            "Interview session already exists for this sessionId.",
        },
        { status: 409 },
      );
    }

    if (!isCandidate(body.candidate)) {
      return NextResponse.json(
        { error: "Invalid candidate object." },
        { status: 400 },
      );
    }

    const candidateId = body.candidate.member.id;
    const candidate = getCandidateById(candidateId);

    if (!candidate) {
      return NextResponse.json(
        { error: `Candidate not found: ${candidateId}` },
        { status: 404 },
      );
    }

    try {
      const result = startInterview(
        normalizedSessionId,
        candidateId,
      );

      sessions.set(normalizedSessionId, result.state);

      return NextResponse.json(
        toInterviewResponse(result),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start interview.";

      return NextResponse.json(
        { error: message },
        { status: 500 },
      );
    }
  }

  /**
   * Process a candidate answer.
   */
  if (body.message !== undefined) {
    if (typeof body.message !== "string") {
      return NextResponse.json(
        { error: "message must be a string." },
        { status: 400 },
      );
    }

    const state = sessions.get(normalizedSessionId);

    if (!state) {
      return NextResponse.json(
        { error: "Interview session not found." },
        { status: 404 },
      );
    }

    try {
      const result = submitAnswer(
        state,
        body.message,
      );

      let responseResult = result;

      /**
       * When the deterministic interview engine
       * finishes the required interview, use Claude
       * to generate richer technical feedback.
       */
      if (result.done) {
        try {
          const aiFeedback = await generateAIFeedback(
            result.state,
          );

          responseResult = {
            ...result,
            feedback: aiFeedback,
            state: {
              ...result.state,
              feedback: aiFeedback,
            },
          };
        } catch (error) {
          /**
           * If Claude is unavailable or returns invalid
           * data, keep the deterministic feedback from
           * the existing interview engine.
           */
          console.error(
            "AI feedback generation failed:",
            error,
          );
        }
      }

      sessions.set(
        normalizedSessionId,
        responseResult.state,
      );

      return NextResponse.json(
        toInterviewResponse(responseResult),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to process message.";

      return NextResponse.json(
        { error: message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "Request must include candidate to start an interview or message to continue.",
    },
    { status: 400 },
  );
}