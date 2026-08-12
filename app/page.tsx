import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import TodayOverview from "./components/TodayOverview";
import { summarizeMarket } from "./lib/market-overview";
import { getTodayOverviewData } from "./lib/today-overview-data";

const PIPELINE = [
  { number: "壹", title: "本命立盘", copy: "公历、时辰、性别与出生地生成四柱和五行分布。" },
  { number: "贰", title: "流日相逢", copy: "把今日干支、五行与近五千只股票出生标签逐一合盘。" },
  { number: "叁", title: "每日揭签", copy: "守护、上签、潜龙、同曜、补运与相冲各司其职。" },
] as const;

export default async function Home() {
  const user = await getChatGPTUser();
  const { fengShui, market } = await getTodayOverviewData();
  const marketSummary = summarizeMarket(market);
  const primaryHref = user ? "/dashboard" : chatGPTSignInPath("/dashboard");

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="brand-lockup" href="#top" aria-label="玄鉴首页">
          <span className="brand-seal">玄</span>
          <span>
            <strong>玄鉴</strong>
            <small>命理投研 · AShare Lab</small>
          </span>
        </a>
        <nav aria-label="主导航">
          <a href="#today-overview">今日</a>
          <a href="#approach">方法</a>
          <a href="#boundaries">边界</a>
          <a href="/demo">产品演示</a>
        </nav>
        <a className="nav-cta" href={primaryHref}>{user ? "进入工作台" : "登录体验"}<span>↗</span></a>
      </header>

      <section className="landing-hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow"><i />本命盘 × 今日流日 × 股票出生盘</span>
          <h1>一命一盘，<br />每日寻<em>缘</em></h1>
          <p>
            每日揭开六枚不同职责的 A 股玄签，让本命、流日与股票标签相遇。
            收藏有缘之签，回看三十日星轨；主打传统文化趣味，不预测涨跌。
          </p>
          <div className="hero-actions">
            <a className="primary-link" href={primaryHref}>{user ? "继续我的命盘" : "登录生成命盘"}<span>→</span></a>
            <a className="secondary-link" href="/demo"><span>◉</span>先看完整演示</a>
          </div>
          <div className="trust-row">
            <span>命理共振 <b>70%</b></span>
            <i />
            <span>小众探索 <b>15%</b></span>
            <i />
            <span>用户缘感上限 <b>10%</b></span>
          </div>
        </div>

        <div className="hero-orbit" aria-label="每日玄签罗盘预览">
          <div className="orbit-halo halo-one" />
          <div className="orbit-halo halo-two" />
          <div className="hero-compass">
            <span className="hero-direction north">坎 · 水</span>
            <span className="hero-direction east">震 · 木</span>
            <span className="hero-direction south">离 · 火</span>
            <span className="hero-direction west">兑 · 金</span>
            <div className="hero-wheel">
              <div><small>本命</small><strong>玄鉴</strong><span>流日</span></div>
            </div>
          </div>
          <div className="floating-card card-growth"><small>今日流日</small><strong>{fengShui.dayPillar} · {fengShui.dayElement}</strong><span>{fengShui.direction}取气 · {fengShui.favorable.split(" · ")[0]}</span></div>
          <div className="floating-card card-score"><small>大盘快照</small><strong>{marketSummary.title}</strong><span>{market.status} · 行情与取象分栏</span></div>
          <div className="floating-card card-risk"><small>六签成局</small><strong>守 · 吉 · 潜</strong><span>曜 · 补 · 冲</span></div>
        </div>
      </section>

      <TodayOverview fengShui={fengShui} market={market} />

      <section className="approach-section" id="approach">
        <div className="approach-heading">
          <span className="section-kicker">一套可解释的双层引擎</span>
          <h2>本命负责定下底色，<br />流日负责每天变局</h2>
          <p>同一命盘同一天始终得到同一签局，反馈只会轻轻影响未来，不改当天结果。</p>
        </div>
        <div className="pipeline-grid">
          {PIPELINE.map((item) => (
            <article key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <i />
            </article>
          ))}
        </div>
      </section>

      <section className="boundary-section" id="boundaries">
        <div className="boundary-seal">衡</div>
        <div>
          <span className="section-kicker">产品原则</span>
          <h2>不预测涨跌，<br />不让娱乐伪装成承诺。</h2>
        </div>
        <p>
          风水命理缺乏可重复验证的金融预测证据。玄鉴把股票呈现为文化娱乐命签；
          “有缘”“相冲”都不是买入、卖出或收益判断，请勿据此下注。
        </p>
        <a href="/demo">查看方法如何落在产品里 →</a>
      </section>

      <footer className="landing-footer">
        <span>玄鉴 · AShare Lab</span>
        <p>传统文化娱乐体验，不构成投资建议。</p>
        <a href={primaryHref}>{user ? "进入工作台" : "登录开始"} ↗</a>
      </footer>
    </main>
  );
}
