import {
  loadMysticUniverse,
  rankMysticStocks,
} from "@/app/lib/mystic-ranking";
import type {
  MysticSignature,
  Recommendation,
} from "@/app/lib/mystic-ranking";

export const ELEMENTS = ["木", "火", "土", "金", "水"] as const;

export type ElementName = (typeof ELEMENTS)[number];
export type Gender = "male" | "female";

export type BirthProfile = {
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  location: string;
};

export type FortuneResult = {
  pillars: Array<{ label: string; value: string }>;
  lunarDate: string;
  trueSolarTime: string;
  dayMaster: ElementName;
  favorableElement: ElementName;
  dominantElement: ElementName;
  pattern: string;
  riskProfile: string;
  summary: string;
  elementPercentages: Record<ElementName, number>;
  factorWeights: Array<{ name: string; label: string; weight: number }>;
  recommendations: Recommendation[];
  mysticSignature: MysticSignature;
  universeSize: number;
  universeSnapshot: string;
  methodologyNote: string;
};

export const LOCATIONS = [
  { name: "北京市", longitude: 116.4074 },
  { name: "上海市", longitude: 121.4737 },
  { name: "广州市", longitude: 113.2644 },
  { name: "深圳市", longitude: 114.0579 },
  { name: "杭州市", longitude: 120.1551 },
  { name: "成都市", longitude: 104.0665 },
  { name: "武汉市", longitude: 114.3054 },
  { name: "西安市", longitude: 108.9398 },
  { name: "乌鲁木齐市", longitude: 87.6168 },
] as const;

const STEM_ELEMENT: Record<string, ElementName> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

const BRANCH_ELEMENT: Record<string, ElementName> = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水",
};

const MYSTIC_FACTORS = [
  { name: "element", label: "五行喜用", weight: 1.3 },
  { name: "star", label: "星曜同频", weight: 1.2 },
  { name: "time", label: "时柱卦位", weight: 1.08 },
  { name: "number", label: "灵数共振", weight: 0.96 },
  { name: "yin_yang", label: "阴阳调和", weight: 0.88 },
];

const PRODUCER: Record<ElementName, ElementName> = {
  木: "水",
  火: "木",
  土: "火",
  金: "土",
  水: "金",
};

const ARCHETYPES: Record<ElementName, string> = {
  木: "青木拓荒客",
  火: "离火追光者",
  土: "厚土守局人",
  金: "白金决断派",
  水: "玄水游猎家",
};

function adjustClock(
  birthDate: string,
  birthTime: string,
  offsetMinutes: number,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);
  const adjusted = new Date(
    Date.UTC(year, month - 1, day, hour, minute + offsetMinutes, 0),
  );
  return {
    year: adjusted.getUTCFullYear(),
    month: adjusted.getUTCMonth() + 1,
    day: adjusted.getUTCDate(),
    hour: adjusted.getUTCHours(),
    minute: adjusted.getUTCMinutes(),
  };
}

function countElements(pillars: string[]): Record<ElementName, number> {
  const counts = Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as Record<ElementName, number>;
  for (const pillar of pillars) {
    const stemElement = STEM_ELEMENT[pillar[0]];
    const branchElement = BRANCH_ELEMENT[pillar[1]];
    if (stemElement) counts[stemElement] += 1;
    if (branchElement) counts[branchElement] += 0.7;
  }
  return counts;
}

function toPercentages(counts: Record<ElementName, number>): Record<ElementName, number> {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(
    ELEMENTS.map((element) => [element, Math.round((counts[element] / total) * 100)]),
  ) as Record<ElementName, number>;
}

function destinyNumber(birthDate: string): number {
  const sum = [...birthDate].filter((value) => /\d/.test(value)).reduce((total, value) => total + Number(value), 0);
  return sum % 9 || 9;
}

export async function analyzeProfile(profile: BirthProfile): Promise<FortuneResult> {
  const location = LOCATIONS.find((item) => item.name === profile.location) ?? LOCATIONS[0];
  const trueSolarOffset = Math.round((location.longitude - 120) * 4);
  const adjusted = adjustClock(profile.birthDate, profile.birthTime, trueSolarOffset);
  const { Solar } = await import("lunar-javascript");
  const solar = Solar.fromYmdHms(
    adjusted.year,
    adjusted.month,
    adjusted.day,
    adjusted.hour,
    adjusted.minute,
    0,
  );
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const pillarValues = [
    eightChar.getYear(),
    eightChar.getMonth(),
    eightChar.getDay(),
    eightChar.getTime(),
  ];
  const counts = countElements(pillarValues);
  const percentages = toPercentages(counts);
  const ordered = [...ELEMENTS].sort((left, right) => percentages[left] - percentages[right]);
  const favorableElement = ordered[0];
  const dominantElement = ordered.at(-1) ?? "土";
  const dayMaster = STEM_ELEMENT[pillarValues[2][0]] ?? "土";
  const resourceElement = PRODUCER[dayMaster];
  const support = percentages[dayMaster] + percentages[resourceElement] * 0.55;
  const strength = support >= 30 ? "身强" : "身偏弱";
  const balanceSpread = percentages[dominantElement] - percentages[favorableElement];
  const riskProfile = ARCHETYPES[favorableElement];
  const universe = await loadMysticUniverse();
  const profileKey = [
    profile.gender,
    profile.birthDate,
    profile.birthTime,
    profile.location,
    ...pillarValues,
  ].join("|");
  const ranked = rankMysticStocks(universe, {
    profileKey,
    favorableElement,
    dayMaster,
    dominantElement,
    gender: profile.gender,
    destinyNumber: destinyNumber(profile.birthDate),
  });

  const genderLabel = profile.gender === "male" ? "乾造" : "坤造";
  const pattern = `${genderLabel} · ${dayMaster}日主${strength} · ${dominantElement}气偏旺`;
  const summary = balanceSpread <= 8
    ? `五行分布相对均衡，本局以${dayMaster}日主和灵数共振寻找隐藏缘分。`
    : `${dominantElement}元素相对集中，取${favorableElement}为调和之象，命盘化身为“${riskProfile}”。`;

  return {
    pillars: ["年柱", "月柱", "日柱", "时柱"].map((label, index) => ({
      label,
      value: pillarValues[index],
    })),
    lunarDate: lunar.toString(),
    trueSolarTime: `${String(adjusted.hour).padStart(2, "0")}:${String(adjusted.minute).padStart(2, "0")}`,
    dayMaster,
    favorableElement,
    dominantElement,
    pattern,
    riskProfile,
    summary,
    elementPercentages: percentages,
    factorWeights: MYSTIC_FACTORS,
    recommendations: ranked.recommendations,
    mysticSignature: ranked.signature,
    universeSize: universe.stockCount,
    universeSnapshot: universe.snapshotAt,
    methodologyNote:
      "缘分分 = 命理共振 70% + 小众探索 20% + 基础过滤 10%。小众探索是娱乐化玄学标签，不代表市值、流动性或投资价值。",
  };
}
