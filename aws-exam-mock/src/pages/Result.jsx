import { getDifficulty, domainName } from '../data/exams.js'
import { scoreExam } from '../lib/exam.js'

export default function Result({ examSet, answers, difficultyId, onRestart }) {
  const { questions } = examSet
  const { results, correctCount, totalCount, domainBreakdown, predictedScore, passed, exam } =
    scoreExam(questions, answers)
  const difficulty = getDifficulty(difficultyId)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">結果発表</h1>
        <p className="mt-1 text-sm text-slate-500">
          {exam.code}（{exam.name}） ／ 難易度: {difficulty.label}
        </p>
      </header>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="text-sm font-medium text-slate-500">スコア</div>
        <div className="mt-1 text-3xl font-bold text-slate-900">
          {correctCount} / {totalCount} 問正解
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="text-sm font-medium text-slate-500">予想本番スコア（目安）</div>
          <div className="mt-1 text-5xl font-extrabold text-orange-600">{predictedScore}</div>
          <div className="text-xs text-slate-400">100〜1000点換算</div>
          <div
            className={`mt-3 inline-block rounded-full px-4 py-1 text-sm font-semibold ${
              passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            合格ライン {exam.passingScore}点 に対して{passed ? '到達しています' : '未達です'}
          </div>
        </div>

        <div className="mt-5 space-y-1.5 rounded-lg bg-slate-50 p-4 text-left text-xs leading-relaxed text-slate-500">
          <p>
            ・この予想スコアは「正答率 ×
            900点＋100点」の単純な線形換算です。本番はIRT（項目応答理論）による重み付け採点であり、仕組みが異なります。
          </p>
          <p>
            ・今回は「{difficulty.label}」レベルの問題のみで受験しているため、複数の難易度が混在する本番の点数とは乖離する可能性があります。
          </p>
          <p>
            ・合格ラインは{exam.passingScore}点（2026年8月時点のAWS公式情報）です。基準は変更される場合があるため、最新の値はAWS公式サイトでご確認ください。あくまで参考値であり、実際のスコアを保証するものではありません。
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">ドメイン別 正解/不正解</h2>
        <div className="space-y-3">
          {domainBreakdown.map((d) => (
            <div key={d.domainId}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span>{domainName(exam.id, d.domainId)}</span>
                <span>
                  {d.correct} / {d.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${d.total === 0 ? 0 : (d.correct / d.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">問題ごとの振り返り</h2>
        <div className="space-y-4">
          {results.map((r, i) => (
            <div
              key={r.question.id}
              className={`rounded-xl border p-4 shadow-sm ${
                r.correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    r.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  第{i + 1}問 ／ {r.correct ? '正解' : '不正解'}
                </span>
                <span className="text-slate-400">{domainName(exam.id, r.question.domain)}</span>
              </div>
              <p className="text-sm font-medium text-slate-900">{r.question.question}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {r.question.choices.map((choice, ci) => {
                  const isCorrectChoice = ci === r.question.correctIndex
                  const isSelectedChoice = ci === r.selectedIndex
                  return (
                    <li
                      key={ci}
                      className={`rounded-lg border px-3 py-2 ${
                        isCorrectChoice
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : isSelectedChoice
                            ? 'border-red-300 bg-red-50 text-red-900'
                            : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <span className="mr-2 font-semibold text-slate-400">
                        {String.fromCharCode(65 + ci)}
                      </span>
                      {choice}
                      {isCorrectChoice && <span className="ml-2 text-xs font-semibold">正解</span>}
                      {isSelectedChoice && !isCorrectChoice && (
                        <span className="ml-2 text-xs font-semibold">あなたの解答</span>
                      )}
                    </li>
                  )
                })}
                {r.selectedIndex === null && (
                  <li className="text-xs font-medium text-slate-400">
                    未回答（不正解として扱われています）
                  </li>
                )}
              </ul>
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                {r.question.explanation}
              </p>
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onRestart}
        className="w-full rounded-xl bg-orange-600 py-3 text-center font-semibold text-white transition hover:bg-orange-700"
      >
        もう一度受験する
      </button>
    </div>
  )
}
