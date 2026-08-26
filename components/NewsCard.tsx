import { CATEGORY_LABELS } from "@/lib/categorize";
import { ORIGIN_LABELS } from "@/lib/companyOrigin";
import { formatRelativeTime } from "@/lib/format";
import type { NewsItem } from "@/lib/types";

export default function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="card">
      <div className="cardTop">
        <span className="source">{item.source}</span>
        <span className="date">{formatRelativeTime(item.publishedAt)}</span>
      </div>
      <a
        className="cardTitle"
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.title}
      </a>
      {item.summary && <p className="summary">{item.summary}</p>}
      <div className="badges">
        {item.categories.map((cat) => (
          <span key={cat} className="badge" data-cat={cat}>
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
        {item.origin.map((origin) => (
          <span key={origin} className="badge" data-origin={origin}>
            {ORIGIN_LABELS[origin]}
          </span>
        ))}
      </div>
    </article>
  );
}
