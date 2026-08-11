import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";

const PIPELINE = [
  { number: "壹", title: "命理罗盘", copy: "公历、时辰、性别与出生地生成四柱和五行分布。" },
  { number: "贰", title: "偏好译码", copy: "把喜用倾向翻译为质量、成长、价值、动量、低波权重。" },
  { number: "叁", title: "量化约束", copy: "接入 AShare 可交易池、行业中性、仓位上限和风险控制。" },
] as const;

export default async function Home() {
  const user = await getChatGPTUser();
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
          <a href="#approach">方法</a>
          <a href="#boundaries">边界</a>
          <a href="/demo">产品演示</a>
        </nav>
        <a className="nav-cta" href={primaryHref}>{user ? "进入工作台" : "登录体验"}<span>↗</span></a>
      </header>

      <section className="landing-hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow"><i />传统命理 × 现代量化</span>
          <h1>观五行之势，<br />守投资之<em>衡</em></h1>
          <p>
            玄鉴把传统命理作为投资偏好的叙事入口，把 AShare 量化系统作为最终纪律。
            看见自己的风格，也看见每一条推荐背后的数据理由。
          </p>
          <div className="hero-actions">
            <a className="primary-link" href={primaryHref}>{user ? "继续我的命盘" : "登录生成命盘"}<span>→</span></a>
            <a className="secondary-link" href="/demo"><span>◉</span>先看完整演示</a>
          </div>
          <div className="trust-row">
            <span>量化权重主导 <b>85%</b></span>
            <i />
            <span>命理偏好上限 <b>15%</b></span>
            <i />
            <span>明确风险边界</span>
          </div>
        </div>

        <div className="hero-orbit" aria-label="五行量化映射预览">
          <div className="orbit-halo halo-one" />
          <div className="orbit-halo halo-two" />
          <div className="hero-compass">
            <span className="hero-direction north">坎 · 水</span>
            <span className="hero-direction east">震 · 木</span>
            <span className="hero-direction south">离 · 火</span>
            <span className="hero-direction west">兑 · 金</span>
            <div className="hero-wheel">
              <div><small>命理</small><strong>玄鉴</strong><span>量化</span></div>
            </div>
          </div>
          <div className="floating-card card-growth"><small>喜用倾向</small><strong>木 · 生发</strong><span>成长因子 1.30×</span></div>
          <div className="floating-card card-score"><small>组合评分</small><strong>87</strong><span>量化 85% + 命理 15%</span></div>
          <div className="floating-card card-risk"><small>风险纪律</small><strong>行业 ≤ 25%</strong><span>个股 ≤ 10%</span></div>
        </div>
      </section>

      <section className="approach-section" id="approach">
        <div className="approach-heading">
          <span className="section-kicker">一套可解释的双层引擎</span>
          <h2>命理负责“看见自己”，<br />量化负责“约束选择”</h2>
          <p>传统文化提供更有人味的入口，数据系统保持每一次筛选可追溯、可复算。</p>
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
          <h2>不让玄学覆盖基本面，<br />不让推荐伪装成承诺。</h2>
        </div>
        <p>
          风水命理缺乏可重复验证的金融预测证据。玄鉴把它限制在轻量偏好层；
          所有证券仍需通过可交易性、质量、估值、成长、动量、低波与组合风险检查。
        </p>
        <a href="/demo">查看方法如何落在产品里 →</a>
      </section>

      <footer className="landing-footer">
        <span>玄鉴 · AShare Lab</span>
        <p>传统文化体验与量化研究原型，不构成投资建议。</p>
        <a href={primaryHref}>{user ? "进入工作台" : "登录开始"} ↗</a>
      </footer>
    </main>
  );
}
