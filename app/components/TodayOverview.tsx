import type { DailyFengShuiOverview } from "@/app/lib/daily-overview";
import { summarizeMarket, type MarketSnapshot } from "@/app/lib/market-overview";

type TodayOverviewProps = {
  fengShui: DailyFengShuiOverview;
  market: MarketSnapshot;
  compact?: boolean;
};

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatSnapshotTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatLevel(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}%`;
  return `${value.toFixed(2)}%`;
}

export default function TodayOverview({ fengShui, market, compact = false }: TodayOverviewProps) {
  const marketSummary = summarizeMarket(market);
  const isTodaySnapshot = market.tradingDate === fengShui.dateKey;

  return (
    <section className={`today-overview${compact ? " today-overview--compact" : ""}`} id="today-overview" aria-labelledby="today-overview-title">
      <header className="today-overview-heading">
        <div>
          <span className="section-kicker">北京时间 · 每日一览</span>
          <h2 id="today-overview-title">先看今日气象，再看大盘事实</h2>
        </div>
        <p>风水取象与行情数据彼此独立；一边供文化娱乐，一边只记录已经发生的市场变化。</p>
      </header>

      <div className="today-overview-grid">
        <article className="today-overview-card fengshui-overview-card">
          <header>
            <span>流日风水</span>
            <small>{formatDate(fengShui.dateKey)}</small>
          </header>
          <div className="fengshui-overview-main">
            <span className={`element-orb element-${fengShui.dayElement}`}>{fengShui.dayPillar}</span>
            <div>
              <small>{fengShui.dayElement}气 · {fengShui.direction}</small>
              <h3>{fengShui.headline}</h3>
              <p>{fengShui.summary}</p>
            </div>
          </div>
          <dl className="fengshui-facts">
            <div><dt>取气方位</dt><dd>{fengShui.direction}</dd></div>
            <div><dt>当值时辰</dt><dd>{fengShui.activeTime}</dd></div>
          </dl>
          <div className="fengshui-actions">
            <p><b>宜</b>{fengShui.favorable}</p>
            <p><b>忌</b>{fengShui.avoid}</p>
          </div>
        </article>

        <article className={`today-overview-card market-overview-card market-${marketSummary.direction}`}>
          <header>
            <span>{isTodaySnapshot ? "今日大盘" : "最近大盘快照"}</span>
            <small>{market.status} · {formatSnapshotTime(market.marketUpdatedAt)}</small>
          </header>
          <div className="market-overview-intro">
            <small>{formatDate(market.tradingDate)}</small>
            <h3>{marketSummary.title}</h3>
            <p>{marketSummary.description}</p>
          </div>
          <div className="market-index-grid" aria-label="核心指数快照">
            {market.indices.map((index) => {
              const direction = index.changePercent > 0 ? "up" : index.changePercent < 0 ? "down" : "flat";
              return (
                <div className={direction} key={index.code}>
                  <span>{index.name}</span>
                  <strong>{formatLevel(index.level)}</strong>
                  <b>{formatChange(index.changePercent)}</b>
                </div>
              );
            })}
          </div>
          <footer>
            <span>数据：<a href={market.source.url} target="_blank" rel="noreferrer">{market.source.name}</a></span>
            <small>延时或收盘快照 · 不构成投资建议</small>
          </footer>
        </article>
      </div>
    </section>
  );
}
