"use client";

import { FormEvent, useState } from "react";
import {
  analyzeProfile,
  BirthProfile,
  ELEMENTS,
  FortuneResult,
  LOCATIONS,
} from "@/app/lib/fortune";

type CompassExperienceProps = {
  displayName: string;
  signedIn?: boolean;
  demoMode?: boolean;
  standaloneMode?: boolean;
};

const ELEMENT_META = {
  木: { color: "#39a96b", phrase: "青龙 · 生发" },
  火: { color: "#ef6a5b", phrase: "朱雀 · 明耀" },
  土: { color: "#c4933f", phrase: "勾陈 · 承载" },
  金: { color: "#8b7eb8", phrase: "白虎 · 决断" },
  水: { color: "#397db2", phrase: "玄武 · 流变" },
} as const;

const INITIAL_PROFILE: BirthProfile = {
  name: "",
  gender: "male",
  birthDate: "1990-06-15",
  birthTime: "08:30",
  location: "北京市",
};

export default function CompassExperience({
  displayName,
  signedIn = false,
  demoMode = false,
  standaloneMode = false,
}: CompassExperienceProps) {
  const [profile, setProfile] = useState<BirthProfile>(INITIAL_PROFILE);
  const [result, setResult] = useState<FortuneResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const nextResult = await analyzeProfile(profile);
      setResult(nextResult);
      window.setTimeout(() => {
        document.getElementById("fortune-result")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } catch (analysisError) {
      console.error(analysisError);
      setError("排盘没有完成，请检查出生日期与时间后再试一次。");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = <Key extends keyof BirthProfile>(
    key: Key,
    value: BirthProfile[Key],
  ) => setProfile((current) => ({ ...current, [key]: value }));

  return (
    <div className="product-shell">
      <aside className="side-rail" aria-label="产品导航">
        <a className="brand-lockup" href="#top" aria-label="玄鉴首页">
          <span className="brand-seal">玄</span>
          <span>
            <strong>玄鉴</strong>
            <small>命理投研 · AShare Lab</small>
          </span>
        </a>

        <nav className="side-nav">
          <a className="active" href="#birth-profile"><span>◉</span>命理罗盘</a>
          <a href="#fortune-result"><span>◇</span>命格画像</a>
          <a href="#recommendations"><span>↗</span>玄学缘分榜</a>
        </nav>

        <div className="rail-divider" />
        <div className="rail-status">
          <span className="status-dot" />
          <div>
            <strong>近5,000只A股玄学标签池</strong>
            <small>五行 · 星曜 · 灵数已连接</small>
          </div>
        </div>

        <div className="rail-spacer" />
        <div className="rail-user">
          <span className="avatar">{displayName.slice(0, 1).toUpperCase()}</span>
          <span className="user-copy">
            <strong>{displayName}</strong>
            <small>
              {standaloneMode ? "公开测试版" : demoMode ? "访客演示" : "已登录用户"}
            </small>
          </span>
          {standaloneMode ? (
            <span className="quiet-action">已上线</span>
          ) : signedIn ? (
            <a className="quiet-action" href="/signout-with-chatgpt?return_to=/">退出</a>
          ) : (
            <a className="quiet-action" href="/signin-with-chatgpt?return_to=/dashboard">登录</a>
          )}
        </div>
      </aside>

      <main className="product-main" id="top">
        <header className="mobile-header">
          <a className="brand-lockup" href="#top">
            <span className="brand-seal">玄</span>
            <span><strong>玄鉴</strong><small>命理投研</small></span>
          </a>
          <span className="mobile-user">{displayName}</span>
        </header>

        {demoMode && (
          <div className="demo-banner">
            当前为公开演示，出生信息只在本次浏览器会话中计算，不会保存。
            <a href="/signin-with-chatgpt?return_to=/dashboard">登录进入完整工作台</a>
          </div>
        )}

        <section className="workspace-hero">
          <div>
            <span className="eyebrow">命格不是买入信号，而是一枚缘分索引</span>
            <h1>以命理观人，<em>以缘分寻股</em></h1>
            <p>
              为全A股赋予五行、阴阳、星曜、神兽、卦宫与灵数标签；你的八字命盘
              将从几千只股票中抽取更个性、更小众的玄学缘分签。
            </p>
          </div>
          <div className="hero-formula" aria-label="推荐方法权重">
            <span>命理共振</span><strong>70%</strong>
            <i />
            <span>小众探索</span><strong>20%</strong>
            <i />
            <span>基础过滤</span><strong>10%</strong>
          </div>
        </section>

        <div className="journey-steps" aria-label="分析步骤">
          <span className="complete"><b>1</b>出生信息</span>
          <i />
          <span className={result ? "complete" : "current"}><b>2</b>命盘推演</span>
          <i />
          <span className={result ? "complete" : ""}><b>3</b>缘分寻股</span>
        </div>

        <section className="input-stage" id="birth-profile">
          <form className="birth-card" onSubmit={submit}>
            <div className="card-heading">
              <span className="heading-mark">乾</span>
              <div>
                <span className="section-kicker">命理罗盘 · 第一步</span>
                <h2>填写出生信息</h2>
                <p>原型使用公历与城市经度进行简化真太阳时校正。</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>称呼 <small>可选</small></span>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(event) => updateProfile("name", event.target.value)}
                  placeholder="如何称呼你"
                  autoComplete="name"
                />
              </label>

              <fieldset className="field gender-field">
                <legend>性别</legend>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={profile.gender === "male" ? "selected" : ""}
                    onClick={() => updateProfile("gender", "male")}
                    aria-pressed={profile.gender === "male"}
                  >乾造</button>
                  <button
                    type="button"
                    className={profile.gender === "female" ? "selected" : ""}
                    onClick={() => updateProfile("gender", "female")}
                    aria-pressed={profile.gender === "female"}
                  >坤造</button>
                </div>
              </fieldset>

              <label className="field">
                <span>出生日期 <small>公历</small></span>
                <input
                  type="date"
                  required
                  min="1920-01-01"
                  max="2026-12-31"
                  value={profile.birthDate}
                  onChange={(event) => updateProfile("birthDate", event.target.value)}
                />
              </label>

              <label className="field">
                <span>出生时间 <small>当地钟表时间</small></span>
                <input
                  type="time"
                  required
                  value={profile.birthTime}
                  onChange={(event) => updateProfile("birthTime", event.target.value)}
                />
              </label>

              <label className="field field-wide">
                <span>出生地点 <small>用于经度校正</small></span>
                <select
                  value={profile.location}
                  onChange={(event) => updateProfile("location", event.target.value)}
                >
                  {LOCATIONS.map((location) => (
                    <option value={location.name} key={location.name}>{location.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="primary-button" type="submit" disabled={loading}>
              <span>{loading ? "正在千股池中寻缘…" : "生成我的玄学缘分榜"}</span>
              <b aria-hidden="true">→</b>
            </button>
            <p className="privacy-note">🔒 出生信息仅在本次分析中使用，当前原型不写入数据库</p>
          </form>

          <section className={`compass-card ${result ? "has-result" : ""}`} aria-live="polite">
            <div className="compass-topline">
              <span>{result ? "五行命格已生成" : "罗盘等待起局"}</span>
              <small>{result ? result.riskProfile : "输入信息后开始推演"}</small>
            </div>

            <div className="compass-visual" aria-label="五行命理罗盘">
              <div className="outer-ticks" />
              <div className="five-wheel">
                <span className="wheel-label wood">木</span>
                <span className="wheel-label fire">火</span>
                <span className="wheel-label earth">土</span>
                <span className="wheel-label metal">金</span>
                <span className="wheel-label water">水</span>
                <div className="compass-center">
                  <small>{result ? "日主" : "命理"}</small>
                  <strong>{result?.dayMaster ?? "玄"}</strong>
                  <span>{result ? `喜${result.favorableElement}` : "五行平衡"}</span>
                </div>
              </div>
            </div>

            {result ? (
              <div className="pillar-row">
                {result.pillars.map((pillar) => (
                  <div key={pillar.label}>
                    <small>{pillar.label}</small>
                    <strong>{pillar.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="compass-empty-copy">
                <strong>四柱定盘 · 星曜落位 · 千股寻缘</strong>
                <span>命理共振主导 70%，每一份出生时空都对应不同的缘分榜。</span>
              </div>
            )}
          </section>
        </section>

        {result && (
          <div id="fortune-result" className="result-stack">
            <section className="profile-section surface-card">
              <div className="section-title-row">
                <div>
                  <span className="section-kicker">命格画像 · 第二步</span>
                  <h2>{profile.name ? `${profile.name}的` : "你的"}命格投资画像</h2>
                </div>
                <span className="profile-tag">{result.riskProfile}</span>
              </div>

              <div className="profile-grid">
                <div className="profile-summary">
                  <span className="summary-seal">{result.favorableElement}</span>
                  <div>
                    <strong>{result.pattern}</strong>
                    <p>{result.summary}</p>
                    <small>{result.lunarDate} · 真太阳时 {result.trueSolarTime}</small>
                  </div>
                </div>

                <div className="element-bars">
                  {ELEMENTS.map((element) => (
                    <div className="element-line" key={element}>
                      <span><b style={{ background: ELEMENT_META[element].color }} />{element}</span>
                      <div><i style={{ width: `${result.elementPercentages[element]}%`, background: ELEMENT_META[element].color }} /></div>
                      <strong>{result.elementPercentages[element]}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="factor-section surface-card">
              <div className="section-title-row">
                <div>
                  <span className="section-kicker">玄学签名 · 第三步</span>
                  <h2>把“喜{result.favorableElement}”与星曜、卦宫、灵数合成缘分签名</h2>
                </div>
                <span className="logic-badge">娱乐命理权重 70%</span>
              </div>
              <div className="factor-layout">
                <div className="factor-radar-copy">
                  <span className="mini-label">喜用倾向</span>
                  <strong style={{ color: ELEMENT_META[result.favorableElement].color }}>
                    {result.favorableElement} · {ELEMENT_META[result.favorableElement].phrase}
                  </strong>
                  <div className="signature-line">
                    {result.mysticSignature.star}星 · {result.mysticSignature.beast} · {result.mysticSignature.palace}宫 ·
                    {result.mysticSignature.destinyNumber}号灵数 · {result.mysticSignature.yinYang}象
                  </div>
                  <p>{result.methodologyNote}</p>
                </div>
                <div className="factor-weights">
                  {result.factorWeights.map((factor) => (
                    <div className="factor-weight" key={factor.name}>
                      <span>{factor.label}</span>
                      <div><i style={{ width: `${(factor.weight / 1.3) * 100}%` }} /></div>
                      <strong>{factor.weight.toFixed(2)}×</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="recommendation-section" id="recommendations">
              <div className="section-title-row">
                <div>
                  <span className="section-kicker">玄学缘分榜 · 娱乐结果</span>
                  <h2>A股小众缘分榜</h2>
                  <p>从 {result.universeSize.toLocaleString("zh-CN")} 只非ST、未退市A股标签池中，按本次命盘寻找冷门灵感；换一份出生时空，榜单也会随之变化。</p>
                </div>
                <span className="count-badge">{result.recommendations.length} 只缘分股</span>
              </div>

              <div className="recommendation-list">
                {result.recommendations.map((item, index) => (
                  <article className="security-card" key={item.code}>
                    <span className="security-rank">{String(index + 1).padStart(2, "0")}</span>
                    <div className="security-name">
                      <span className="kind-pill">{item.kind}</span>
                      <h3>{item.name}</h3>
                      <small>{item.code} · {item.theme}</small>
                    </div>
                    <div className="security-reason">
                      <p>{item.rationale}</p>
                      <div className="mystic-tags">
                        {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                    </div>
                    <div className="score-cluster">
                      <span><small>命理</small><b>{item.mysticScore}</b></span>
                      <i>+</i>
                      <span><small>探索</small><b>{item.explorationScore}</b></span>
                      <i>=</i>
                      <span className="total-score"><small>缘分</small><b>{item.combinedScore}</b></span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
