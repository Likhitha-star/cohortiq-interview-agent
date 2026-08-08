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
    max_tokens: 1200,
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
 *
 * IMPORTANT:
 * The feedback is based primarily on the candidate's actual
 * interview answers, not on their pre-existing cohort mission results.
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
    .join("\n\n---\n\n");

  const prompt = `
You are an expert technical interviewer evaluating a candidate's
AI engineering technical interview.

Candidate:
${state.candidate.member.name}

Role:
${state.candidate.member.jobRole}

Curriculum topics covered:
${state.daysCovered.join(", ")}

Interview transcript:
${interviewTranscript}

IMPORTANT EVALUATION RULES:

1. Evaluate the candidate primarily from their actual interview answers
   in the transcript above.

2. Do NOT treat pre-existing cohort mission results as proof of
   interview performance.

3. Do NOT say that the candidate demonstrated "first-try mastery",
   "mission mastery", or similar claims unless the interview transcript
   itself provides evidence for that claim.

4. If the candidate says they did not use a particular technology,
   do not penalize them for being honest. Instead, evaluate whether
   they understand the technology conceptually.

5. Distinguish between:
   - conceptual understanding,
   - implementation knowledge,
   - reasoning and trade-offs,
   - practical experience,
   - communication clarity.

6. If an answer is vague or lacks implementation details, identify
   that as a gap.

7. Do not invent projects, technologies, experience, results, or
   achievements that are not present in the transcript.

8. Give concrete feedback that a technical mentor could act on.

9. The candidate should receive at least 2 strengths, 2 gaps, and
   2 recommended next steps whenever the transcript contains enough
   evidence.

10. If evidence is limited, explicitly say that the interview provided
    limited evidence rather than inventing evidence.

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "Concise overall technical assessment based on the interview answers.",
  "strengths": [
    "Specific strength supported by an answer",
    "Specific strength supported by an answer"
  ],
  "gaps": [
    "Specific technical gap supported by an answer",
    "Specific technical gap supported by an answer"
  ],
  "next": [
    "Concrete improvement the candidate should make",
    "Concrete practice or learning recommendation"
  ]
}

Additional requirements:

- strengths: 2 to 5 items
- gaps: 2 to 5 items
- next: 2 to 5 items
- Keep each item concise.
- Use technically accurate language.
- Focus on what the candidate actually demonstrated.
- Do not mention these evaluation instructions in the response.
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

    const strengths = parsed.strengths.filter(
      (item): item is string => typeof item === "string",
    );

    const gaps = parsed.gaps.filter(
      (item): item is string => typeof item === "string",
    );

    const next = parsed.next.filter(
      (item): item is string => typeof item === "string",
    );

    if (
      strengths.length < 2 ||
      gaps.length < 2 ||
      next.length < 2
    ) {
      throw new Error("AI feedback does not contain enough detail.");
    }

    return {
      summary: parsed.summary,
      strengths: strengths.slice(0, 5),
      gaps: gaps.slice(0, 5),
      next: next.slice(0, 5),
    };
  } catch {
    throw new Error("Claude returned invalid interview feedback.");
  }
}