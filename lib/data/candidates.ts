import candidatesJson from "@/data/candidates.json";

import type { Candidate, CandidatesData } from "@/lib/types";

const candidatesData = candidatesJson as CandidatesData;

export type {
  Candidate,
  CandidateMember,
  CandidateMission,
  CandidateMissionAttempted,
  CandidateMissionSkipped,
  CandidateSignals,
  CandidatesData,
} from "@/lib/types";

export function getCandidateById(id: string): Candidate | undefined {
  return candidatesData.candidates.find(
    (candidate) => candidate.member.id === id,
  );
}
