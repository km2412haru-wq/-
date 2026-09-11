"use client";

import PosBadge from "@/components/PosBadge";
import { IDIOM_CLASS, IDIOM_LABEL } from "@/lib/partOfSpeech";
import type { WordEntry } from "@/types/word";

interface Group {
  groupId: string;
  root: WordEntry;
  derivatives: WordEntry[];
}

function buildGroups(words: WordEntry[]): Group[] {
  const byGroup = new Map<string, WordEntry[]>();
  for (const w of words) {
    const list = byGroup.get(w.groupId) ?? [];
    list.push(w);
    byGroup.set(w.groupId, list);
  }

  const groups: Group[] = [];
  for (const [groupId, members] of byGroup) {
    const root = members.find((m) => m.isRoot) ?? members[0];
    const derivatives = members
      .filter((m) => m.id !== root.id)
      .sort((a, b) => a.word.localeCompare(b.word));
    groups.push({ groupId, root, derivatives });
  }

  groups.sort((a, b) => b.root.createdAt.localeCompare(a.root.createdAt));
  return groups;
}

export default function GroupList({
  words,
  onToggleMemorized,
}: {
  words: WordEntry[];
  onToggleMemorized: (id: string) => void;
}) {
  const groups = buildGroups(words);

  if (groups.length === 0) {
    return <p className="empty-state">登録した単語がまだありません。上のフォームから追加してみましょう。</p>;
  }

  return (
    <div>
      {groups.map((g) => (
        <div key={g.groupId} className="group-block">
          <div className="group-root-row">
            <label className="memorized-toggle">
              <input
                type="checkbox"
                checked={g.root.memorized}
                onChange={() => onToggleMemorized(g.root.id)}
              />
              <span className={`word-title ${g.root.memorized ? "memorized" : ""}`}>
                {g.root.word}
              </span>
            </label>
            {g.root.entryType === "idiom" ? (
              <span className={`pos-badge ${IDIOM_CLASS}`}>{IDIOM_LABEL}</span>
            ) : (
              <PosBadge partOfSpeech={g.root.partOfSpeech} />
            )}
            <span className="word-meaning">{g.root.meaning}</span>
            {g.root.entryType !== "idiom" && <span className="root-badge">起点</span>}
          </div>

          {g.root.entryType === "idiom" ? null : g.derivatives.length === 0 ? (
            <p className="group-empty">派生語はまだ登録されていません。</p>
          ) : (
            <div className="group-derivatives">
              {g.derivatives.map((d) => (
                <div key={d.id} className="group-derivative-row">
                  <label className="memorized-toggle">
                    <input
                      type="checkbox"
                      checked={d.memorized}
                      onChange={() => onToggleMemorized(d.id)}
                    />
                    <span className={d.memorized ? "memorized" : ""}>{d.word}</span>
                  </label>
                  <PosBadge partOfSpeech={d.partOfSpeech} />
                  <span className="word-meaning">{d.meaning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
