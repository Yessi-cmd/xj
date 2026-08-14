import type { BirthProfile } from "./fortune.ts";
import type {
  AffinityProfile,
  DailyContext,
  DailyFortune,
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

function isProfile(value: unknown): value is BirthProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.birthDate === "string"
    && typeof profile.birthTime === "string"
    && typeof profile.location === "string"
    && (profile.gender === "male" || profile.gender === "female")
    && typeof profile.name === "string";
}

export function normalizeMysticState(value: unknown): PersistedMysticState {
  if (!value || typeof value !== "object") return createEmptyMysticState();
  const source = value as Partial<PersistedMysticState> & Record<string, unknown>;
  const base = createEmptyMysticState();
  const feedback = source.feedback && typeof source.feedback === "object" ? source.feedback : {};
  const history = Array.isArray(source.history) ? source.history.filter((entry) => entry && typeof entry === "object") as DailyHistoryEntry[] : [];
  const collection = Array.isArray(source.collection) ? source.collection.filter((code): code is string => typeof code === "string") : [];
  const rerolls = source.rerolls && typeof source.rerolls === "object"
    ? Object.fromEntries(Object.entries(source.rerolls).filter(([, count]) => Number.isSafeInteger(count) && (count as number) >= 0)) as Record<string, number>
    : {};

  return pruneMysticState({
    ...base,
    profile: isProfile(source.profile) ? source.profile : null,
    feedback: feedback as Record<string, FeedbackEntry>,
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
