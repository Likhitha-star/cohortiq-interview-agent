# PROMPTS.md

## CohortIQ Interview Agent — AI Prompt Log

This document records the prompts used during development of the CohortIQ Interview Agent.

The project initially explored multiple AI providers. When an API provider was unavailable because of usage or credit limitations, the implementation was switched to another provider so development could continue.

---

## 1. Claude — Initial AI Feedback Integration

### Provider
Anthropic Claude

### Purpose
Generate structured technical interview feedback after the interview is completed.

### Prompt

You are an expert technical interviewer evaluating a candidate's AI engineering interview.

Candidate:
{{candidate_name}}

Role:
{{job_role}}

The interview covered these curriculum days:
{{days_covered}}

Interview transcript:
{{interview_transcript}}

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

### Outcome

Claude integration was implemented successfully at the code level, but the Anthropic API could not be used because the available credit balance was insufficient.

---

## 2. Gemini — Alternative AI Provider

### Provider
Google Gemini

### Purpose
Replace Claude for AI-generated interview feedback without requiring Anthropic credits.

### Prompt

The same structured technical interview feedback prompt was reused to maintain consistent evaluation requirements across providers.

You are an expert technical interviewer evaluating a candidate's AI engineering interview.

Candidate:
{{candidate_name}}

Role:
{{job_role}}

The interview covered these curriculum days:
{{days_covered}}

Interview transcript:
{{interview_transcript}}

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

- Be technically specific.
- Do not invent experience that is not shown in the answers.
- Focus on technical depth, reasoning, implementation understanding, and communication.
- Keep each array between 2 and 5 items.
- Keep the summary concise.

### Outcome

Gemini was integrated and tested, but the selected model was unavailable to new users. The project was therefore switched to another provider.

---

## 3. Groq — Final AI Provider

### Provider
Groq

### Model
openai/gpt-oss-20b

### Purpose
Generate AI-powered technical interview feedback after the deterministic interview engine completes.

### Prompt

You are an expert technical interviewer evaluating a candidate's AI engineering interview.

Candidate:
{{candidate_name}}

Role:
{{job_role}}

The interview covered these curriculum days:
{{days_covered}}

Interview transcript:
{{interview_transcript}}

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

- Be technically specific.
- Do not invent experience that is not shown in the answers.
- Focus on technical depth, reasoning, implementation understanding, and communication.
- Keep each array between 2 and 5 items.
- Keep the summary concise.

### Outcome

Groq successfully generated AI-powered interview feedback during the end-to-end interview test.

The generated feedback correctly reflected the candidate's actual answers and identified the lack of technical depth in short responses.

---

## Prompt Design Principles

The AI feedback prompt was designed to:

1. Evaluate only evidence present in the interview transcript.
2. Prevent the model from inventing candidate experience.
3. Focus on technical depth and implementation understanding.
4. Evaluate reasoning and communication.
5. Produce structured JSON suitable for direct UI rendering.
6. Keep feedback concise and actionable.
7. Maintain the same evaluation structure across AI providers.

---

## Provider Switching Strategy

The project follows the hackathon guidance that AI providers can be replaced when usage limits or availability issues occur.

Provider progression:

Claude → Gemini → Groq

The interview engine and application architecture remained unchanged while the AI feedback provider was replaced.

This keeps the AI integration modular and allows another provider to be substituted in the future if necessary.