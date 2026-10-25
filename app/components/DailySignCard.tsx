"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
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
  compactDeck: boolean;
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

const COMPACT_DECK_QUERY = "(max-width: 640px)";

function subscribeCompactDeck(onChange: () => void): () => void {
  const query = window.matchMedia(COMPACT_DECK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** 窄屏翻牌改用小牌阵 + 放大浮层；服务端渲染按宽屏处理。 */
export function useCompactDeck(): boolean {
  return useSyncExternalStore(
    subscribeCompactDeck,
    () => window.matchMedia(COMPACT_DECK_QUERY).matches,
    () => false,
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 浮层内这些元素自行处理点击，其余位置轻触即收起签卡
const FOCUS_INTERACTIVE = "button, a, summary, input, select, textarea, label, .stock-facts-scroll";

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
  compactDeck,
  revealed,
  feedback,
  onReveal,
  onFeedback,
}: DailySignCardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLButtonElement>(null);
  const focusDialogRef = useRef<HTMLDialogElement>(null);
  const focusPanelRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
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
        {/* 独立滚动区域需要键盘焦点，供方向键和 PageDown 阅读完整资料。 */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="stock-facts-scroll" role="region" aria-label={`${item.name}静态事实资料，可滚动查看`} tabIndex={0}>
        <div className="stock-facts-grid">
          <span><small>行业</small>{stockIndustry(item)}</span>
          <span><small>板块</small>{stockBoard(item)}</span>
          <span><small>市值</small>{formatMarketCapYi(item.marketCap)}</span>
          <span><small>营收</small>{item.revenue != null ? `${formatRevenueYuan(item.revenue)} · ${formatRevenuePeriod(item.revenueReportDate)}` : "—"}</span>
          <span><small>当日涨跌</small>{formatSignedPercent(item.changePercent)}</span>
          <span><small>5日收盘涨跌 · 未复权</small>{formatSignedPercent(item.change5Percent)}</span>
          <span><small>上市</small>{item.listingDate ?? "—"}</span>
          <span><small>探索度</small>{item.explorationScore}</span>
        </div>
        {item.businessProfile && <p className="stock-facts-profile">{item.businessProfile}</p>}
        </div>
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

  if (compactDeck) {
    // 以牌位中心为原点等比缩放，让浮层签卡看起来从小牌中长出、再收回小牌
    const slotTransform = (): string | null => {
      const slot = slotRef.current?.getBoundingClientRect();
      const panel = focusPanelRef.current?.getBoundingClientRect();
      if (!slot || !panel || panel.width === 0) return null;
      const dx = slot.left + slot.width / 2 - (panel.left + panel.width / 2);
      const dy = slot.top + slot.height / 2 - (panel.top + panel.height / 2);
      return `translate(${dx}px, ${dy}px) scale(${slot.width / panel.width})`;
    };

    const expand = () => {
      const dialog = focusDialogRef.current;
      if (!dialog || dialog.open) return;
      const firstReveal = !revealed;
      if (firstReveal) onReveal();
      dialog.showModal();
      dialog.scrollTop = 0;
      setExpanded(true);
      const panel = focusPanelRef.current;
      const from = slotTransform();
      if (!panel || !from || prefersReducedMotion()) return;
      panel.animate(
        [
          { transform: `perspective(1400px) ${from} rotateY(${firstReveal ? 90 : 0}deg)`, opacity: 0.35 },
          { transform: "perspective(1400px) translate(0px, 0px) scale(1) rotateY(0deg)", opacity: 1 },
        ],
        { duration: firstReveal ? 640 : 440, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.04)" },
      );
    };

    const collapse = () => {
      const dialog = focusDialogRef.current;
      const panel = focusPanelRef.current;
      if (!dialog?.open || closingRef.current) return;
      const to = slotTransform();
      if (!panel || !to || prefersReducedMotion()) {
        dialog.close();
        return;
      }
      closingRef.current = true;
      dialog.classList.add("is-closing");
      const animation = panel.animate(
        [
          { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
          { transform: to, opacity: 0.2 },
        ],
        { duration: 380, easing: "cubic-bezier(0.55, 0, 0.35, 1)", fill: "forwards" },
      );
      animation.onfinish = () => {
        dialog.close();
        animation.cancel();
        dialog.classList.remove("is-closing");
        closingRef.current = false;
      };
    };

    return (
      <div className={`sign-slot${item.isPositive ? "" : " clash-back"}${revealed ? " revealed" : ""}${expanded ? " is-lifted" : ""}`}>
        <button
          ref={slotRef}
          type="button"
          className="sign-slot-button"
          aria-label={revealed ? `展开${item.roleLabel}：${item.name}` : `翻开${item.roleLabel}`}
          aria-haspopup="dialog"
          onClick={expand}
        >
          <span className="flip-back-seal" aria-hidden="true">{ROLE_GLYPHS[item.role]}</span>
          {revealed ? (
            <>
              <strong>{item.name}</strong>
              <small>{item.roleLabel} · {grade}</small>
            </>
          ) : (
            <>
              <strong>{item.roleLabel}</strong>
              <small>轻触翻牌</small>
            </>
          )}
        </button>
        {/* 轻触空白收起只是触屏便捷手势；键盘用户使用 Esc 或“收起”按钮。 */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <dialog
          ref={focusDialogRef}
          className="sign-focus"
          aria-label={`${item.roleLabel}：${item.name}`}
          onCancel={(event) => {
            event.preventDefault();
            collapse();
          }}
          onClose={() => setExpanded(false)}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest(FOCUS_INTERACTIVE)) return;
            collapse();
          }}
        >
          <div ref={focusPanelRef} className="sign-focus-panel">
            <div className="sign-focus-bar">
              <small>轻触空白处收起</small>
              <button type="button" className="sign-focus-close" onClick={collapse}>收起</button>
            </div>
            {card}
          </div>
        </dialog>
      </div>
    );
  }
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
