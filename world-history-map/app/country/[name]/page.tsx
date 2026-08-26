import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import {
  fetchCountryHistoryDetail,
  fetchTopicSummary,
  TOPIC_LABELS,
  type Topic,
  type TopicSummary,
} from "@/lib/wikipedia";
import { fetchCountryBasicInfo, formatPopulationJa } from "@/lib/countryInfo";
import { buildExplainPrompt } from "@/lib/askClaude";
import type { WorldMapData } from "@/lib/worldMapTypes";
import AskClaudeButton from "@/components/AskClaudeButton";
import AskClaudeBox from "@/components/AskClaudeBox";

const TOPICS: Topic[] = ["ethnic", "food", "industry"];

async function findAlpha2(nameJa: string): Promise<string | null> {
  const filePath = path.join(process.cwd(), "public", "world-map.json");
  const raw = await readFile(filePath, "utf-8");
  const mapData: WorldMapData = JSON.parse(raw);
  return mapData.shapes.find((s) => s.nameJa === nameJa)?.alpha2 ?? null;
}

export default async function CountryHistoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const nameJa = decodeURIComponent(name);
  const alpha2 = await findAlpha2(nameJa);

  const [detail, basicInfo, ...topicSummaries] = await Promise.all([
    fetchCountryHistoryDetail(nameJa),
    alpha2 ? fetchCountryBasicInfo(alpha2) : Promise.resolve(null),
    ...TOPICS.map((topic) => fetchTopicSummary(nameJa, topic)),
  ]);

  const topics = new Map<Topic, TopicSummary | null>(
    TOPICS.map((topic, i) => [topic, topicSummaries[i]])
  );

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

      {(basicInfo || alpha2) && (
        <div className="infoStrip">
          {basicInfo?.flagUrl && (
            // Plain <img>, not next/image — a handful of small flag SVGs
            // per page view, no benefit from the optimization pipeline.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="flagImg" src={basicInfo.flagUrl} alt={`${nameJa}の国旗`} />
          )}
          <div className="infoFacts">
            <div className="infoFact">
              <span className="infoFactLabel">首都</span>
              <span className="infoFactValue">
                {basicInfo?.capital?.length ? basicInfo.capital.join("、") : "不明"}
              </span>
            </div>
            <div className="infoFact">
              <span className="infoFactLabel">人口</span>
              <span className="infoFactValue">
                {basicInfo ? formatPopulationJa(basicInfo.population) : "不明"}
              </span>
            </div>
          </div>
        </div>
      )}

      {!detail && (
        <p className="wmPanelStatus">
          歴史情報を取得できませんでした。時間をおいて試すか、
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
              <AskClaudeButton prompt={buildExplainPrompt(nameJa, "概要", detail.intro)} />
            </section>
          )}

          {detail.eras.length === 0 && !detail.intro && (
            <p className="wmPanelStatus">この記事からは時代ごとの情報を抽出できませんでした。</p>
          )}

          {detail.eras.map((group) => {
            const groupText = group.entries.map((e) => e.text).join("\n\n");
            return (
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
                <AskClaudeButton
                  prompt={buildExplainPrompt(nameJa, group.label.replace(/^\S+\s/, ""), groupText)}
                />
              </section>
            );
          })}

          <div className="eraSection">
            <a className="wmReadMore" href={detail.pageUrl} target="_blank" rel="noopener noreferrer">
              Wikipediaで全文を読む →
            </a>
          </div>
        </>
      )}

      {TOPICS.map((topic) => {
        const summary = topics.get(topic);
        return (
          <section key={topic} className="eraSection">
            <h2 className="eraLabel">{TOPIC_LABELS[topic]}</h2>
            {summary ? (
              <>
                <p className="eraText">{summary.extract}</p>
                <a
                  className="wmReadMore"
                  href={summary.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  「{summary.title}」の記事を読む →
                </a>
                <div style={{ marginTop: 10 }}>
                  <AskClaudeButton
                    prompt={buildExplainPrompt(nameJa, TOPIC_LABELS[topic].replace(/^\S+\s/, ""), summary.extract)}
                  />
                </div>
              </>
            ) : (
              <p className="wmPanelStatus">関連する記事が見つかりませんでした。</p>
            )}
          </section>
        );
      })}

      <AskClaudeBox countryName={nameJa} />

      <footer className="footer">
        国旗・首都・人口は REST Countries
        の公開データ、歴史情報はWikipedia日本語版から取得しています。時代の区分（原始・古代／中世／近代・現代）や民族史・食の歴史・産業史は、記事の見出しやタイトルからキーワードで自動推定したものです。国によっては正確に分類・取得できない場合があります。
      </footer>
    </main>
  );
}
