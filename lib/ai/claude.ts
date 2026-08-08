import Groq from "groq-sdk";

import type {
  InterviewFeedback,
  InterviewState,
} from "@/lib/interview/engine";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Send a prompt to Groq and return its text response.
 */
export async function askGroq(prompt: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0.2,
    max_completion_tokens: 2048,
    reasoning_effort: "low",
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
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

Evaluate the candidate based ONLY on the evidence in the transcript.

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

- Use only evidence from the transcript.
- Be technically specific but concise.
- Keep the summary under 40 words.
- Return exactly 2 items in each array.
- Keep every array item under 20 words.
- Do not invent experience.
`;

  const response = await askGroq(prompt);

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
    throw new Error("Groq returned invalid interview feedback.");
  }
}