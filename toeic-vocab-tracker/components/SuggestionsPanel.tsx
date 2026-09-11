"use client";

import { POS_LABEL } from "@/lib/partOfSpeech";
import { PARTS_OF_SPEECH, type EditableSuggestion, type PartOfSpeech } from "@/types/word";

export default function SuggestionsPanel({
  rootWord,
  loading,
  error,
  suggestions,
  onAccept,
  onReject,
  onEdit,
  onRetry,
  onClose,
}: {
  rootWord: string;
  loading: boolean;
  error: string | null;
  suggestions: EditableSuggestion[];
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
  onEdit: (key: string, changes: Partial<EditableSuggestion>) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="panel">
      <p className="panel-title">「{rootWord}」の派生語候補(AI提案)</p>

      {loading && (
        <p className="loading-text">
          <span className="spinner" aria-hidden="true" />
          Claudeが派生語を考えています…
        </p>
      )}

      {!loading && error && (
        <>
          <p className="error-text">{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={onRetry}>
            再試行
          </button>
        </>
      )}

      {!loading && !error && suggestions.length === 0 && (
        <p className="loading-text">派生語の候補は見つかりませんでした。</p>
      )}

      {!loading &&
        !error &&
        suggestions.map((s) => (
          <div key={s.key} className={`suggestion-row status-${s.status}`}>
            <span className="suggestion-word">{s.word}</span>
            <input
              value={s.meaning}
              onChange={(e) => onEdit(s.key, { meaning: e.target.value })}
              disabled={s.status !== "pending"}
              aria-label={`${s.word}の意味`}
            />
            <select
              value={s.partOfSpeech}
              onChange={(e) => onEdit(s.key, { partOfSpeech: e.target.value as PartOfSpeech })}
              disabled={s.status !== "pending"}
              aria-label={`${s.word}の品詞`}
            >
              {PARTS_OF_SPEECH.map((p) => (
                <option key={p} value={p}>
                  {POS_LABEL[p]}
                </option>
              ))}
            </select>
            <div className="suggestion-actions">
              {s.status === "pending" ? (
                <>
                  <button className="btn btn-success btn-sm" onClick={() => onAccept(s.key)}>
                    登録する
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => onReject(s.key)}>
                    却下
                  </button>
                </>
              ) : (
                <span className="word-meta">
                  {s.status === "accepted" ? "登録済み" : "却下しました"}
                </span>
              )}
            </div>
          </div>
        ))}

      {!loading && (
        <div className="word-card-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
