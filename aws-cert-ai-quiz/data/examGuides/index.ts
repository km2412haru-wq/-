import type { ExamGuide, ExamId } from "@/types/quiz";
import { CP_EXAM_GUIDE } from "./cp";
import { SAA_EXAM_GUIDE } from "./saa";

export const EXAM_GUIDES: Record<ExamId, ExamGuide> = {
  CP: CP_EXAM_GUIDE,
  SAA: SAA_EXAM_GUIDE,
};

export function getExamGuide(exam: ExamId): ExamGuide {
  return EXAM_GUIDES[exam];
}

export { CP_EXAM_GUIDE, SAA_EXAM_GUIDE };
