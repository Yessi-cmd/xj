"use client";

import { ChangeEvent, CSSProperties, FormEvent, TouchEvent as ReactTouchEvent, useEffect, useMemo, useRef, useState } from "react";
import LocationPicker from "@/app/components/LocationPicker";
import TodayOverview from "@/app/components/TodayOverview";
import {
  analyzeProfile,
  createDailyContext,
  ELEMENTS,
  getShanghaiDateKey,
  profileFingerprint,
  type BirthProfile,
  type FortuneResult,
} from "@/app/lib/fortune";
import {
  affinityTags,
  buildAffinityProfile,
  calculateStreak,
  createEmptyMysticState,
  loadMysticState,
  positiveCodesInLastDays,
  saveMysticState,
  type DailyHistoryEntry,
  type PersistedMysticState,
} from "@/app/lib/mystic-state";
import { decryptMysticState, encryptMysticState } from "@/app/lib/profile-crypto";
import type { DailyFengShuiOverview } from "@/app/lib/daily-overview";
import type { MarketSnapshot } from "@/app/lib/market-overview";
import type { DailyRecommendation, FeedbackAction } from "@/app/lib/mystic-ranking";

type CompassExperienceProps = {
  displayName: string;
  dailyOverview: DailyFengShuiOverview;
  marketSnapshot: MarketSnapshot;
  signedIn?: boolean;
  demoMode?: boolean;
  standaloneMode?: boolean;
};

type ViewName = "today" | "collection" | "history" | "profile";

const ELEMENT_META = {
  木: { color: "#39a96b", phrase: "青龙 · 生发" },
  火: { color: "#d55345", phrase: "朱雀 · 明耀" },
  土: { color: "#c4933f", phrase: "勾陈 · 承载" },
  金: { color: "#8b7eb8", phrase: "白虎 · 决断" },
  水: { color: "#397db2", phrase: "玄武 · 流变" },
} as const;

const ROLE_GLYPHS = { guardian: "守", today: "吉", hidden: "潜", sameStar: "曜", remedy: "补", clash: "冲" } as const;

const TRIGRAMS = [
  { symbol: "☰", name: "乾" }, { symbol: "☱", name: "兑" },
  { symbol: "☲", name: "离" }, { symbol: "☳", name: "震" },
  { symbol: "☴", name: "巽" }, { symbol: "☵", name: "坎" },
  { symbol: "☶", name: "艮" }, { symbol: "☷", name: "坤" },
] as const;

const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

const INITIAL_PROFILE: BirthProfile = {
  name: "", gender: "male", birthDate: "1990-06-15", birthTime: "08:30", location: "北京市",
};

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function historyEntry(result: FortuneResult, fingerprint: string): DailyHistoryEntry {
  return {
    dateKey: result.dailyContext.dateKey,
    profileFingerprint: fingerprint,
    drawVersion: result.dailyContext.drawVersion,
    dailyContext: result.dailyContext,
    dailyFortune: result.dailyFortune,
    recommendations: result.recommendations,
    archetype: result.riskProfile,
    openedAt: new Date().toISOString(),
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function createShareImage(result: FortuneResult): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器暂不支持生成分享图。");
  const gradient = context.createLinearGradient(0, 0, 1080, 1440);
  gradient.addColorStop(0, "#10162f");
  gradient.addColorStop(0.58, "#171838");
  gradient.addColorStop(1, "#2d1938");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1440);
  context.strokeStyle = "rgba(222,174,52,.42)";
  context.lineWidth = 2;
  for (let radius = 160; radius <= 440; radius += 70) {
    context.beginPath();
    context.arc(540, 330, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.textAlign = "center";
  context.fillStyle = "#e7bd4e";
  context.font = "52px KaiTi, STKaiti, serif";
  context.fillText("玄 鉴 · 每 日 玄 签", 540, 110);
  context.fillStyle = "#fff9e9";
  context.font = "132px KaiTi, STKaiti, serif";
  context.fillText(result.dailyContext.dayPillar, 540, 370);
  context.font = "44px KaiTi, STKaiti, serif";
  context.fillText(`${result.dailyFortune.grade} · ${result.riskProfile}`, 540, 460);
  context.fillStyle = "rgba(255,255,255,.7)";
  context.font = "28px Microsoft YaHei, sans-serif";
  context.fillText(formatDate(result.dailyContext.dateKey), 540, 515);
  const top = result.recommendations.filter((item) => item.isPositive).slice(0, 3);
  top.forEach((item, index) => {
    const y = 650 + index * 190;
    context.fillStyle = "rgba(255,255,255,.075)";
    context.fillRect(100, y, 880, 150);
    context.textAlign = "left";
    context.fillStyle = "#e7bd4e";
    context.font = "30px KaiTi, STKaiti, serif";
    context.fillText(item.roleLabel, 145, y + 48);
    context.fillStyle = "#fff";
    context.font = "bold 42px Microsoft YaHei, sans-serif";
    context.fillText(item.name, 145, y + 103);
    context.textAlign = "right";
    context.fillStyle = "rgba(255,255,255,.6)";
    context.font = "25px Microsoft YaHei, sans-serif";
    context.fillText(`${item.code} · 缘分 ${item.combinedScore}`, 930, y + 88);
  });
  context.textAlign = "center";
  context.fillStyle = "#d55245";
  context.beginPath();
  context.arc(540, 1270, 66, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fff5df";
  context.font = "30px KaiTi, STKaiti, serif";
  context.fillText("玄学", 540, 1260);
  context.fillText("娱乐", 540, 1298);
  context.font = "24px Microsoft YaHei, sans-serif";
  context.fillStyle = "rgba(255,255,255,.55)";
  context.fillText("不构成买卖建议 · xj.norliva.top", 540, 1380);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("分享图生成失败。")), "image/png"));
}

export default function CompassExperience({
  displayName,
  dailyOverview,
  marketSnapshot,
  signedIn = false,
  demoMode = false,
  standaloneMode = false,
}: CompassExperienceProps) {
  const [profile, setProfile] = useState<BirthProfile>(INITIAL_PROFILE);
  const [state, setState] = useState<PersistedMysticState>(createEmptyMysticState);
  const [result, setResult] = useState<FortuneResult | null>(null);
  const [view, setView] = useState<ViewName>("profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [password, setPassword] = useState("");
  const [railOpen, setRailOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number; fromEdge: boolean } | null>(null);
  const railCloseButton = useRef<HTMLButtonElement>(null);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);

  const todayKey = getShanghaiDateKey();
  const fingerprint = state.profile ? profileFingerprint(state.profile) : "";
  const currentHistory = state.history.filter((entry) => !fingerprint || entry.profileFingerprint === fingerprint);
  const streak = calculateStreak(currentHistory, todayKey);
  const collection = state.collection.map((code) => state.feedback[code]).filter(Boolean);
  const avoided = Object.values(state.feedback).filter((entry) => entry.action === "avoid");
  const rerollUsed = state.rerolls[todayKey] === 1;

  const topSigns = useMemo(() => {
    const counts = new Map<string, { item: DailyRecommendation; count: number }>();
    for (const entry of currentHistory) {
      const item = entry.recommendations.find((candidate) => candidate.role === "today");
      if (!item) continue;
      const existing = counts.get(item.code);
      counts.set(item.code, { item, count: (existing?.count ?? 0) + 1 });
    }
    return [...counts.values()].sort((left, right) => right.count - left.count).slice(0, 3);
  }, [currentHistory]);

  function commit(next: PersistedMysticState): PersistedMysticState {
    const saved = saveMysticState(next);
    setState(saved);
    return saved;
  }

  async function openDaily(nextProfile: BirthProfile, baseState: PersistedMysticState, drawVersion?: 0 | 1) {
    setLoading(true);
    setError("");
    try {
      const dateKey = getShanghaiDateKey();
      const nextFingerprint = profileFingerprint(nextProfile);
      const existing = baseState.history.find((entry) => entry.dateKey === dateKey && entry.profileFingerprint === nextFingerprint);
      const useStored = drawVersion === undefined && existing;
      const dailyContext = useStored
        ? existing.dailyContext
        : await createDailyContext(new Date(), drawVersion ?? baseState.rerolls[dateKey] ?? 0);
      const nextResult = await analyzeProfile(nextProfile, {
        dailyContext,
        affinity: buildAffinityProfile(baseState),
        recentPositiveCodes: positiveCodesInLastDays(baseState, dateKey),
      });
      if (useStored) {
        nextResult.recommendations = existing.recommendations;
        nextResult.dailyFortune = existing.dailyFortune;
      }
      const entry = historyEntry(nextResult, nextFingerprint);
      const nextState: PersistedMysticState = {
        ...baseState,
        profile: nextProfile,
        history: [entry, ...baseState.history.filter((item) => !(item.dateKey === dateKey && item.profileFingerprint === nextFingerprint))],
      };
      const saved = commit(nextState);
      setProfile(nextProfile);
      setResult(nextResult);
      setView("today");
      return saved;
    } catch (analysisError) {
      console.error(analysisError);
      setError("排盘没有完成，请检查出生日期与时间后再试一次。");
      return baseState;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = loadMysticState();
      setState(saved);
      if (saved.profile) {
        setProfile(saved.profile);
        void openDaily(saved.profile, saved);
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // Initial hydration deliberately runs once; openDaily persists any new daily entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!railOpen) return;
    const compactNavigation = window.matchMedia("(max-width: 900px)").matches;
    const focusFrame = compactNavigation
      ? window.requestAnimationFrame(() => railCloseButton.current?.focus())
      : 0;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setRailOpen(false);
      if (compactNavigation) window.requestAnimationFrame(() => mobileMenuButton.current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      if (focusFrame) window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [railOpen]);

  const updateProfile = <Key extends keyof BirthProfile>(key: Key, value: BirthProfile[Key]) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await openDaily(profile, state, 0);
    window.setTimeout(() => document.getElementById("daily-oracle")?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  const reroll = async () => {
    if (!result || rerollUsed) return;
    if (!window.confirm("换签后今日不可再问。守护签与相冲签不变，确定换一卦吗？")) return;
    const withReroll: PersistedMysticState = { ...state, rerolls: { ...state.rerolls, [todayKey]: 1 } };
    const saved = commit(withReroll);
    await openDaily(profile, saved, 1);
    setNotice("天机再转，今日四枚变签已锁定。明日可重新开签。");
  };

  const feedbackFor = (code: string) => state.feedback[code]?.action;
  const setFeedback = (recommendation: DailyRecommendation, action: FeedbackAction) => {
    const feedback = { ...state.feedback };
    const collectionCodes = new Set(state.collection);
    if (feedback[recommendation.code]?.action === action) {
      delete feedback[recommendation.code];
      collectionCodes.delete(recommendation.code);
    } else {
      feedback[recommendation.code] = {
        code: recommendation.code,
        name: recommendation.name,
        action,
        tags: affinityTags(recommendation),
        updatedAt: new Date().toISOString(),
      };
      if (action === "affinity") collectionCodes.add(recommendation.code);
      else collectionCodes.delete(recommendation.code);
    }
    commit({ ...state, feedback, collection: [...collectionCodes] });
    setNotice("已记入你的缘分偏好，将从明日的命签开始生效。");
  };

  const share = async () => {
    if (!result) return;
    try {
      const blob = await createShareImage(result);
      const file = new File([blob], `玄鉴-${result.dailyContext.dateKey}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "我的玄鉴每日玄签", text: `${result.dailyFortune.grade} · ${result.riskProfile}`, files: [file] });
      } else {
        downloadBlob(blob, file.name);
        setNotice("分享卡已保存为图片。");
      }
    } catch (shareError) {
      if ((shareError as Error).name !== "AbortError") setError((shareError as Error).message);
    }
  };

  const exportProfile = async () => {
    setError("");
    try {
      const encrypted = await encryptMysticState(state, password);
      downloadBlob(new Blob([encrypted], { type: "application/json" }), `玄鉴档案-${todayKey}.xjprofile`);
      setPassword("");
      setNotice("加密档案已导出，请妥善保存密码。");
    } catch (exportError) {
      setError((exportError as Error).message);
    }
  };

  const importProfile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const imported = await decryptMysticState(await file.text(), password);
      if (!window.confirm("导入会覆盖当前浏览器里的本命档案、缘分册和星轨，确定继续吗？")) return;
      const saved = commit(imported);
      setPassword("");
      if (saved.profile) {
        setProfile(saved.profile);
        await openDaily(saved.profile, saved);
      } else {
        setResult(null);
        setView("profile");
      }
      setNotice("档案已解密导入。出生日时不会上传到服务器。");
    } catch (importError) {
      setError((importError as Error).message);
    }
  };

  const nav = [
    { id: "today" as const, glyph: "◉", label: "今日开签" },
    { id: "collection" as const, glyph: "◇", label: "缘分册" },
    { id: "history" as const, glyph: "⌁", label: "星轨回看" },
    { id: "profile" as const, glyph: "命", label: "本命档案" },
  ];

  const usesDrawerNavigation = () => window.matchMedia("(max-width: 900px)").matches;

  const selectView = (nextView: ViewName) => {
    setView(nextView);
    if (usesDrawerNavigation()) {
      setRailOpen(false);
      window.requestAnimationFrame(() => mobileMenuButton.current?.focus());
    }
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!usesDrawerNavigation()) return;
    const touch = event.touches[0];
    if (!touch || (!railOpen && touch.clientX > 32)) return;
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      fromEdge: touch.clientX <= 32,
    };
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !usesDrawerNavigation()) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    if (!railOpen && start.fromEdge && deltaX > 0) setRailOpen(true);
    if (railOpen && deltaX < 0) setRailOpen(false);
  };

  return (
    <div
      className={`product-shell daily-shell mystic-shell${railOpen ? " rail-expanded" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStart.current = null; }}
    >
      <button
        className="rail-edge-trigger"
        type="button"
        aria-label="展开产品导航"
        aria-expanded={railOpen}
        aria-controls="product-navigation"
        onMouseEnter={() => setRailOpen(true)}
        onFocus={() => setRailOpen(true)}
        onClick={() => setRailOpen(true)}
      >
        <span aria-hidden="true">›</span>
      </button>
      <button
        className="rail-backdrop"
        type="button"
        aria-label="关闭产品导航"
        tabIndex={railOpen ? 0 : -1}
        onClick={() => {
          setRailOpen(false);
          window.requestAnimationFrame(() => mobileMenuButton.current?.focus());
        }}
      />
      <aside
        className="side-rail"
        id="product-navigation"
        aria-label="产品导航"
        aria-hidden={!railOpen}
        onMouseEnter={() => setRailOpen(true)}
        onMouseLeave={() => { if (!usesDrawerNavigation()) setRailOpen(false); }}
        onFocusCapture={() => setRailOpen(true)}
        onBlurCapture={(event) => {
          if (!usesDrawerNavigation() && !event.currentTarget.contains(event.relatedTarget as Node)) setRailOpen(false);
        }}
      >
        <button ref={railCloseButton} className="rail-close-button" type="button" aria-label="关闭产品导航" onClick={() => {
          setRailOpen(false);
          window.requestAnimationFrame(() => mobileMenuButton.current?.focus());
        }}>×</button>
        <button className="brand-lockup rail-brand-button" onClick={() => selectView(result ? "today" : "profile")} aria-label="玄鉴首页">
          <span className="brand-seal">玄</span><span><strong>玄鉴</strong><small>每日玄签 · AShare Lab</small></span>
        </button>
        <nav className="side-nav daily-side-nav">
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} disabled={item.id !== "profile" && !result} onClick={() => selectView(item.id)}>
              <span>{item.glyph}</span>{item.label}
              {item.id === "collection" && collection.length > 0 && <b>{collection.length}</b>}
            </button>
          ))}
        </nav>
        <div className="rail-divider" />
        <div className="rail-status"><span className="status-dot" /><div><strong>近5,000只A股玄学标签池</strong><small>本命 · 流日 · 反馈已连接</small></div></div>
        <div className="rail-spacer" />
        <div className="streak-stamp"><strong>{streak || "初"}</strong><span>{streak ? "日连续开签" : "今日待开签"}</span></div>
        <div className="rail-user">
          <span className="avatar">{displayName.slice(0, 1).toUpperCase()}</span>
          <span className="user-copy"><strong>{displayName}</strong><small>{standaloneMode ? "公开测试版" : demoMode ? "访客体验" : "已登录用户"}</small></span>
          {standaloneMode ? <span className="quiet-action">已上线</span> : signedIn ? <a className="quiet-action" href="/signout-with-chatgpt?return_to=/">退出</a> : <a className="quiet-action" href="/signin-with-chatgpt?return_to=/dashboard">登录</a>}
        </div>
      </aside>

      <main className="product-main" id="top">
        <header className="mobile-header">
          <button ref={mobileMenuButton} className="mobile-menu-button" type="button" aria-label="打开功能导航" aria-expanded={railOpen} aria-controls="product-navigation" onClick={() => setRailOpen(true)}><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /></button>
          <button className="brand-lockup rail-brand-button" onClick={() => selectView(result ? "today" : "profile")}><span className="brand-seal">玄</span><span><strong>玄鉴</strong><small>每日玄签</small></span></button>
          <span className="mobile-user">{displayName}</span>
        </header>
        {notice && <div className="oracle-notice" role="status"><span>鉴</span>{notice}<button onClick={() => setNotice("")} aria-label="关闭提示">×</button></div>}
        {error && <div className="oracle-error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}

        {loading && !result ? (
          <section className="oracle-loading"><span>玄</span><strong>浑天运转，正在排布今日星轨</strong><small>本命与近五千只股票标签合盘中</small></section>
        ) : view === "profile" ? (
          <section className="profile-workspace">
            <header className="workspace-hero profile-oracle-hero">
              <div className="mystic-hero-copy">
                <div className="oracle-eyebrow"><span>玄鉴 · 千股命盘</span><i /><b>{result?.dailyContext.dayPillar ?? "静候入局"}</b></div>
                <h1>一命一盘，<em>千股寻缘</em></h1>
                <p>以生辰启局，以流日定象。让星曜、神兽、卦宫与灵数穿过近五千只 A 股，揭开今日六枚玄签。</p>
                <div className="hero-omens" aria-label="命理标签维度"><span><b>本命</b>定底色</span><span><b>流日</b>转天机</span><span><b>反馈</b>养缘感</span></div>
              </div>
            </header>

            <TodayOverview fengShui={dailyOverview} market={marketSnapshot} compact />

            <div className="journey-steps" aria-label="开签步骤">
              <span className="complete"><b>1</b>出生信息</span><i />
              <span className={result ? "complete" : "current"}><b>2</b>本命推演</span><i />
              <span className={result ? "complete" : ""}><b>3</b>每日开签</span>
            </div>

            <section className="input-stage profile-input-stage">
              <i className="stage-corner corner-nw" aria-hidden="true" /><i className="stage-corner corner-ne" aria-hidden="true" />
              <i className="stage-corner corner-sw" aria-hidden="true" /><i className="stage-corner corner-se" aria-hidden="true" />
              <form className="birth-card profile-editor" onSubmit={submitProfile}>
                <div className="card-heading"><span className="heading-mark">{profile.gender === "male" ? "乾" : "坤"}</span><div><span className="section-kicker">生辰入局</span><h2>{state.profile ? "修订本命档案" : "请入生辰"}</h2><p>公历起盘，并依出生地经度校正真太阳时。</p></div></div>
                <div className="form-grid">
                  <label className="field"><span>称呼 <small>可选</small></span><input value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} placeholder="如何称呼你" autoComplete="name" /></label>
                  <fieldset className="field gender-field"><legend>性别</legend><div className="segmented-control"><button type="button" aria-pressed={profile.gender === "male"} className={profile.gender === "male" ? "selected" : ""} onClick={() => updateProfile("gender", "male")}>男</button><button type="button" aria-pressed={profile.gender === "female"} className={profile.gender === "female" ? "selected" : ""} onClick={() => updateProfile("gender", "female")}>女</button></div></fieldset>
                  <label className="field"><span>出生日期 <small>公历</small></span><input type="date" required min="1920-01-01" max={todayKey} value={profile.birthDate} onChange={(event) => updateProfile("birthDate", event.target.value)} /></label>
                  <label className="field"><span>出生时间 <small>当地钟表时间</small></span><input type="time" required value={profile.birthTime} onChange={(event) => updateProfile("birthTime", event.target.value)} /></label>
                  <div className="field field-wide"><span>出生地点 <small>全国县市 · 经度校正</small></span><LocationPicker value={profile.location} onChange={(location) => updateProfile("location", location)} /></div>
                </div>
                <button className="primary-button" type="submit" disabled={loading}><small>敕</small><span>{loading ? "星盘运转 · 正在寻缘…" : state.profile ? "重排本命 · 开启今日玄签" : "启盘 · 寻找我的缘分股"}</span><b>卜</b></button>
                <p className="privacy-note">◌ 生辰只在本机推演，不上传云端</p>
              </form>

              <section className={`compass-card profile-compass ${result ? "has-result" : ""}`} aria-live="polite">
                <div className="celestial-dust" aria-hidden="true" />
                <div className="compass-topline"><span>{result ? "天机已显 · 命盘成局" : "浑天未动 · 静候生辰"}</span><small>{result ? result.riskProfile : "输入生辰后启盘"}</small></div>
                <div className="compass-visual" aria-label="五行命理罗盘">
                  <div className="outer-ticks" /><div className="branch-ring" aria-hidden="true">{EARTHLY_BRANCHES.map((branch, index) => <span key={branch} style={{ "--orbit-index": index } as CSSProperties}>{branch}</span>)}</div>
                  <div className="trigram-ring" aria-hidden="true">{TRIGRAMS.map((trigram, index) => <span key={trigram.name} style={{ "--orbit-index": index } as CSSProperties}><b>{trigram.symbol}</b><small>{trigram.name}</small></span>)}</div>
                  <div className="heaven-needle" aria-hidden="true" />
                  <div className="five-wheel"><span className="wheel-label wood">木</span><span className="wheel-label fire">火</span><span className="wheel-label earth">土</span><span className="wheel-label metal">金</span><span className="wheel-label water">水</span><div className="compass-center"><small>{result ? "日主本命" : "太极之眼"}</small><strong>{result?.dayMaster ?? "玄"}</strong><span>{result ? `喜用 · ${result.favorableElement}` : "待君启局"}</span></div></div>
                </div>
                {result ? <div className="pillar-row">{result.pillars.map((pillar) => <div key={pillar.label}><small>{pillar.label}</small><strong>{pillar.value}</strong></div>)}</div> : <div className="compass-empty-copy"><strong>天地定位 · 山泽通气 · 雷风相薄</strong><span>四柱一落，星曜归宫，千股因缘自此显形</span></div>}
              </section>
            </section>

            <div className="profile-workspace-grid profile-details-grid">
              <div className="profile-side-stack">
                {result && <section className="surface-card natal-summary"><div className="natal-seal">{result.favorableElement}</div><span>本命称号</span><h2>{result.riskProfile}</h2><p>{result.pattern}</p><div className="element-bars">{ELEMENTS.map((element) => <div className="element-line" key={element}><span><b style={{ background: ELEMENT_META[element].color }} />{element}</span><div><i style={{ width: `${result.elementPercentages[element]}%`, background: ELEMENT_META[element].color }} /></div><strong>{result.elementPercentages[element]}%</strong></div>)}</div></section>}
              </div>
              <div className="profile-side-stack">
                <section className="surface-card transfer-card"><span className="section-kicker">跨设备迁移</span><h2>带走你的玄鉴档案</h2><p>使用 AES-GCM 加密导出。密码不会保存，遗忘后无法找回。</p><label className="field"><span>档案密码 <small>至少6位</small></span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入导出或导入密码" /></label><div className="transfer-actions"><button onClick={exportProfile} disabled={!state.profile}>加密导出 .xjprofile</button><label className={password.length < 6 ? "disabled" : ""}>解密导入<input type="file" accept=".xjprofile,application/json" disabled={password.length < 6} onChange={importProfile} /></label></div></section>
                {avoided.length > 0 && <section className="surface-card avoided-card"><span className="section-kicker">避开名单</span><h2>{avoided.length} 只股票暂不入签</h2>{avoided.map((entry) => <div key={entry.code}><span><strong>{entry.name}</strong><small>{entry.code}</small></span><button onClick={() => { const feedback = { ...state.feedback }; delete feedback[entry.code]; commit({ ...state, feedback }); }}>解除避开</button></div>)}</section>}
              </div>
            </div>
          </section>
        ) : view === "today" && result ? (
          <section className="daily-workspace" id="daily-oracle">
            <header className="daily-heading"><div><span className="oracle-date">{formatDate(result.dailyContext.dateKey)} · 北京时间</span><h1>今日玄签，<em>{result.dailyFortune.grade}</em></h1><p>{result.dailyFortune.title}。本命「{result.riskProfile}」今日宜观象，不宜因签下注。</p></div><div className="daily-actions"><button onClick={share}>生成分享卡</button><button className="reroll-button" disabled={rerollUsed || loading} onClick={reroll}>{loading ? "天机运转中" : rerollUsed ? "今日已换签" : "换一卦 · 余1次"}</button></div></header>
            <div className="daily-oracle-grid">
              <section className="daily-compass surface-card">
                <div className="daily-compass-rings"><span className="ring-one" /><span className="ring-two" /><span className="ring-three" /><div className="daily-core"><small>今日流日</small><strong>{result.dailyContext.dayPillar}</strong><span>{result.dailyContext.dayElement}气行运</span></div>{ELEMENTS.map((element, index) => <i key={element} style={{ "--daily-index": index } as React.CSSProperties}>{element}</i>)}</div>
                <div className="daily-signature"><span>本命主星</span><strong>{result.mysticSignature.star}</strong><i /> <span>守局神兽</span><strong>{result.mysticSignature.beast}</strong><i /><span>灵数</span><strong>{result.mysticSignature.destinyNumber}</strong></div>
              </section>
              <section className="omen-panel surface-card"><span className="fortune-grade">{result.dailyFortune.grade}</span><h2>{result.dailyFortune.title}</h2><div className="omen-grid"><div><small>幸运时辰</small><strong>{result.dailyFortune.luckyHour}</strong></div><div><small>幸运色</small><strong>{result.dailyFortune.luckyColor}</strong></div><div><small>今日灵数</small><strong>{result.dailyFortune.luckyNumber}</strong></div></div><div className="do-dont"><p><b>宜</b>{result.dailyFortune.favorable.join(" · ")}</p><p><b>忌</b>{result.dailyFortune.avoid.join(" · ")}</p></div></section>
            </div>

            <div className="sign-heading"><div><span>六签各司其职</span><h2>揭开今日股缘</h2></div><p>守护签按月稳定；相冲签只作警示；其余四签随流日与一次换卦变化。</p></div>
            <div className="daily-sign-grid">
              {result.recommendations.map((item, index) => (
                <article className={`daily-sign-card ${item.isPositive ? "" : "clash-sign"}`} key={`${item.role}-${item.code}`} style={{ "--reveal-index": index } as React.CSSProperties}>
                  <div className="sign-card-top"><span className="role-seal">{ROLE_GLYPHS[item.role]}</span><div><small>{item.roleLabel}</small><strong>{item.isPositive ? "此签可观" : "今日宜远观"}</strong></div><b>{item.combinedScore}</b></div>
                  <div className="stock-identity"><span>{item.kind}</span><h3>{item.name}</h3><small>{item.code} · {item.theme}</small></div>
                  <p>{item.rationale}</p>
                  <div className="mystic-tags">{item.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <div className="score-script"><span>本命 {item.natalScore}</span><span>流日 {item.dailyScore}</span><span>缘感 {item.affinityScore}</span></div>
                  <div className="feedback-row" aria-label={`${item.name}缘分反馈`}><button className={feedbackFor(item.code) === "affinity" ? "selected" : ""} onClick={() => setFeedback(item, "affinity")}>♡ 有缘</button><button className={feedbackFor(item.code) === "neutral" ? "selected" : ""} onClick={() => setFeedback(item, "neutral")}>○ 无感</button><button className={feedbackFor(item.code) === "avoid" ? "selected avoid" : ""} onClick={() => setFeedback(item, "avoid")}>× 避开</button></div>
                </article>
              ))}
            </div>
          </section>
        ) : view === "collection" ? (
          <section className="subpage collection-page"><header className="subpage-heading"><span>缘分册 · 你的私藏</span><h1>有缘之签，留待回看</h1><p>收藏会轻微影响未来命签，最多占总缘分分的10%。</p></header>{collection.length ? <div className="collection-grid">{collection.map((entry) => <article className="collection-card" key={entry.code}><span>缘</span><div><small>{entry.code}</small><h2>{entry.name}</h2><p>{entry.tags.slice(0, 3).map((tag) => tag.replace(/^\w+:/, "")).join(" · ")}</p></div><button onClick={() => { const feedback = { ...state.feedback }; delete feedback[entry.code]; commit({ ...state, feedback, collection: state.collection.filter((code) => code !== entry.code) }); }}>移出缘分册</button></article>)}</div> : <div className="empty-oracle"><strong>缘分册尚空</strong><p>在今日命签中点“有缘”，它会在这里留下印记。</p><button onClick={() => setView("today")}>去看今日玄签</button></div>}</section>
        ) : (
          <section className="subpage history-page"><header className="subpage-heading"><span>星轨回看 · 最近30日</span><h1>{streak ? `已连续开签 ${streak} 日` : "星轨尚待点亮"}</h1><p>回看每日流日、上签与换卦痕迹。历史只保留30天。</p></header><div className="history-layout"><div className="history-timeline">{currentHistory.length ? currentHistory.map((entry) => { const top = entry.recommendations.find((item) => item.role === "today"); return <article key={`${entry.dateKey}-${entry.profileFingerprint}`}><span className="history-dot" /><time>{formatDate(entry.dateKey)}</time><div><small>{entry.dailyContext.dayPillar}日 · {entry.dailyFortune.grade}{entry.drawVersion ? " · 已换卦" : ""}</small><h2>{top?.name ?? "当日玄签"}</h2><p>{top?.code} · {top?.theme}</p></div><strong>{top?.combinedScore}</strong></article>; }) : <div className="empty-oracle"><strong>还没有星轨</strong><p>完成首次开签后，这里会记录每日上签。</p></div>}</div><aside className="history-aside surface-card"><span className="section-kicker">历史上上签</span>{topSigns.length ? topSigns.map(({ item, count }) => <div key={item.code}><span><strong>{item.name}</strong><small>{item.code}</small></span><b>{count}次</b></div>) : <p>连续开签后，与你最常共振的股票会在这里显现。</p>}</aside></div></section>
        )}
      </main>
    </div>
  );
}
