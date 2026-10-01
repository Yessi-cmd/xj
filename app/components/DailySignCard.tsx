"use client";

import { useRef, type CSSProperties } from "react";
import {
  scoreGrade,
  type DailyRecommendation,
  type FeedbackAction,
} from "@/app/lib/mystic-ranking";
import {
  formatMarketCapYi,
  formatRevenuePeriod,
  formatRevenueYuan,
  formatSignedPercent,
  formatSnapshotDate,
} from "@/app/lib/stock-display";

type DailySignCardProps = {
  item: DailyRecommendation;
  index: number;
  flipOn: boolean;
  revealed: boolean;
  feedback?: FeedbackAction;
  onReveal: () => void;
  onFeedback: (action: FeedbackAction) => void;
};

const ROLE_GLYPHS = {
  guardian: "守",
  today: "吉",
  hidden: "潜",
  sameStar: "曜",
  remedy: "补",
  clash: "冲",
} as const;

const EXCHANGE_LABELS: Record<DailyRecommendation["exchange"], string> = {
  SH: "沪市",
  SZ: "深市",
  BJ: "北交所",
};

function stockIndustry(item: DailyRecommendation): string {
  const csrc = item.industryCsrc?.split("-");
  if (csrc && csrc.length > 1 && csrc[1]) return csrc[1];
  if (item.industryCsrc) return item.industryCsrc;
  return item.industry?.replace(/^[A-Z]\s*/, "") || "—";
}

function stockBoard(item: DailyRecommendation): string {
  return item.exchangeDirection
    ? `${EXCHANGE_LABELS[item.exchange]} · ${item.exchangeDirection}`
    : EXCHANGE_LABELS[item.exchange];
}

export default function DailySignCard({
  item,
  index,
  flipOn,
  revealed,
  feedback,
  onReveal,
  onFeedback,
}: DailySignCardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const grade = scoreGrade(item.combinedScore);
  const isFlipped = !flipOn || revealed;
  const card = (
    <article
      className={`daily-sign-card ${item.isPositive ? "" : "clash-sign"}`}
      style={{ "--reveal-index": index } as CSSProperties}
    >
      <div className="sign-card-top">
        <span className="role-seal">{ROLE_GLYPHS[item.role]}</span>
        <div><small>{item.roleLabel}</small><strong>{item.isPositive ? "此签可观" : "今日宜远观"}</strong></div>
        <span className={`score-badge grade-${grade}`} aria-label={`缘分分 ${item.combinedScore}，评级 ${grade} 级`}>
          <em>{grade}</em><b>{item.combinedScore}</b><small>缘分分</small>
        </span>
      </div>
      <div className="stock-identity"><span>{item.kind}</span><h3>{item.name}</h3><small>{item.code} · {item.theme}</small></div>
      <p>{item.rationale}</p>
      <div className="mystic-tags">{item.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <details className="stock-facts">
        <summary>
          <span className="facts-toggle-copy"><strong>静态事实资料</strong><small>{item.factsDate ? `${formatSnapshotDate(item.factsDate)} 快照` : "暂无快照日期"}</small></span>
          <b className="facts-toggle-action"><span className="facts-open-label">收起</span><span className="facts-closed-label">展开</span><i aria-hidden="true">⌄</i></b>
        </summary>
        <div className="stock-facts-grid">
          <span><small>行业</small>{stockIndustry(item)}</span>
          <span><small>板块</small>{stockBoard(item)}</span>
          <span><small>市值</small>{formatMarketCapYi(item.marketCap)}</span>
          <span><small>营收</small>{item.revenue != null ? `${formatRevenueYuan(item.revenue)} · ${formatRevenuePeriod(item.revenueReportDate)}` : "—"}</span>
          <span><small>当日涨跌</small>{formatSignedPercent(item.changePercent)}</span>
          <span><small>5日涨跌</small>{formatSignedPercent(item.change5Percent)}</span>
          <span><small>上市</small>{item.listingDate ?? "—"}</span>
          <span><small>探索度</small>{item.explorationScore}</span>
        </div>
        {item.businessProfile && <p className="stock-facts-profile">{item.businessProfile}</p>}
      </details>
      <div className="score-script"><span>本命 {item.natalScore}</span><span>流日 {item.dailyScore}</span><span>缘感 {item.affinityScore}</span></div>
      <div className="feedback-row" aria-label={`${item.name}缘分反馈`}>
        <button type="button" className={feedback === "affinity" ? "selected" : ""} onClick={() => onFeedback("affinity")}>♡ 有缘</button>
        <button type="button" className={feedback === "neutral" ? "selected" : ""} onClick={() => onFeedback("neutral")}>○ 无感</button>
        <button type="button" className={feedback === "avoid" ? "selected avoid" : ""} onClick={() => onFeedback("avoid")}>× 避开</button>
      </div>
    </article>
  );

  if (!flipOn) return card;
  return (
    <div className={`flip-card-wrap${item.isPositive ? "" : " clash-back"}${isFlipped ? " flipped" : ""}`}>
      <div className="flip-card-inner">
        <button
          type="button"
          className="flip-card-back"
          aria-label={`翻开${item.roleLabel}`}
          onClick={() => {
            onReveal();
            // 牌背翻开后即隐藏，把焦点交给牌面，避免键盘用户丢失位置
            window.requestAnimationFrame(() => frontRef.current?.focus({ preventScroll: true }));
          }}
        >
          <span className="flip-back-seal" aria-hidden="true">{ROLE_GLYPHS[item.role]}</span>
          <strong>{item.roleLabel}</strong>
          <small>轻触翻牌</small>
        </button>
        <div ref={frontRef} className="flip-card-front" tabIndex={-1}>{card}</div>
      </div>
    </div>
  );
}
