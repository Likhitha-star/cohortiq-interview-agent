import curriculumJson from "@/data/curriculum.json";

import type { Curriculum, CurriculumDay } from "@/lib/types";

const curriculum = curriculumJson as Curriculum;

export type { Curriculum, CurriculumDay, CurriculumDayType, CurriculumModule } from "@/lib/types";

export function getCurriculumDay(day: number): CurriculumDay | undefined {
  return curriculum.days.find((entry) => entry.day === day);
}
