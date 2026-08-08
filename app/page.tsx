"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";

type Feedback = {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
};

type Message = {
  role: "interviewer" | "candidate";
  text: string;
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

  const selectedCandidate = candidates.find(
    (candidate) => candidate.id === candidateId,
  );

  async function startInterview() {
    setLoading(true);
    setError("");
    setFeedback(null);
    setMessages([]);

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

      setMessages([
        {
          role: "interviewer",
          text: data.reply,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start interview.",
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

      setMessages((previous) => [
        ...previous,
        {
          role: "interviewer",
          text: data.reply,
        },
      ]);

      if (data.done && data.feedback) {
        setFeedback(data.feedback);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit answer.",
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            AI Technical Interview Agent
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            CohortIQ
          </h1>

          <p className="mt-2 text-slate-400">
            Adaptive technical interviews powered by the cohort curriculum
            and Claude.
          </p>
        </header>

        {!started && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              Start an Interview
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Select a candidate profile to begin.
            </p>

            <label
              htmlFor="candidate"
              className="mt-6 mb-2 block text-sm font-medium"
            >
              Candidate
            </label>

            <select
              id="candidate"
              value={candidateId}
              onChange={(event) => setCandidateId(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} — {candidate.role}
                </option>
              ))}
            </select>

            {selectedCandidate && (
              <div className="mt-4 rounded-lg bg-slate-800 p-4">
                <p className="font-medium">
                  {selectedCandidate.name}
                </p>
                <p className="text-sm text-slate-400">
                  {selectedCandidate.role}
                </p>
              </div>
            )}

            <button
              onClick={startInterview}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {loading ? "Starting..." : "Start Interview"}
            </button>
          </section>
        )}

        {started && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-5 border-b border-slate-800 pb-4">
                <h2 className="font-semibold">
                  Technical Interview
                </h2>

                <p className="text-sm text-slate-400">
                  {selectedCandidate?.name} · {selectedCandidate?.role}
                </p>
              </div>

              <div className="max-h-[520px] space-y-4 overflow-y-auto">
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
                          ? "max-w-[85%] rounded-2xl bg-cyan-500 px-4 py-3 text-slate-950"
                          : "max-w-[85%] rounded-2xl bg-slate-800 px-4 py-3 text-slate-200"
                      }
                    >
                      <p className="mb-1 text-xs font-semibold uppercase opacity-60">
                        {message.role === "candidate"
                          ? "You"
                          : "Interviewer"}
                      </p>

                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {!feedback && (
                <div className="mt-5 border-t border-slate-800 pt-5">
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your technical answer..."
                    rows={5}
                    disabled={loading}
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Ctrl + Enter to submit
                    </p>

                    <button
                      onClick={submitAnswer}
                      disabled={!answer.trim() || loading}
                      className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Submit Answer"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-semibold">
                Interview Progress
              </h2>

              <div className="mt-5 rounded-lg bg-slate-800 p-4">
                <p className="text-xs uppercase text-slate-500">
                  Candidate
                </p>

                <p className="mt-1 font-medium">
                  {selectedCandidate?.name}
                </p>

                <p className="text-sm text-slate-400">
                  {selectedCandidate?.role}
                </p>
              </div>

              {feedback && (
                <div className="mt-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-400">
                      Overall Assessment
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {feedback.summary}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400">
                      Strengths
                    </h3>

                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      {feedback.strengths.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-amber-400">
                      Gaps
                    </h3>

                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      {feedback.gaps.length > 0 ? (
                        feedback.gaps.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))
                      ) : (
                        <li>• No major gaps identified.</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-violet-400">
                      Recommended Next Steps
                    </h3>

                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      {feedback.next.length > 0 ? (
                        feedback.next.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))
                      ) : (
                        <li>
                          • Continue practicing technical explanations.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}