import type { ElementName, Gender } from "./fortune.ts";

export type MysticStockTag = {
  code: string;
  name: string;
  exchange: "SH" | "SZ" | "BJ";
  industry: string;
  primaryElement: ElementName;
  secondaryElement: ElementName;
  yinYang: "阴" | "阳";
  star: string;
  beast: string;
  palace: string;
  number: number;
  explorationScore: number;
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

export type Recommendation = {
  code: string;
  name: string;
  kind: "股票";
  theme: string;
  mysticScore: number;
  explorationScore: number;
  combinedScore: number;
  tags: string[];
  rationale: string;
};

type MysticContext = {
  profileKey: string;
  favorableElement: ElementName;
  dayMaster: ElementName;
  dominantElement: ElementName;
  gender: Gender;
  destinyNumber: number;
};

const STARS = ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"];
const BEASTS = ["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"];
const PALACES = ["坎", "坤", "震", "巽", "中", "乾", "兑", "艮", "离"];
const PRODUCES: Record<ElementName, ElementName> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

let universePromise: Promise<MysticUniverse> | undefined;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function pick<T>(values: readonly T[], key: string): T {
  return values[stableHash(key) % values.length];
}

export async function loadMysticUniverse(): Promise<MysticUniverse> {
  universePromise ??= fetch("/data/mystic-stocks.json", { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`玄学标签池加载失败：HTTP ${response.status}`);
      }
      const universe = await response.json() as MysticUniverse;
      if (!Array.isArray(universe.stocks) || universe.stocks.length < 1000) {
        throw new Error("玄学标签池内容不完整");
      }
      return universe;
    });
  return universePromise;
}

function deriveSignature(context: MysticContext): MysticSignature {
  return {
    star: pick(STARS, `${context.profileKey}|star`),
    beast: pick(BEASTS, `${context.profileKey}|beast`),
    palace: pick(PALACES, `${context.profileKey}|palace`),
    destinyNumber: context.destinyNumber,
    yinYang: pick([context.gender === "male" ? "阳" : "阴", context.gender === "male" ? "阴" : "阳"] as const, `${context.profileKey}|yin-yang`),
  };
}

function scoreStock(
  stock: MysticStockTag,
  context: MysticContext,
  signature: MysticSignature,
): Recommendation & { tieBreaker: number; primaryElement: ElementName; star: string } {
  let resonance = 20;
  if (stock.primaryElement === context.favorableElement) resonance += 24;
  if (stock.secondaryElement === context.favorableElement) resonance += 14;
  if (stock.primaryElement === PRODUCES[context.dayMaster]) resonance += 7;
  if (stock.secondaryElement === context.dayMaster) resonance += 5;
  if (stock.primaryElement === context.dominantElement) resonance -= 4;
  if (stock.star === signature.star) resonance += 15;
  if (stock.beast === signature.beast) resonance += 10;
  if (stock.palace === signature.palace) resonance += 9;
  if (stock.number === signature.destinyNumber) resonance += 10;
  if (stock.yinYang === signature.yinYang) resonance += 7;
  resonance += stableHash(`${context.profileKey}|${stock.code}|缘`) % 19;

  const mysticScore = clamp(Math.round(resonance), 48, 99);
  const combinedScore = Math.round(mysticScore * 0.7 + stock.explorationScore * 0.2 + 10);
  const matched = [
    stock.primaryElement === context.favorableElement ? `喜${context.favorableElement}同频` : `${stock.primaryElement}主象`,
    stock.star === signature.star ? `${stock.star}照命` : `${stock.star}星曜`,
    stock.beast === signature.beast ? `${stock.beast}同局` : `${stock.beast}守位`,
  ];

  return {
    code: stock.code,
    name: stock.name,
    kind: "股票",
    theme: `${stock.primaryElement}系 · ${stock.star}${stock.beast}`,
    mysticScore,
    explorationScore: stock.explorationScore,
    combinedScore,
    tags: [
      `${stock.primaryElement}${stock.secondaryElement}双象`,
      stock.yinYang,
      `${stock.star}星`,
      stock.beast,
      `${stock.palace}宫`,
      `${stock.number}号灵数`,
    ],
    rationale: `${matched.join("、")}，与本次命盘签名形成玄学共振；探索度 ${stock.explorationScore}，适合作为冷门灵感签。`,
    tieBreaker: stableHash(`${context.profileKey}|${stock.code}|rank`),
    primaryElement: stock.primaryElement,
    star: stock.star,
  };
}

export function rankMysticStocks(
  universe: MysticUniverse,
  context: MysticContext,
  limit = 6,
): { recommendations: Recommendation[]; signature: MysticSignature } {
  const signature = deriveSignature(context);
  const ranked = universe.stocks
    .filter((stock) => stock.explorationScore >= 62)
    .map((stock) => scoreStock(stock, context, signature))
    .sort((left, right) =>
      right.combinedScore - left.combinedScore
      || right.mysticScore - left.mysticScore
      || right.tieBreaker - left.tieBreaker,
    );

  const chosen: typeof ranked = [];
  const elementCounts = new Map<ElementName, number>();
  const starCounts = new Map<string, number>();
  for (const candidate of ranked) {
    if ((elementCounts.get(candidate.primaryElement) ?? 0) >= 2) continue;
    if ((starCounts.get(candidate.star) ?? 0) >= 2) continue;
    chosen.push(candidate);
    elementCounts.set(candidate.primaryElement, (elementCounts.get(candidate.primaryElement) ?? 0) + 1);
    starCounts.set(candidate.star, (starCounts.get(candidate.star) ?? 0) + 1);
    if (chosen.length === limit) break;
  }

  for (const candidate of ranked) {
    if (chosen.length === limit) break;
    if (!chosen.some((item) => item.code === candidate.code)) chosen.push(candidate);
  }

  return {
    signature,
    recommendations: chosen.map((candidate) => ({
      code: candidate.code,
      name: candidate.name,
      kind: candidate.kind,
      theme: candidate.theme,
      mysticScore: candidate.mysticScore,
      explorationScore: candidate.explorationScore,
      combinedScore: candidate.combinedScore,
      tags: candidate.tags,
      rationale: candidate.rationale,
    })),
  };
}
