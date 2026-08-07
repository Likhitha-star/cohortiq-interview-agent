/** Candidate member profile from candidates.json */
export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

/** Mission attempt with a pass/fail outcome */
export interface CandidateMissionAttempted {
  day: number;
  title: string;
  passed: boolean;
  attempts: number;
}

/** Mission that was skipped */
export interface CandidateMissionSkipped {
  day: number;
  title: string;
  skipped: true;
}

export type CandidateMission =
  | CandidateMissionAttempted
  | CandidateMissionSkipped;

/** Aggregate activity signals for a candidate */
export interface CandidateSignals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

/** Full candidate record from candidates.json */
export interface Candidate {
  member: CandidateMember;
  missions: CandidateMission[];
  signals: CandidateSignals;
}

/** Root shape of candidates.json */
export interface CandidatesData {
  candidates: Candidate[];
}

/** Module grouping from curriculum.json */
export interface CurriculumModule {
  n: number;
  title: string;
  days: number[];
}

/** Day types observed in curriculum.json */
export type CurriculumDayType =
  | "SETUP"
  | "BUILD"
  | "AI_CORE"
  | "SHIP_IT"
  | "LEARN"
  | "OPTIMIZE"
  | "CAPSTONE";

/** Single curriculum day from curriculum.json */
export interface CurriculumDay {
  day: number;
  title: string;
  type: CurriculumDayType;
  tools: string[];
  objectives: string[];
}

/** Root shape of curriculum.json */
export interface Curriculum {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
}
