"use client";

import type { ExamGuide, GeneratedQuestion } from "@/types/quiz";

export default function QuestionCard({
  question,
  examGuide,
  selectedIndex,
  onSelect,
}: {
  question: GeneratedQuestion;
  examGuide: ExamGuide;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const answered = selectedIndex !== null;
  const domain = examGuide.domains.find((d) => d.id === question.domain);
  const isCorrect = answered && selectedIndex === question.correctIndex;

  return (
    <div className="card">
      <p className="meta">
        {examGuide.name}
        {domain ? ` ／ ドメイン${domain.id}: ${domain.name}` : ""}
        {question.topics.length > 0 ? ` ／ ${question.topics.join("・")}` : ""}
      </p>

      <p className="questionText">{question.question}</p>

      {answered && (
        <p className="resultBanner" data-correct={isCorrect}>
          {isCorrect ? "正解です" : "不正解です"}
        </p>
      )}

      <div className="choiceList">
        {question.choices.map((choice, index) => {
          let state: "default" | "correct" | "incorrect" = "default";
          if (answered) {
            if (index === question.correctIndex) {
              state = "correct";
            } else if (index === selectedIndex) {
              state = "incorrect";
            }
          }

          return (
            <div key={index}>
              <button
                type="button"
                className="choiceButton"
                data-state={state}
                disabled={answered}
                onClick={() => onSelect(index)}
              >
                {String.fromCharCode(65 + index)}. {choice}
              </button>
              {answered && (
                <div className="explanationBlock">
                  {question.explanationByChoice[index]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
