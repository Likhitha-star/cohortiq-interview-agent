"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";

type Feedback = {
  summary: string;
  scores: {
    overall: number;
    technicalKnowledge: number;
    implementationDepth: number;
    problemSolving: number;
    communication: number;
  };
  strengths: string[];
  gaps: string[];
  next: string[];
};

type Message = {
  role: "interviewer" | "candidate";
  text: string;
  day?: number;
  dayTitle?: string;
  isFollowUp?: boolean;
};

const candidates = [
  { id: "CAND-001", name: "Sarah Johnson", role: "Senior Data Engineer" },
  { id: "CAND-002", name: "Alex Turner", role: "Backend Software Engineer" },
  { id: "CAND-003", name: "Emily Chen", role: "AI Engineer" },
  { id: "CAND-004", name: "David Miller", role: "Business Analyst" },
  { id: "CAND-005", name: "Michael Brown", role: "DevOps Engineer" },
  { id: "CAND-006", name: "Wendy Foster", role: "Marketing Manager" },
  { id: "CAND-007", name: "Ethan Brooks", role: "Computer Science Intern" },
  { id: "CAND-008", name: "Harold Whitfield", role: "Distinguished Engineer" },
  { id: "CAND-009", name: "Zara Ahmadi", role: "AI Engineer" },
  { id: "CAND-010", name: "Gerald Combs", role: "IT Support Specialist" },
  { id: "CAND-011", name: "Mia Alvarez", role: "UX Researcher" },
  { id: "CAND-012", name: "Chen Wei", role: "Mobile App Developer" },
  { id: "CAND-013", name: "Ravi Patel", role: "Software Engineer" },
  { id: "CAND-014", name: "Bethany Cole", role: "HR Manager" },
  { id: "CAND-015", name: "Noah Kim", role: "Principal Architect" },
  { id: "CAND-016", name: "Isabella Rossi", role: "Software Engineer" },
  { id: "CAND-017", name: "Tyler Brooks", role: "Junior Developer" },
  { id: "CAND-018", name: "Diane Foster", role: "AI Engineer" },
  { id: "CAND-019", name: "Frank DeLuca", role: "Legacy Systems Engineer" },
  { id: "CAND-020", name: "Priyanka Sharma", role: "Software Engineer" },
];

export default function Home() {
  const [candidateId, setCandidateId] = useState("CAND-003");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [questionNumber, setQuestionNumber] = useState(1);
  const totalQuestions = 8;

  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [currentDayTitle, setCurrentDayTitle] = useState("");
  const [isFollowUp, setIsFollowUp] = useState(false);

  const selectedCandidate = candidates.find(
    (candidate) => candidate.id === candidateId,
  );

  const progressPercent = Math.min(
    100,
    Math.round((questionNumber / totalQuestions) * 100),
  );

  async function startInterview() {
    setLoading(true);
    setError("");
    setFeedback(null);
    setMessages([]);
    setAnswer("");

    setQuestionNumber(1);
    setCurrentDay(null);
    setCurrentDayTitle("");
    setIsFollowUp(false);

    const newSessionId = `session-${Date.now()}`;

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: newSessionId,
          candidate: {
            member: {
              id: candidateId,
            },
            missions: [],
            signals: {},
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start interview.");
      }

      setSessionId(newSessionId);
      setStarted(true);

      setQuestionNumber(data.questionNumber ?? 1);
      setCurrentDay(data.day ?? null);
      setCurrentDayTitle(data.dayTitle ?? "");
      setIsFollowUp(data.isFollowUp ?? false);

      setMessages([
        {
          role: "interviewer",
          text: data.reply,
          day: data.day,
          dayTitle: data.dayTitle,
          isFollowUp: data.isFollowUp,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start interview.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim() || !sessionId || loading) {
      return;
    }

    const candidateAnswer = answer.trim();

    setLoading(true);
    setError("");
    setAnswer("");

    setMessages((previous) => [
      ...previous,
      {
        role: "candidate",
        text: candidateAnswer,
      },
    ]);

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: candidateAnswer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit answer.");
      }

      setQuestionNumber(data.questionNumber ?? questionNumber);
      setCurrentDay(data.day ?? currentDay);
      setCurrentDayTitle(data.dayTitle ?? currentDayTitle);
      setIsFollowUp(data.isFollowUp ?? false);

      setMessages((previous) => [
        ...previous,
        {
          role: "interviewer",
          text: data.reply,
          day: data.day,
          dayTitle: data.dayTitle,
          isFollowUp: data.isFollowUp,
        },
      ]);

      if (data.done && data.feedback) {
        setFeedback(data.feedback);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit answer.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      submitAnswer();
    }
  }

  function resetInterview() {
    setStarted(false);
    setSessionId("");
    setMessages([]);
    setAnswer("");
    setFeedback(null);
    setError("");
    setQuestionNumber(1);
    setCurrentDay(null);
    setCurrentDayTitle("");
    setIsFollowUp(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* TOP BAR */}
        <header className="mb-8 flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 font-black text-slate-950">
              C
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                CohortIQ
              </h1>

              <p className="text-xs text-slate-500">
                AI Interview Agent
              </p>
            </div>
          </div>

          {started && (
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                ● Interview active
              </span>

              <button
                onClick={resetInterview}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900"
              >
                New Interview
              </button>
            </div>
          )}
        </header>

        {/* LANDING PAGE */}
        {!started && (
          <div className="mx-auto max-w-5xl">
            <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="flex flex-col justify-center">
                <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-xs font-medium text-cyan-400">
                  Adaptive technical interview
                </div>

                <h2 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                  Test technical depth.
                  <span className="block text-cyan-400">
                    Not memorized answers.
                  </span>
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
                  CohortIQ conducts a personalized interview based on the
                  candidate&apos;s AI cohort journey, adapts with follow-up
                  questions, and generates actionable technical feedback.
                </p>

                <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-2xl font-bold text-white">31</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Curriculum days
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-2xl font-bold text-white">8+</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Interview questions
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-2xl font-bold text-white">AI</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Feedback engine
                    </p>
                  </div>
                </div>
              </div>

              {/* START CARD */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Start an interview
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Select candidate
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    The interview will adapt to the selected candidate&apos;s
                    cohort journey.
                  </p>
                </div>

                <label
                  htmlFor="candidate"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Candidate
                </label>

                <select
                  id="candidate"
                  value={candidateId}
                  onChange={(event) => setCandidateId(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                >
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} — {candidate.role}
                    </option>
                  ))}
                </select>

                {selectedCandidate && (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-lg font-bold text-cyan-400">
                        {selectedCandidate.name.charAt(0)}
                      </div>

                      <div>
                        <p className="font-semibold">
                          {selectedCandidate.name}
                        </p>

                        <p className="mt-0.5 text-sm text-slate-400">
                          {selectedCandidate.role}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-slate-900 p-3">
                        <p className="text-lg font-bold">31</p>
                        <p className="text-xs text-slate-500">
                          Missions completed
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-900 p-3">
                        <p className="text-lg font-bold">30</p>
                        <p className="text-xs text-slate-500">
                          First-try passes
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={startInterview}
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-cyan-500 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Preparing interview..." : "Start Interview →"}
                </button>
              </section>
            </section>
          </div>
        )}

        {/* INTERVIEW SCREEN */}
        {started && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* MAIN INTERVIEW */}
            <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
              {/* INTERVIEW HEADER */}
              <div className="border-b border-slate-800 p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400">
                        Question {Math.min(questionNumber, totalQuestions)}{" "}
                        of {totalQuestions}
                      </span>

                      {isFollowUp && (
                        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-400">
                          ✦ ADAPTIVE FOLLOW-UP
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-xl font-bold">
                      Technical Interview
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      {selectedCandidate?.name} · {selectedCandidate?.role}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs uppercase tracking-widest text-slate-600">
                      CohortIQ
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-300">
                      Personalized AI interview
                    </p>
                  </div>
                </div>

                {/* PROGRESS */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Interview progress
                    </span>

                    <span className="text-xs font-medium text-slate-400">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="mt-3 flex gap-1.5">
                    {Array.from({ length: totalQuestions }).map(
                      (_, index) => {
                        const completed = index < questionNumber - 1;
                        const current = index === questionNumber - 1;

                        return (
                          <div
                            key={index}
                            className={`h-1.5 flex-1 rounded-full transition ${
                              completed
                                ? "bg-cyan-500"
                                : current
                                  ? "bg-cyan-400/60"
                                  : "bg-slate-800"
                            }`}
                          />
                        );
                      },
                    )}
                  </div>
                </div>
              </div>

              {/* CURRICULUM CONTEXT */}
              {(currentDay || currentDayTitle) && (
                <div className="border-b border-slate-800 bg-slate-950/40 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-sm font-bold text-cyan-400">
                      {currentDay ?? "—"}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                        Curriculum context
                      </p>

                      <p className="mt-0.5 truncate text-sm font-medium text-slate-300">
                        Day {currentDay}
                        {currentDayTitle
                          ? ` — ${currentDayTitle}`
                          : ""}
                      </p>
                    </div>

                    {isFollowUp && (
                      <div className="ml-auto hidden rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-300 sm:block">
                        Based on your previous answer
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CHAT */}
              <div className="max-h-[540px] space-y-5 overflow-y-auto p-5 sm:p-6">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "candidate"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        message.role === "candidate"
                          ? "max-w-[88%]"
                          : "max-w-[92%]"
                      }
                    >
                      <div
                        className={`mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest ${
                          message.role === "candidate"
                            ? "justify-end text-cyan-500"
                            : "text-slate-600"
                        }`}
                      >
                        {message.role === "candidate"
                          ? "You"
                          : "Interviewer"}

                        {message.role === "interviewer" &&
                          message.isFollowUp && (
                            <span className="text-violet-400">
                              · Adaptive
                            </span>
                          )}
                      </div>

                      <div
                        className={
                          message.role === "candidate"
                            ? "rounded-2xl rounded-tr-sm border border-cyan-400/20 bg-cyan-500 px-4 py-3 text-slate-950"
                            : "rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-800/80 px-4 py-4 text-slate-200"
                        }
                      >
                        <p className="whitespace-pre-wrap text-sm leading-7">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-800/80 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 [animation-delay:300ms]" />
                        <span className="ml-1 text-xs text-slate-500">
                          Interviewer is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ANSWER BOX */}
              {!feedback && (
                <div className="border-t border-slate-800 p-5 sm:p-6">
                  <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 transition focus-within:border-cyan-500/50">
                    <textarea
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Explain your approach, implementation decisions, and trade-offs..."
                      rows={4}
                      disabled={loading}
                      className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-7 text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
                    />

                    <div className="mt-2 flex items-center justify-between border-t border-slate-800 px-2 pt-3">
                      <p className="text-xs text-slate-600">
                        Ctrl + Enter to submit
                      </p>

                      <button
                        onClick={submitAnswer}
                        disabled={!answer.trim() || loading}
                        className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {loading ? "Processing..." : "Submit Answer →"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* SIDEBAR */}
            <aside className="space-y-6">
              {/* CANDIDATE CARD */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  Candidate profile
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-xl font-bold text-cyan-400">
                    {selectedCandidate?.name.charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate font-bold">
                      {selectedCandidate?.name}
                    </h2>

                    <p className="mt-1 truncate text-sm text-slate-400">
                      {selectedCandidate?.role}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950 p-3">
                    <p className="text-xl font-bold">31</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">
                      Missions
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3">
                    <p className="text-xl font-bold">30</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">
                      First-try
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-[10px] text-slate-600">
                    <span>Cohort progress</span>
                    <span>31 / 31</span>
                  </div>

                  <div className="h-1.5 rounded-full bg-slate-800">
                    <div className="h-full w-full rounded-full bg-cyan-500" />
                  </div>
                </div>
              </section>

              {/* ADAPTIVE SIGNAL */}
              <section
                className={`rounded-2xl border p-5 transition ${
                  isFollowUp
                    ? "border-violet-500/20 bg-violet-500/5"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isFollowUp
                        ? "bg-violet-500/10 text-violet-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    ✦
                  </div>

                  <div>
                    <p
                      className={`text-xs font-bold ${
                        isFollowUp
                          ? "text-violet-400"
                          : "text-slate-400"
                      }`}
                    >
                      Adaptive Interview
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {isFollowUp
                        ? "The interviewer detected a missing detail and generated a targeted follow-up."
                        : "Follow-up questions are generated from your previous answers."}
                    </p>
                  </div>
                </div>
              </section>

              {/* FINAL FEEDBACK */}
              {feedback && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                        Interview complete
                      </p>

                      <h2 className="mt-1 text-xl font-bold">
                        Technical Feedback
                      </h2>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      ✓
                    </div>
                  </div>

                  {/* OVERALL ASSESSMENT */}
                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-500">
                      Overall assessment
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {feedback.summary}
                    </p>
                  </div>

                  {/* SCORES */}
                  <div className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                      Interview Scores
                    </h3>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-2xl font-bold text-cyan-400">
                          {feedback.scores.overall}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Overall
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-2xl font-bold text-cyan-400">
                          {feedback.scores.technicalKnowledge}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Technical Knowledge
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-2xl font-bold text-violet-400">
                          {feedback.scores.implementationDepth}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Implementation Depth
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-2xl font-bold text-amber-400">
                          {feedback.scores.problemSolving}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Problem Solving
                        </p>
                      </div>

                      <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-emerald-400">
                              {feedback.scores.communication}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Communication
                            </p>
                          </div>

                          <p className="text-xs text-slate-600">
                            Score / 100
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STRENGTHS */}
                  <div className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                      Strengths
                    </h3>

                    <ul className="mt-3 space-y-2">
                      {feedback.strengths.length > 0 ? (
                        feedback.strengths.map((item, index) => (
                          <li
                            key={index}
                            className="rounded-lg bg-emerald-500/5 px-3 py-2.5 text-xs leading-5 text-slate-300"
                          >
                            <span className="mr-2 text-emerald-400">
                              ✓
                            </span>
                            {item}
                          </li>
                        ))
                      ) : (
                        <li className="rounded-lg bg-slate-950 px-3 py-2.5 text-xs text-slate-400">
                          No strengths identified.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* GAPS */}
                  <div className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400">
                      Gaps
                    </h3>

                    <ul className="mt-3 space-y-2">
                      {feedback.gaps.length > 0 ? (
                        feedback.gaps.map((item, index) => (
                          <li
                            key={index}
                            className="rounded-lg bg-amber-500/5 px-3 py-2.5 text-xs leading-5 text-slate-300"
                          >
                            <span className="mr-2 text-amber-400">
                              !
                            </span>
                            {item}
                          </li>
                        ))
                      ) : (
                        <li className="rounded-lg bg-slate-950 px-3 py-2.5 text-xs text-slate-400">
                          No major gaps identified.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* NEXT STEPS */}
                  <div className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400">
                      Recommended next steps
                    </h3>

                    <ul className="mt-3 space-y-2">
                      {feedback.next.length > 0 ? (
                        feedback.next.map((item, index) => (
                          <li
                            key={index}
                            className="rounded-lg bg-violet-500/5 px-3 py-2.5 text-xs leading-5 text-slate-300"
                          >
                            <span className="mr-2 text-violet-400">
                              →
                            </span>
                            {item}
                          </li>
                        ))
                      ) : (
                        <li className="rounded-lg bg-slate-950 px-3 py-2.5 text-xs text-slate-400">
                          Continue practicing technical explanations.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* NEW INTERVIEW */}
                  <button
                    onClick={resetInterview}
                    className="mt-6 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-950 hover:text-white"
                  >
                    Start Another Interview
                  </button>
                </section>
              )}
            </aside>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <div className="font-semibold">
              Something went wrong
            </div>

            <p className="mt-1 text-red-300/80">
              {error}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}