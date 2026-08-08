import Anthropic from "@anthropic-ai/sdk";

import type {
  InterviewFeedback,
  InterviewState,
} from "@/lib/interview/engine";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Send a prompt to Claude and return its text response.
 */
export async function askClaude(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textBlock = response.content.find(
    (block) => block.type === "text",
  );

  return textBlock?.text ?? "";
}

/**
 * Generate AI-powered technical interview feedback.
 */
export async function generateAIFeedback(
  state: InterviewState,
): Promise<InterviewFeedback> {
  const interviewTranscript = state.answers
    .map(
      (answer, index) =>
        `Question ${index + 1} (Day ${answer.day}):
${answer.questionText}

Candidate answer:
${answer.answer}`,
    )
    .join("\n\n");

  const prompt = `
You are an expert technical interviewer evaluating a candidate's AI engineering interview.

Candidate:
${state.candidate.member.name}

Role:
${state.candidate.member.jobRole}

The interview covered these curriculum days:
${state.daysCovered.join(", ")}

Interview transcript:
${interviewTranscript}

Evaluate the candidate based only on the evidence in the transcript.

Return ONLY valid JSON in exactly this structure:

{
  "summary": "A concise overall assessment.",
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "gaps": [
    "Gap 1",
    "Gap 2"
  ],
  "next": [
    "Recommended improvement 1",
    "Recommended improvement 2"
  ]
}

Requirements:
- Be technically specific.
- Do not invent experience that is not shown in the answers.
- Focus on technical depth, reasoning, implementation understanding, and communication.
- Keep each array between 2 and 5 items.
- Keep the summary concise.
`;

  const response = await askClaude(prompt);

  try {
    const parsed: unknown = JSON.parse(response);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("summary" in parsed) ||
      !("strengths" in parsed) ||
      !("gaps" in parsed) ||
      !("next" in parsed) ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.gaps) ||
      !Array.isArray(parsed.next)
    ) {
      throw new Error("Invalid AI feedback structure.");
    }

    return {
      summary: parsed.summary,
      strengths: parsed.strengths.filter(
        (item): item is string => typeof item === "string",
      ),
      gaps: parsed.gaps.filter(
        (item): item is string => typeof item === "string",
      ),
      next: parsed.next.filter(
        (item): item is string => typeof item === "string",
      ),
    };
  } catch {
    throw new Error("Claude returned invalid interview feedback.");
  }
}