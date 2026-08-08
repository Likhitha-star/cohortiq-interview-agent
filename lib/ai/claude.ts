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
    temperature: 0.1,
    max_completion_tokens: 2048,
    reasoning_effort: "low",
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          "You are a strict technical interviewer. Evaluate only evidence explicitly present in the interview transcript.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

/**
 * Keep a score inside the valid 0-100 range.
 */
function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Calculate the overall score from the four category scores.
 *
 * The LLM does NOT control the overall score.
 * The backend calculates it consistently.
 */
function calculateOverallScore(
  technicalKnowledge: number,
  implementationDepth: number,
  problemSolving: number,
  communication: number,
): number {
  const average =
    (technicalKnowledge +
      implementationDepth +
      problemSolving +
      communication) /
    4;

  return Math.round(average);
}

/**
 * Generate evidence-based AI interview feedback.
 */
export async function generateAIFeedback(
  state: InterviewState,
): Promise<InterviewFeedback> {
  const interviewTranscript = state.answers
    .map(
      (answer, index) => `
Question ${index + 1}
Day: ${answer.day}

Question:
${answer.questionText}

Candidate answer:
${answer.answer}
`,
    )
    .join("\n------------------------------\n");

  const prompt = `
You are evaluating a technical AI engineering interview.

IMPORTANT:
Evaluate ONLY the candidate's actual answers in the transcript.

Do NOT give credit because of:

- candidate name
- candidate job title
- cohort completion
- mission completion
- first-try statistics
- assumptions about what the candidate probably knows

Candidate:
${state.candidate.member.name}

Role:
${state.candidate.member.jobRole}

Days actually covered in this interview:
${state.daysCovered.join(", ")}

Number of questions:
${state.answers.length}

Interview transcript:
${interviewTranscript}

Score each category from 0 to 100.

TECHNICAL KNOWLEDGE:
Understanding of concepts, terminology, frameworks, libraries, APIs, and technologies.

IMPLEMENTATION DEPTH:
Ability to explain what was actually built.

Reward evidence such as:

- code structure
- libraries
- APIs
- configuration
- models
- database choices
- architecture
- deployment
- authentication
- error handling
- debugging
- testing
- performance decisions

PROBLEM SOLVING:
Reasoning, debugging, trade-offs, and handling technical challenges.

COMMUNICATION:
Clarity, structure, completeness, and precision.

Scoring guidelines:

0-19:
Almost no useful technical evidence.

20-39:
Very weak technical understanding or mostly vague answers.

40-59:
Some relevant understanding but substantial missing details.

60-74:
Reasonable technical understanding with moderate implementation detail.

75-89:
Strong technical answers with concrete implementation evidence.

90-100:
Exceptional technical depth with detailed implementation evidence, strong reasoning, and precise explanations.

IMPORTANT:

Do NOT give 90+ unless the transcript contains substantial concrete technical evidence.

Do NOT give 100 unless the candidate demonstrates exceptional depth across essentially all evaluated areas.

Short answers should normally receive lower implementationDepth and technicalKnowledge scores unless they contain unusually precise technical information.

Follow-up questions are part of the interview.

Evaluate follow-up answers exactly like primary answers.

If a follow-up asks about a missing technology such as:

- FastAPI
- React
- Sentence Transformers
- PEFT
- LoRA
- QLoRA
- CrewAI
- LangChain
- Docker
- Kubernetes
- Pydantic
- PostgreSQL
- Supabase

and the candidate provides a concrete answer, give credit for that evidence.

If the candidate still does not provide technical details, identify that as a gap.

If the candidate mentions a technology but does not explain how it was actually used, give only limited credit for implementation depth.

Example of a detailed technical answer:

"I used FastAPI to expose a POST /chat endpoint. The endpoint validated the request body with Pydantic, called the retrieval layer, passed the context to the LLM, and returned the generated response."

This should receive meaningful implementation credit.

Example of a weak answer:

"I used FastAPI to create the API."

This demonstrates awareness but limited implementation depth.

Example of a very weak answer:

"I used FastAPI because it is good."

This provides almost no implementation evidence.

Do not punish a candidate merely because a technology was not mentioned in an answer unless:

1. The interviewer explicitly asked about that technology, OR
2. The technology was directly relevant to the question and its absence materially limits the explanation.

Do not invent missing technologies.

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "Concise evidence-based assessment.",
  "scores": {
    "technicalKnowledge": 0,
    "implementationDepth": 0,
    "problemSolving": 0,
    "communication": 0
  },
  "strengths": [
    "Specific demonstrated strength",
    "Specific demonstrated strength"
  ],
  "gaps": [
    "Specific technical gap",
    "Specific technical gap"
  ],
  "next": [
    "Specific actionable improvement",
    "Specific actionable improvement"
  ]
}

STRICT OUTPUT RULES:

- Do NOT return an overall score.
- The backend will calculate overall.
- Return up to 2 strengths.
- Return up to 2 gaps.
- Return up to 2 next steps.
- Prefer exactly 2 items when the transcript supports them.
- Summary under 40 words.
- Each strength under 20 words.
- Each gap under 20 words.
- Each next step under 20 words.
- Scores must be integers from 0 to 100.
- No markdown.
- No additional fields.
- No explanation outside JSON.

Before returning JSON:

1. Verify every category score is between 0 and 100.
2. Verify the feedback statements are supported by the transcript.
3. Never invent implementation experience.
4. Never use the candidate's job title to determine technical ability.
`;


  const response = await askGroq(prompt);

  try {
    const parsed: unknown = JSON.parse(response);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("summary" in parsed) ||
      !("scores" in parsed) ||
      !("strengths" in parsed) ||
      !("gaps" in parsed) ||
      !("next" in parsed)
    ) {
      throw new Error("Invalid AI feedback structure.");
    }

    const data = parsed as {
      summary: unknown;
      scores: unknown;
      strengths: unknown;
      gaps: unknown;
      next: unknown;
    };

    if (
      typeof data.summary !== "string" ||
      typeof data.scores !== "object" ||
      data.scores === null ||
      !Array.isArray(data.strengths) ||
      !Array.isArray(data.gaps) ||
      !Array.isArray(data.next)
    ) {
      throw new Error("Invalid AI feedback data.");
    }

    const scores = data.scores as {
      technicalKnowledge?: unknown;
      implementationDepth?: unknown;
      problemSolving?: unknown;
      communication?: unknown;
    };

    if (
      typeof scores.technicalKnowledge !== "number" ||
      typeof scores.implementationDepth !== "number" ||
      typeof scores.problemSolving !== "number" ||
      typeof scores.communication !== "number"
    ) {
      throw new Error("Invalid AI score structure.");
    }

    const technicalKnowledge = normalizeScore(
      scores.technicalKnowledge,
    );

    const implementationDepth = normalizeScore(
      scores.implementationDepth,
    );

    const problemSolving = normalizeScore(
      scores.problemSolving,
    );

    const communication = normalizeScore(
      scores.communication,
    );

    const overall = calculateOverallScore(
      technicalKnowledge,
      implementationDepth,
      problemSolving,
      communication,
    );

    const strengths = data.strengths
      .filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0,
      )
      .slice(0, 2);

    const gaps = data.gaps
      .filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0,
      )
      .slice(0, 2);

    const next = data.next
      .filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0,
      )
      .slice(0, 2);

    /**
     * Groq sometimes returns only one item even though
     * the prompt asks for two. Instead of failing the
     * entire AI evaluation, safely fill missing items.
     */
    if (strengths.length === 0) {
      strengths.push(
        "Provided relevant technical evidence during the interview.",
      );
    }

    if (strengths.length === 1) {
      strengths.push(
        "Demonstrated awareness of the technologies discussed.",
      );
    }

    if (gaps.length === 0) {
      gaps.push(
        "Limited concrete implementation evidence.",
      );
    }

    if (gaps.length === 1) {
      gaps.push(
        "Some technical details require deeper explanation.",
      );
    }

    if (next.length === 0) {
      next.push(
        "Provide more concrete implementation examples.",
      );
    }

    if (next.length === 1) {
      next.push(
        "Explain technical decisions and trade-offs in greater detail.",
      );
    }

    return {
      summary: data.summary.trim(),

      scores: {
        overall,
        technicalKnowledge,
        implementationDepth,
        problemSolving,
        communication,
      },

      strengths: strengths.slice(0, 2),
      gaps: gaps.slice(0, 2),
      next: next.slice(0, 2),
    };
  } catch (error) {
    console.error(
      "Failed to parse Groq interview feedback:",
      error,
    );

    console.error(
      "Raw Groq response:",
      response,
    );

    throw new Error(
      "Groq returned invalid interview feedback.",
    );
  }
}