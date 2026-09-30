import {
  FERRITIN_ESR_EXCEED_NOTICE,
  computeFerritinEsrRatio,
  formatRatio,
} from "@/lib/ferritinEsrRatio";

interface Props {
  labs: { ferritinNgMl?: number; esrMmH?: number } | undefined;
}

/**
 * フェリチン/ESR比の参考表示。赤いF10バナーとは別に、控えめな中立表示で出す
 * (出典が小児の研究で、成人AOSDでの有効性が未確認のため)。
 */
export default function FerritinEsrRatioNote({ labs }: Props) {
  const r = computeFerritinEsrRatio(labs);
  if (!r) return null;

  if (!r.exceeds) {
    return (
      <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
        フェリチン/ESR比: {formatRatio(r.ratio)}(参考値)
      </div>
    );
  }

  return (
    <div className="status-note" style={{ padding: 8, marginTop: 6, borderRadius: 8 }} role="note">
      <strong>フェリチン/ESR比: {formatRatio(r.ratio)}(参考値)</strong>
      <div style={{ marginTop: 4 }}>{FERRITIN_ESR_EXCEED_NOTICE}</div>
    </div>
  );
}
