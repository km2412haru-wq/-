"use client";

import type { Company } from "@/lib/types";
import { cardCode } from "@/lib/cardCode";
import { getRarity, RARITY_LABELS } from "@/lib/rarity";
import { SEGMENT_ICONS, SEGMENT_LABELS } from "@/lib/segments";

export default function CompanyCard({
  company,
  flipped,
  selected,
  onToggleFlip,
  onToggleSelect,
  onRivalClick,
  cardRef,
  lookup,
}: {
  company: Company;
  flipped: boolean;
  selected: boolean;
  onToggleFlip: () => void;
  onToggleSelect: () => void;
  onRivalClick: (id: string) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  lookup: Map<string, Company>;
}) {
  const rarity = getRarity(company.revenueUsdB);
  const [colorA, colorB] = company.colors;

  return (
    <div className="cardOuter" ref={cardRef} id={`card-${company.id}`} data-selected={selected}>
      <div className="cardInner" data-flipped={flipped}>
        {/* ── 表面 ── */}
        <div
          className="cardFace cardFront"
          data-rarity={rarity}
          style={{ background: `linear-gradient(150deg, ${colorA} 0%, ${colorB} 100%)` }}
          role="button"
          tabIndex={0}
          onClick={onToggleFlip}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleFlip();
            }
          }}
          aria-label={`${company.nameJa}のカードをめくる`}
        >
          <div className="cardFrontTop">
            <span className="cardFlag">
              {company.flag} {company.country}
            </span>
            <span className="rarityBadge" data-rarity={rarity}>
              {rarity}
            </span>
          </div>

          <div className="cardCode">{cardCode(company.name)}</div>

          <div className="cardFrontBottom">
            <div className="cardNames">
              <span className="cardNameJa">{company.nameJa}</span>
              <span className="cardNameEn">{company.name}</span>
            </div>
            <div className="cardSegments">
              {company.segments.map((s) => (
                <span key={s} className="segmentIcon" title={SEGMENT_LABELS[s]}>
                  {SEGMENT_ICONS[s]}
                </span>
              ))}
            </div>
            <p className="cardTagline">{company.tagline}</p>
          </div>

          <span
            className="selectToggle"
            data-selected={selected}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label="対戦カードに選ぶ"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggleSelect();
              }
            }}
          >
            ⚔️
          </span>
        </div>

        {/* ── 裏面 ── */}
        <div
          className="cardFace cardBack"
          role="button"
          tabIndex={0}
          onClick={onToggleFlip}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleFlip();
            }
          }}
          aria-label={`${company.nameJa}のカードを閉じる`}
        >
          <span
            className="selectToggle selectToggleBack"
            data-selected={selected}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label="対戦カードに選ぶ"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggleSelect();
              }
            }}
          >
            ⚔️
          </span>

          <div className="cardBackHeader">
            <strong>{company.nameJa}</strong>
            <span className="cardBackSub">
              {company.hq}・{company.founded}年設立
            </span>
          </div>

          <div className="statGrid">
            <div className="statBox">
              <span className="statLabel">売上高目安</span>
              <span className="statValue">${company.revenueUsdB.toLocaleString("ja-JP")}B</span>
            </div>
            <div className="statBox">
              <span className="statLabel">営業利益率目安</span>
              <span className="statValue">{company.operatingMarginPct}%</span>
            </div>
          </div>

          <p className="cardBusinessModel">{company.businessModel}</p>

          <div className="cardStrengths">
            {company.strengths.map((s) => (
              <span key={s} className="strengthChip">
                {s}
              </span>
            ))}
          </div>

          {company.rivals.length > 0 && (
            <div className="cardRivals">
              <span className="cardRivalsLabel">🥊 主な競合</span>
              <div className="cardRivalsList">
                {company.rivals.map((rid) => {
                  const rival = lookup.get(rid);
                  return (
                    <span
                      key={rid}
                      className="rivalChip"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRivalClick(rid);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onRivalClick(rid);
                        }
                      }}
                    >
                      {rival ? `${rival.flag} ${rival.nameJa}` : rid}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <span className="rarityFootnote">{RARITY_LABELS[rarity]}</span>
        </div>
      </div>
    </div>
  );
}
