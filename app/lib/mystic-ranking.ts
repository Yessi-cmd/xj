import type { ElementName, Gender } from "./fortune.ts";

export const DAILY_ROLES = ["guardian", "today", "hidden", "sameStar", "remedy", "clash"] as const;

export type DailyRole = (typeof DAILY_ROLES)[number];
export type FeedbackAction = "affinity" | "neutral" | "avoid";

export type MysticStockTag = {
  code: string;
  name: string;
  exchange: "SH" | "SZ" | "BJ";
  industry?: string;
  primaryElement: ElementName;
  secondaryElement: ElementName;
  yinYang: "阴" | "阳";
  star: string;
  beast: string;
  palace: string;
  number: number;
  explorationScore: number;
  listingDate?: string | null;
  listingDayPillar?: string | null;
  exchangeDirection?: string;
  industryElement?: ElementName | null;
  tagVersion?: string;
};

export type MysticUniverse = {
  schemaVersion: number;
  snapshotAt: string;
  source: string;
  stockCount: number;
  stocks: MysticStockTag[];
};

export type MysticSignature = {
  star: string;
  beast: string;
  palace: string;
  destinyNumber: number;
  yinYang: "阴" | "阳";
};

export type DailyContext = {
  dateKey: string;
  dayPillar: string;
  dayElement: ElementName;
  drawVersion: number;
};

export type DailyFortune = {
  grade: string;
  title: string;
  luckyHour: string;
  luckyColor: string;
  luckyNumber: number;
  favorable: string[];
  avoid: string[];
};

export type AffinityProfile = {
  tagWeights: Record<string, number>;
  blockedCodes: string[];
  suppressedCodes: string[];
};

export type DailyRecommendation = {
  code: string;
  name: string;
  kind: "股票";
  role: DailyRole;
  roleLabel: string;
  isPositive: boolean;
  theme: string;
  natalScore: number;
  dailyScore: number;
  affinityScore: number;
  explorationScore: number;
  combinedScore: number;
  primaryElement: ElementName;
  star: string;
  beast: string;
  palace: string;
  number: number;
  tags: string[];
  rationale: string;
};

export type Recommendation = DailyRecommendation;

export type MysticContext = {
  profileKey: string;
  favorableElement: ElementName;
  dayMaster: ElementName;
  dominantElement: ElementName;
  gender: Gender;
  destinyNumber: number;
  daily: DailyContext;
  affinity?: AffinityProfile;
  recentPositiveCodes?: string[];
};

const STARS = ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"];
const BEASTS = ["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"];
const PALACES = ["坎", "坤", "震", "巽", "中", "乾", "兑", "艮", "离"];
const PRODUCES: Record<ElementName, ElementName> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const CONTROLS: Record<ElementName, ElementName> = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" };
const ROLE_LABELS: Record<DailyRole, string> = {
  guardian: "本命守护签",
  today: "今日上签",
  hidden: "潜龙签",
  sameStar: "同曜签",
  remedy: "补运签",
  clash: "相冲签",
};

let universePromise: Promise<MysticUniverse> | undefined;

export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function pick<T>(values: readonly T[], key: string): T {
  return values[stableHash(key) % values.length];
}

export async function loadMysticUniverse(): Promise<MysticUniverse> {
  universePromise ??= fetch("/data/mystic-stocks.json", { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`玄学标签池加载失败：HTTP ${response.status}`);
      const universe = await response.json() as MysticUniverse;
      if (!Array.isArray(universe.stocks) || universe.stocks.length < 1000) {
        throw new Error("玄学标签池内容不完整");
      }
      return universe;
    })
    .catch((error) => {
      universePromise = undefined; // 失败后重置缓存，让下一次调用可以重试，避免一次网络抖动锁死当日开签
      throw error;
    });
  return universePromise;
}

export function deriveSignature(context: Pick<MysticContext, "profileKey" | "gender" | "destinyNumber">): MysticSignature {
  return {
    star: pick(STARS, `${context.profileKey}|star`),
    beast: pick(BEASTS, `${context.profileKey}|beast`),
    palace: pick(PALACES, `${context.profileKey}|palace`),
    destinyNumber: context.destinyNumber,
    yinYang: pick(
      [context.gender === "male" ? "阳" : "阴", context.gender === "male" ? "阴" : "阳"] as const,
      `${context.profileKey}|yin-yang`,
    ),
  };
}

function affinityFor(stock: MysticStockTag, affinity?: AffinityProfile): number {
  if (!affinity) return 50;
  const keys = [
    `element:${stock.primaryElement}`,
    `element:${stock.secondaryElement}`,
    `star:${stock.star}`,
    `beast:${stock.beast}`,
    `palace:${stock.palace}`,
    `number:${stock.number}`,
  ];
  const sum = keys.reduce((total, key) => total + (affinity.tagWeights[key] ?? 0), 0);
  return clamp(Math.round(50 + sum * 7), 0, 100);
}

type ScoredStock = MysticStockTag & {
  natalScore: number;
  dailyScore: number;
  affinityScore: number;
  combinedScore: number;
  fixedTie: number;
  dailyTie: number;
};

function scoreStock(stock: MysticStockTag, context: MysticContext, signature: MysticSignature): ScoredStock {
  let natal = 34;
  if (stock.primaryElement === context.favorableElement) natal += 24;
  if (stock.secondaryElement === context.favorableElement) natal += 13;
  if (stock.primaryElement === PRODUCES[context.dayMaster]) natal += 8;
  if (stock.secondaryElement === context.dayMaster) natal += 5;
  if (stock.primaryElement === context.dominantElement) natal -= 7;
  if (stock.star === signature.star) natal += 12;
  if (stock.beast === signature.beast) natal += 7;
  if (stock.palace === signature.palace) natal += 6;
  if (stock.number === signature.destinyNumber) natal += 8;
  if (stock.yinYang === signature.yinYang) natal += 5;
  natal += stableHash(`${context.profileKey}|${stock.code}|本命`) % 7;

  let daily = 38;
  if (stock.primaryElement === context.daily.dayElement) daily += 27;
  if (stock.secondaryElement === context.daily.dayElement) daily += 14;
  if (stock.primaryElement === PRODUCES[context.daily.dayElement]) daily += 10;
  if (stock.primaryElement === CONTROLS[context.daily.dayElement]) daily -= 15;
  if (stock.number === ((stableHash(context.daily.dateKey) % 9) || 9)) daily += 8;
  daily += stableHash(`${context.daily.dateKey}|${stock.code}|流日`) % 11;

  const natalScore = clamp(Math.round(natal));
  const dailyScore = clamp(Math.round(daily));
  const affinityScore = affinityFor(stock, context.affinity);
  const combinedScore = Math.round(
    natalScore * 0.45
    + dailyScore * 0.25
    + stock.explorationScore * 0.15
    + affinityScore * 0.10
    + 100 * 0.05,
  );

  return {
    ...stock,
    natalScore,
    dailyScore,
    affinityScore,
    combinedScore,
    fixedTie: stableHash(`${context.profileKey}|${stock.code}|守`),
    dailyTie: stableHash(`${context.profileKey}|${stock.code}|${context.daily.dateKey}|${context.daily.drawVersion}|变`),
  };
}

function recommendation(stock: ScoredStock, role: DailyRole, context: MysticContext, signature: MysticSignature): DailyRecommendation {
  const roleCopy: Record<DailyRole, string> = {
    guardian: `与你的${context.favorableElement}气本命最稳，宜长期放入观察册。`,
    today: `${context.daily.dayPillar}${context.daily.dayElement}气与本命同振，是今日缘分最明的一签。`,
    hidden: `探索度 ${stock.explorationScore}，取小众探索之象，适合满足今日好奇心。`,
    sameStar: `${stock.star}与本命主星${signature.star}同曜，取“星照同宫”之象。`,
    remedy: `${stock.primaryElement}${stock.secondaryElement}双象补益喜用${context.favorableElement}，取调和之意。`,
    clash: `${stock.primaryElement}气与今日${context.daily.dayElement}象相制，今日宜远观，不作正向推荐。`,
  };
  return {
    code: stock.code,
    name: stock.name,
    kind: "股票",
    role,
    roleLabel: ROLE_LABELS[role],
    isPositive: role !== "clash",
    theme: `${stock.primaryElement}系 · ${stock.star}${stock.beast}`,
    natalScore: stock.natalScore,
    dailyScore: stock.dailyScore,
    affinityScore: stock.affinityScore,
    explorationScore: stock.explorationScore,
    combinedScore: stock.combinedScore,
    primaryElement: stock.primaryElement,
    star: stock.star,
    beast: stock.beast,
    palace: stock.palace,
    number: stock.number,
    tags: [
      `${stock.primaryElement}${stock.secondaryElement}双象`,
      stock.yinYang,
      `${stock.star}星`,
      stock.beast,
      `${stock.palace}宫`,
      `${stock.number}号灵数`,
      stock.listingDayPillar ? `上市${stock.listingDayPillar}` : "代码灵数盘",
    ],
    rationale: roleCopy[role],
  };
}

function choose(
  candidates: ScoredStock[],
  used: Set<string>,
  score: (stock: ScoredStock) => number,
  tie: (stock: ScoredStock) => number,
  predicate: (stock: ScoredStock) => boolean = () => true,
): ScoredStock {
  const ranked = candidates
    .filter((stock) => !used.has(stock.code))
    .sort((left, right) => score(right) - score(left) || tie(right) - tie(left));
  // 候选充足时按职责谓词取最高分；谓词无匹配时退到最高分未用候选；
  // 池完全耗尽才退回 candidates[0]（可能重复），生产标签池由 loadMysticUniverse 保证 >= 1000 只，不会走到该路径。
  const selected = ranked.find(predicate) ?? ranked[0] ?? candidates[0];
  used.add(selected.code);
  return selected;
}

export function rankMysticStocks(
  universe: MysticUniverse,
  context: MysticContext,
): { recommendations: DailyRecommendation[]; signature: MysticSignature } {
  const signature = deriveSignature(context);
  const blocked = new Set(context.affinity?.blockedCodes ?? []);
  const suppressed = new Set(context.affinity?.suppressedCodes ?? []);
  const recent = new Set(context.recentPositiveCodes ?? []);
  const all = universe.stocks
    // 当前标签池探索度下限为 55，此阈值防御未来数据回退，不改变现有候选范围。
    .filter((stock) => stock.explorationScore >= 55 && !blocked.has(stock.code))
    .map((stock) => scoreStock(stock, context, signature));
  const positivePool = all.filter((stock) => !suppressed.has(stock.code) && !recent.has(stock.code));
  const pool = positivePool.length >= 20 ? positivePool : all.filter((stock) => !suppressed.has(stock.code));
  // 守护签尊重无感与避开名单，但不受七日冷却与换卦影响。
  const guardianPool = all.filter((stock) => !suppressed.has(stock.code));
  const used = new Set<string>();

  const guardian = choose(guardianPool, used, (stock) => stock.natalScore * 0.8 + stock.explorationScore * 0.2, (stock) => stock.fixedTie);
  const drawDrift = (stock: ScoredStock) => stock.dailyTie % 13;
  const today = choose(pool, used, (stock) => stock.combinedScore + drawDrift(stock), (stock) => stock.dailyTie);
  const hidden = choose(pool, used, (stock) => stock.combinedScore * 0.55 + stock.explorationScore * 0.45 + drawDrift(stock), (stock) => stock.dailyTie);
  const sameStar = choose(pool, used, (stock) => stock.combinedScore + drawDrift(stock), (stock) => stock.dailyTie, (stock) => stock.star === signature.star);
  const remedy = choose(pool, used, (stock) => stock.combinedScore + drawDrift(stock) + (stock.primaryElement === context.favorableElement ? 10 : 0), (stock) => stock.dailyTie, (stock) => stock.primaryElement === context.favorableElement || stock.secondaryElement === context.favorableElement);
  const clash = choose(
    all,
    used,
    (stock) => 100 - stock.dailyScore + (stock.primaryElement === CONTROLS[context.daily.dayElement] ? 20 : 0),
    (stock) => stock.fixedTie,
  );

  const recommendations = [
    recommendation(guardian, "guardian", context, signature),
    recommendation(today, "today", context, signature),
    recommendation(hidden, "hidden", context, signature),
    recommendation(sameStar, "sameStar", context, signature),
    recommendation(remedy, "remedy", context, signature),
    recommendation(clash, "clash", context, signature),
  ];

  return { signature, recommendations };
}
