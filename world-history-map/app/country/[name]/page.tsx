import Link from "next/link";
import { fetchCountryHistoryDetail } from "@/lib/wikipedia";

export default async function CountryHistoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const nameJa = decodeURIComponent(name);
  const detail = await fetchCountryHistoryDetail(nameJa);

  return (
    <main className="page">
      <div className="header">
        <div>
          <Link href="/" className="backLink">
            ← 地図に戻る
          </Link>
          <h1 className="title" style={{ marginTop: 8 }}>
            {nameJa}
          </h1>
        </div>
      </div>

      {!detail && (
        <p className="wmPanelStatus">
          情報を取得できませんでした。時間をおいて試すか、
          <a
            className="wmReadMore"
            href={`https://ja.wikipedia.org/wiki/${encodeURIComponent(nameJa)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Wikipediaで直接検索
          </a>
          してください。
        </p>
      )}

      {detail && (
        <>
          {!detail.isHistorySpecific && (
            <p className="wmPanelNote">
              「{nameJa}の歴史」の専門記事が見つからなかったため、国の概要記事から時代を推定して表示しています。
            </p>
          )}

          {detail.intro && (
            <section className="eraSection">
              <h2 className="eraLabel">📖 概要</h2>
              <p className="eraText">{detail.intro}</p>
            </section>
          )}

          {detail.eras.length === 0 && !detail.intro && (
            <p className="wmPanelStatus">この記事からは時代ごとの情報を抽出できませんでした。</p>
          )}

          {detail.eras.map((group) => (
            <section key={group.era} className="eraSection">
              <h2 className="eraLabel">{group.label}</h2>
              {group.entries.map((entry, i) => (
                <div key={i} className="eraEntry">
                  {entry.heading !== group.label.replace(/^\S+\s/, "") && (
                    <h3 className="eraEntryHeading">{entry.heading}</h3>
                  )}
                  <p className="eraText">{entry.text}</p>
                </div>
              ))}
            </section>
          ))}

          <a
            className="wmReadMore"
            href={detail.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Wikipediaで全文を読む →
          </a>
        </>
      )}

      <footer className="footer">
        時代の区分（原始・古代／中世／近代・現代）はWikipedia記事の見出しから自動推定したものです。国によっては正確に分類できない場合があります。
      </footer>
    </main>
  );
}
