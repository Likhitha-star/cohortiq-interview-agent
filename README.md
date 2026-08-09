# CohortIQ — Adaptive AI Interview Agent

CohortIQ is an adaptive AI-powered technical interview agent that evaluates a candidate's understanding of their AI cohort project through curriculum-aware interview questions.

The system analyzes a candidate's cohort progress, selects relevant curriculum topics, asks primary questions, generates contextual follow-up questions based on previous answers, and produces evidence-based technical feedback using Groq.

## Live Demo

**Live Application:**  
cohortiq-interview-agent.vercel.app

## GitHub Repository

**Repository:**  
https://github.com/Likhitha-star/cohortiq-interview-agent

---

## Features

### 1. Adaptive Interview Engine

The interview is not a fixed list of questions.

The engine:

- Analyzes the candidate's cohort mission history.
- Prioritizes weaker or incomplete areas.
- Selects multiple curriculum days.
- Ensures minimum curriculum coverage.
- Generates primary interview questions.
- Generates follow-up questions based on candidate answers.
- Prevents duplicate questions.
- Completes the interview after the required coverage and question count are reached.

### 2. Curriculum-Aware Questions

Questions are generated from curriculum objectives and tools associated with each cohort day.

Examples include:

- Python
- React
- GitHub
- Embeddings
- Vector databases
- Prompt engineering
- APIs
- CrewAI
- Docker
- Kubernetes
- Security and guardrails

### 3. AI-Powered Technical Feedback

After the interview is completed, the candidate's actual answers are sent to Groq for evaluation.

The AI evaluates:

- Technical Knowledge
- Implementation Depth
- Problem Solving
- Communication

The overall score is calculated by the backend from these four category scores.

### 4. Evidence-Based Evaluation

The AI is instructed to evaluate only evidence contained in the interview transcript.

It does not award technical credit based on:

- Candidate name
- Job title
- Cohort completion
- Mission completion
- First-try statistics
- Assumptions about candidate knowledge

### 5. Structured Feedback

The completed interview provides:

- Overall assessment
- Four technical scores
- Two strengths
- Two technical gaps
- Two recommended next steps

### 6. Deterministic Fallback

The interview engine contains deterministic feedback generation so the application can still produce feedback if AI feedback generation fails.

---

## How the Adaptive Interview Works

The interview follows this flow:

```text
Candidate Profile
       ↓
Mission & Curriculum Analysis
       ↓
Topic Scoring
       ↓
Topic Plan
       ↓
Primary Interview Question
       ↓
Candidate Answer
       ↓
Answer Analysis
       ↓
Follow-up Question
       ↓
Additional Candidate Answer
       ↓
Minimum Coverage Reached
       ↓
Groq AI Evaluation
       ↓
Technical Feedback

The interview requires:

At least 8 answered questions
At least 4 distinct curriculum days

This prevents the interview from ending after only a few questions about one topic.

AI Feedback Architecture

The AI feedback pipeline uses Groq.

Interview Transcript
        ↓
Groq
        ↓
Structured JSON
        ↓
Schema Validation
        ↓
Score Normalization
        ↓
Overall Score Calculation
        ↓
Interview Feedback

The model is required to return structured JSON containing:

{
  "summary": "...",
  "scores": {
    "technicalKnowledge": 0,
    "implementationDepth": 0,
    "problemSolving": 0,
    "communication": 0
  },
  "strengths": [
    "...",
    "..."
  ],
  "gaps": [
    "...",
    "..."
  ],
  "next": [
    "...",
    "..."
  ]
}

The backend validates the response before displaying it to the candidate.

Tech Stack
Frontend
Next.js
React
TypeScript
Backend
Next.js API Routes
TypeScript
In-memory interview session management
AI
Groq API
groq-sdk
openai/gpt-oss-20b
Deployment
Vercel
Development
Git
GitHub
npm
Project Structure
cohortiq-hackathon/
│
├── app/
│   ├── api/
│   │   └── interview/
│   │       └── route.ts
│   │
│   └── page.tsx
│
├── lib/
│   ├── ai/
│   │   └── claude.ts
│   │
│   ├── data/
│   │   ├── candidates.ts
│   │   └── curriculum.ts
│   │
│   ├── interview/
│   │   └── engine.ts
│   │
│   └── types.ts
│
├── PROMPTS.md
├── package.json
├── next.config.ts
└── README.md
Environment Variables

Create a .env.local file:

GROQ_API_KEY=your_groq_api_key

Do not commit .env.local or API keys to GitHub.

Running Locally

Clone the repository:

git clone https://github.com/Likhitha-star/cohortiq-interview-agent.git

Move into the project:

cd cohortiq-interview-agent

Install dependencies:

npm install

Create .env.local:

GROQ_API_KEY=your_groq_api_key

Start the development server:

npm run dev

Open:

http://localhost:3000
Production Build

The project can be verified locally with:

npm run build

The production build currently completes successfully.

API
Start Interview
POST /api/interview

Request:

{
  "sessionId": "unique-session-id",
  "candidate": {
    "...": "candidate object"
  }
}
Submit Answer
POST /api/interview

Request:

{
  "sessionId": "unique-session-id",
  "message": "Candidate's interview answer"
}

The API returns the next question or the completed interview feedback.

Interview Evaluation Criteria
Technical Knowledge

Measures understanding of:

Technical concepts
Frameworks
Libraries
APIs
AI technologies
Terminology
Implementation Depth

Looks for concrete evidence such as:

Code structure
Libraries
APIs
Database choices
Architecture
Deployment
Authentication
Error handling
Testing
Debugging
Performance decisions
Problem Solving

Evaluates:

Technical reasoning
Debugging
Trade-offs
Handling challenges
Improvement decisions
Communication

Evaluates:

Clarity
Structure
Completeness
Precision
Ability to explain technical decisions
Design Decisions
Why adaptive questions?

A fixed interview gives every candidate the same experience regardless of their cohort progress.

CohortIQ instead prioritizes areas where the candidate needs more evidence or where their project experience is particularly relevant.

Why follow-up questions?

A candidate mentioning a technology does not necessarily demonstrate implementation knowledge.

Follow-up questions allow the interviewer to ask for:

Specific implementation details
Architecture decisions
Challenges
Trade-offs
Improvements
Why structured AI output?

Structured JSON makes the AI response predictable and easier to validate before displaying it in the UI.

Why calculate the overall score in the backend?

The AI generates the four category scores, while the backend calculates the overall score as their average.

This prevents the model from returning an inconsistent overall score.

AI Usage

AI was used during development to assist with:

Interview engine design
Adaptive question generation logic
Groq integration
Structured feedback generation
JSON validation
Error handling
Code debugging
UI implementation
Documentation

A detailed AI usage log is available in:

PROMPTS.md