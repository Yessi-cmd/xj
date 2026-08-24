import type { BirthProfile } from "./fortune.ts";
import { isLunarBirthDate, type LunarBirthDate } from "./lunar-date.ts";
import type {
  AffinityProfile,
  DailyContext,
  DailyFortune,
  DailyRole,
  DailyRecommendation,
  FeedbackAction,
} from "./mystic-ranking.ts";

export const MYSTIC_STATE_KEY = "xuanjian.state.v1";
export const MYSTIC_STATE_VERSION = 1 as const;

export type FeedbackEntry = {
  code: string;
  name: string;
  action: FeedbackAction;
  tags: string[];
  updatedAt: string;
};

export type DailyHistoryEntry = {
  dateKey: string;
  profileFingerprint: string;
  drawVersion: number;
  dailyContext: DailyContext;
  dailyFortune: DailyFortune;
  recommendations: DailyRecommendation[];
  archetype: string;
  openedAt: string;
  openedByUser?: boolean;
};

export type PersistedMysticState = {
  version: typeof MYSTIC_STATE_VERSION;
  profile: BirthProfile | null;
  feedback: Record<string, FeedbackEntry>;
  collection: string[];
  history: DailyHistoryEntry[];
  rerolls: Record<string, number>;
  flipReveal?: boolean;
  updatedAt: string;
};

export function createEmptyMysticState(): PersistedMysticState {
  return {
    version: MYSTIC_STATE_VERSION,
    profile: null,
    feedback: {},
    collection: [],
    history: [],
    rerolls: {},
    updatedAt: new Date(0).toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function optionalNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : finiteNumber(value) ? value : null;
}

const DAILY_ROLES = new Set<DailyRole>(["guardian", "today", "hidden", "sameStar", "remedy", "clash"]);
const ELEMENT_NAMES = new Set(["木", "火", "土", "金", "水"]);
const EXCHANGES = new Set(["SH", "SZ", "BJ"]);

function normalizeRecommendation(value: unknown): DailyRecommendation | null {
  if (!isRecord(value)) return null;
  const role = value.role as DailyRole;
  if (!DAILY_ROLES.has(role)
    || typeof value.code !== "string"
    || typeof value.name !== "string"
    || typeof value.roleLabel !== "string"
    || typeof value.theme !== "string"
    || !finiteNumber(value.natalScore)
    || !finiteNumber(value.dailyScore)
    || !finiteNumber(value.affinityScore)
    || !finiteNumber(value.explorationScore)
    || !finiteNumber(value.combinedScore)
    || !ELEMENT_NAMES.has(value.primaryElement as string)
    || typeof value.star !== "string"
    || typeof value.beast !== "string"
    || typeof value.palace !== "string"
    || !finiteNumber(value.number)
    || !EXCHANGES.has(value.exchange as string)
    || !Array.isArray(value.tags)
    || !value.tags.every((tag) => typeof tag === "string")
    || typeof value.rationale !== "string") {
    return null;
  }

  return {
    code: value.code,
    name: value.name,
    kind: "股票",
    role,
    roleLabel: value.roleLabel,
    isPositive: role !== "clash",
    theme: value.theme,
    natalScore: value.natalScore,
    dailyScore: value.dailyScore,
    affinityScore: value.affinityScore,
    explorationScore: value.explorationScore,
    combinedScore: value.combinedScore,
    primaryElement: value.primaryElement as DailyRecommendation["primaryElement"],
    star: value.star,
    beast: value.beast,
    palace: value.palace,
    number: value.number,
    industry: optionalString(value.industry),
    exchange: value.exchange as DailyRecommendation["exchange"],
    exchangeDirection: optionalString(value.exchangeDirection),
    listingDate: value.listingDate === null ? null : optionalString(value.listingDate),
    marketCap: optionalNumber(value.marketCap),
    pe: optionalNumber(value.pe),
    changePercent: optionalNumber(value.changePercent),
    change5Percent: optionalNumber(value.change5Percent),
    revenue: optionalNumber(value.revenue),
    revenueItem: optionalString(value.revenueItem),
    revenueReportDate: optionalString(value.revenueReportDate),
    industryCsrc: optionalString(value.industryCsrc),
    businessProfile: optionalString(value.businessProfile),
    factsDate: optionalString(value.factsDate),
    tags: value.tags,
    rationale: value.rationale,
  };
}

function normalizeDailyContext(value: unknown): DailyContext | null {
  if (!isRecord(value)
    || !isDateKey(value.dateKey)
    || typeof value.dayPillar !== "string"
    || !ELEMENT_NAMES.has(value.dayElement as string)
    || !Number.isSafeInteger(value.drawVersion)
    || (value.drawVersion as number) < 0) {
    return null;
  }
  return {
    dateKey: value.dateKey,
    dayPillar: value.dayPillar,
    dayElement: value.dayElement as DailyContext["dayElement"],
    drawVersion: value.drawVersion as number,
  };
}

function normalizeDailyFortune(value: unknown): DailyFortune | null {
  if (!isRecord(value)
    || typeof value.grade !== "string"
    || typeof value.title !== "string"
    || typeof value.luckyHour !== "string"
    || typeof value.luckyColor !== "string"
    || !finiteNumber(value.luckyNumber)
    || !Array.isArray(value.favorable)
    || !value.favorable.every((item) => typeof item === "string")
    || !Array.isArray(value.avoid)
    || !value.avoid.every((item) => typeof item === "string")) {
    return null;
  }
  return {
    grade: value.grade,
    title: value.title,
    luckyHour: value.luckyHour,
    luckyColor: value.luckyColor,
    luckyNumber: value.luckyNumber,
    favorable: value.favorable,
    avoid: value.avoid,
  };
}

function normalizeHistoryEntry(value: unknown): DailyHistoryEntry | null {
  if (!isRecord(value)
    || !isDateKey(value.dateKey)
    || typeof value.profileFingerprint !== "string"
    || !value.profileFingerprint
    || !Number.isSafeInteger(value.drawVersion)
    || (value.drawVersion as number) < 0
    || typeof value.archetype !== "string"
    || typeof value.openedAt !== "string"
    || !Array.isArray(value.recommendations)) {
    return null;
  }
  const dailyContext = normalizeDailyContext(value.dailyContext);
  const dailyFortune = normalizeDailyFortune(value.dailyFortune);
  const recommendations = value.recommendations.map(normalizeRecommendation).filter((item): item is DailyRecommendation => item !== null);
  if (!dailyContext
    || !dailyFortune
    || dailyContext.dateKey !== value.dateKey
    || dailyContext.drawVersion !== value.drawVersion
    || recommendations.length !== DAILY_ROLES.size
    || new Set(recommendations.map((item) => item.code)).size !== DAILY_ROLES.size
    || new Set(recommendations.map((item) => item.role)).size !== DAILY_ROLES.size) {
    return null;
  }
  return {
    dateKey: value.dateKey,
    profileFingerprint: value.profileFingerprint,
    drawVersion: value.drawVersion as number,
    dailyContext,
    dailyFortune,
    recommendations,
    archetype: value.archetype,
    openedAt: value.openedAt,
    openedByUser: typeof value.openedByUser === "boolean" ? value.openedByUser : undefined,
  };
}

function normalizeFeedback(value: unknown): Record<string, FeedbackEntry> {
  if (!isRecord(value)) return {};
  const feedback: Record<string, FeedbackEntry> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!isRecord(candidate)
      || !["affinity", "neutral", "avoid"].includes(candidate.action as string)) continue;
    const code = typeof candidate.code === "string" && candidate.code ? candidate.code : key;
    if (!code) continue;
    feedback[code] = {
      code,
      name: typeof candidate.name === "string" && candidate.name ? candidate.name : code,
      action: candidate.action as FeedbackAction,
      tags: Array.isArray(candidate.tags) ? candidate.tags.filter((tag): tag is string => typeof tag === "string") : [],
      updatedAt: typeof candidate.updatedAt === "string" && Number.isFinite(Date.parse(candidate.updatedAt))
        ? candidate.updatedAt
        : new Date(0).toISOString(),
    };
  }
  return feedback;
}

function normalizeProfile(value: unknown): BirthProfile | null {
  if (!isRecord(value)) return null;
  const profile = value;
  const valid = typeof profile.birthDate === "string"
    && isDateKey(profile.birthDate)
    && typeof profile.birthTime === "string"
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(profile.birthTime)
    && typeof profile.location === "string"
    && Boolean(profile.location)
    && (profile.gender === "male" || profile.gender === "female")
    && typeof profile.name === "string";
  if (!valid) return null;
  const birthCalendar = profile.birthCalendar === "lunar" && isLunarBirthDate(profile.lunarBirthDate)
    ? "lunar"
    : profile.birthCalendar === "solar" ? "solar" : undefined;
  const normalized: BirthProfile = {
    name: (profile.name as string).slice(0, 40),
    gender: profile.gender as BirthProfile["gender"],
    birthDate: profile.birthDate as string,
    birthTime: profile.birthTime as string,
    location: profile.location as string,
  };
  if (typeof profile.birthTimeKnown === "boolean") normalized.birthTimeKnown = profile.birthTimeKnown;
  if (birthCalendar) normalized.birthCalendar = birthCalendar;
  if (birthCalendar === "lunar") normalized.lunarBirthDate = profile.lunarBirthDate as LunarBirthDate;
  if (Number.isSafeInteger(profile.luckyNumber) && (profile.luckyNumber as number) >= 1 && (profile.luckyNumber as number) <= 9) normalized.luckyNumber = profile.luckyNumber as number;
  if (ELEMENT_NAMES.has(profile.industryPreference as string)) normalized.industryPreference = profile.industryPreference as BirthProfile["industryPreference"];
  if (["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"].includes(profile.guardianBeast as string)) normalized.guardianBeast = profile.guardianBeast as string;
  if (profile.dayNight === "sun" || profile.dayNight === "moon") normalized.dayNight = profile.dayNight;
  if (["A", "B", "AB", "O"].includes(profile.bloodType as string)) normalized.bloodType = profile.bloodType as BirthProfile["bloodType"];
  return normalized;
}

export function normalizeMysticState(value: unknown): PersistedMysticState {
  if (!value || typeof value !== "object") return createEmptyMysticState();
  const source = value as Partial<PersistedMysticState> & Record<string, unknown>;
  const base = createEmptyMysticState();
  const feedback = normalizeFeedback(source.feedback);
  const history = Array.isArray(source.history)
    ? source.history.map(normalizeHistoryEntry).filter((entry): entry is DailyHistoryEntry => entry !== null)
    : [];
  const collection = Array.isArray(source.collection) ? source.collection.filter((code): code is string => typeof code === "string") : [];
  const rerolls = source.rerolls && typeof source.rerolls === "object"
    ? Object.fromEntries(Object.entries(source.rerolls).filter(([, count]) => Number.isSafeInteger(count) && (count as number) >= 0)) as Record<string, number>
    : {};

  return pruneMysticState({
    ...base,
    profile: normalizeProfile(source.profile),
    feedback,
    collection: [...new Set(collection)],
    history,
    rerolls,
    flipReveal: source.flipReveal === true,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : base.updatedAt,
  });
}

export function loadMysticState(storage: Pick<Storage, "getItem"> = window.localStorage): PersistedMysticState {
  try {
    const raw = storage.getItem(MYSTIC_STATE_KEY);
    return raw ? normalizeMysticState(JSON.parse(raw)) : createEmptyMysticState();
  } catch {
    return createEmptyMysticState();
  }
}

export function saveMysticState(state: PersistedMysticState, storage: Pick<Storage, "setItem"> = window.localStorage): PersistedMysticState {
  const next = pruneMysticState({ ...state, updatedAt: new Date().toISOString() });
  storage.setItem(MYSTIC_STATE_KEY, JSON.stringify(next));
  return next;
}

export function pruneMysticState(state: PersistedMysticState, now = new Date()): PersistedMysticState {
  const cutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const history = state.history
    .filter((entry) => typeof entry.dateKey === "string" && entry.dateKey >= cutoff)
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
    .slice(0, 30);
  const visibleDates = new Set(history.map((entry) => entry.dateKey));
  const rerolls = Object.fromEntries(Object.entries(state.rerolls).filter(([dateKey]) => visibleDates.has(dateKey)));
  return { ...state, history, rerolls: rerolls as Record<string, number> };
}

export function buildAffinityProfile(state: PersistedMysticState, now = new Date()): AffinityProfile {
  const tagWeights: Record<string, number> = {};
  const blockedCodes: string[] = [];
  const suppressedCodes: string[] = [];
  const neutralCutoff = now.getTime() - 30 * 86_400_000;

  for (const entry of Object.values(state.feedback)) {
    if (!entry || !Array.isArray(entry.tags)) continue;
    const isRecent = new Date(entry.updatedAt).getTime() >= neutralCutoff;
    if (entry.action === "avoid") blockedCodes.push(entry.code);
    if (entry.action === "neutral" && isRecent) suppressedCodes.push(entry.code);
    if (entry.action === "neutral" && !isRecent) continue; // 过期无感退出画像，避免长期压低标签缘分分
    const direction = entry.action === "affinity" ? 1 : entry.action === "neutral" ? -0.45 : -1;
    for (const tag of entry.tags) tagWeights[tag] = (tagWeights[tag] ?? 0) + direction;
  }

  return { tagWeights, blockedCodes, suppressedCodes };
}

export function affinityTags(recommendation: DailyRecommendation): string[] {
  return [
    `element:${recommendation.primaryElement}`,
    `star:${recommendation.star}`,
    `beast:${recommendation.beast}`,
    `palace:${recommendation.palace}`,
    `number:${recommendation.number}`,
  ];
}

export function positiveCodesInLastDays(state: PersistedMysticState, dateKey: string, days = 7): string[] {
  const boundary = new Date(`${dateKey}T00:00:00+08:00`).getTime() - days * 86_400_000;
  return [...new Set(state.history
    .filter((entry) => {
      const time = new Date(`${entry.dateKey}T00:00:00+08:00`).getTime();
      return entry.dateKey !== dateKey && time >= boundary;
    })
    .flatMap((entry) => entry.recommendations.filter((item) => item.isPositive).map((item) => item.code)))];
}

export function hasDailyEntry(state: PersistedMysticState, dateKey: string, profileFingerprint: string): boolean {
  return state.history.some((entry) => entry.dateKey === dateKey
    && entry.profileFingerprint === profileFingerprint
    && entry.openedByUser === true);
}

export function prepareStateForDailyOpening(state: PersistedMysticState, dateKey: string, profileFingerprint: string): PersistedMysticState {
  if (hasDailyEntry(state, dateKey, profileFingerprint) || !(dateKey in state.rerolls)) return state;
  const rerolls = { ...state.rerolls };
  delete rerolls[dateKey];
  return { ...state, rerolls };
}

export function calculateStreak(history: DailyHistoryEntry[], todayKey: string): number {
  const days = new Set(history
    .filter((entry) => entry.dateKey !== todayKey || entry.openedByUser === true)
    .map((entry) => entry.dateKey));
  let cursor = new Date(`${todayKey}T12:00:00+08:00`);
  let streak = 0;
  while (days.has(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}
