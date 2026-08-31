"use client";

import type { ExamId } from "@/types/quiz";

const EXAM_LABELS: Record<ExamId, string> = {
  CP: "Cloud Practitioner",
  SAA: "Solutions Architect Associate",
};

export default function ExamSelector({
  value,
  onChange,
  disabled,
}: {
  value: ExamId;
  onChange: (exam: ExamId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="examSelector">
      {(Object.keys(EXAM_LABELS) as ExamId[]).map((exam) => (
        <button
          key={exam}
          type="button"
          data-active={value === exam}
          disabled={disabled}
          onClick={() => onChange(exam)}
        >
          {EXAM_LABELS[exam]}
        </button>
      ))}
    </div>
  );
}
