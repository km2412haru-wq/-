"use client";

import { useState } from "react";
import ExamSelector from "@/components/ExamSelector";
import QuestionCard from "@/components/QuestionCard";
import { getExamGuide } from "@/data/examGuides";
import type { ExamId, GeneratedQuestion } from "@/types/quiz";

export default function QuizPage() {
  const [exam, setExam] = useState<ExamId>("SAA");
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examGuide = getExamGuide(exam);

  async function fetchQuestion(nextExam: ExamId) {
    setLoading(true);
    setError(null);
    setSelectedIndex(null);
    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam: nextExam }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "問題の生成に失敗しました。");
      }
      setQuestion(data as GeneratedQuestion);
    } catch (err) {
      setQuestion(null);
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleExamChange(nextExam: ExamId) {
    setExam(nextExam);
    setQuestion(null);
    setError(null);
    setSelectedIndex(null);
  }

  return (
    <main className="page">
      <h1 className="pageTitle">クイズ演習</h1>
      <p className="pageSubtitle">資格を選んで「出題する」を押してください。</p>

      <ExamSelector value={exam} onChange={handleExamChange} disabled={loading} />

      {error && <div className="errorBox">{error}</div>}

      {!question && !loading && (
        <button
          type="button"
          className="primaryButton"
          onClick={() => fetchQuestion(exam)}
        >
          出題する
        </button>
      )}

      {loading && <div className="loadingBox">AIが問題を生成中です…</div>}

      {question && !loading && (
        <>
          <QuestionCard
            question={question}
            examGuide={examGuide}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
          {selectedIndex !== null && (
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                className="primaryButton"
                onClick={() => fetchQuestion(exam)}
              >
                次の問題
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
