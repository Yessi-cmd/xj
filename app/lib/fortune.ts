import { BEASTS, loadMysticUniverse, rankMysticStocks, stableHash } from "./mystic-ranking.ts";
import { resolveLocationLongitude } from "./locations.ts";
import type {
  AffinityProfile,
  DailyContext,
  DailyFortune,
  DailyRecommendation,
  MysticSignature,
} from "@/app/lib/mystic-ranking";

export const ELEMENTS = ["木", "火", "土", "金", "水"] as const;
export type ElementName = (typeof ELEMENTS)[number];
export type Gender = "male" | "female";

export const INDUSTRY_PREFERENCE_IDS = ELEMENTS;
export const BLOOD_TYPES = ["A", "B", "AB", "O"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];
export type DayNightPreference = "sun" | "moon";

export type BirthProfile = {
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  birthTimeKnown?: boolean;
  location: string;
  luckyNumber?: number;
  industryPreference?: ElementName;
  guardianBeast?: string;
  dayNight?: DayNightPreference;
  bloodType?: BloodType;
};

/** 进阶输入的确定性键：仅包含通过校验的值，未设置或非法值一律落为空串。 */
export function advancedInputKey(profile: Pick<BirthProfile, "luckyNumber" | "industryPreference" | "guardianBeast" | "dayNight" | "bloodType">): string {
  const luckyNumber = Number.isInteger(profile.luckyNumber) && (profile.luckyNumber as number) >= 1 && (profile.luckyNumber as number) <= 9 ? String(profile.luckyNumber) : "";
  const industry = INDUSTRY_PREFERENCE_IDS.includes(profile.industryPreference as ElementName) ? String(profile.industryPreference) : "";
  const beast = (BEASTS as readonly string[]).includes(profile.guardianBeast ?? "") ? String(profile.guardianBeast) : "";
  const dayNight = profile.dayNight === "sun" || profile.dayNight === "moon" ? profile.dayNight : "";
  const bloodType = BLOOD_TYPES.includes(profile.bloodType as BloodType) ? String(profile.bloodType) : "";
  return `${luckyNumber}|${industry}|${beast}|${dayNight}|${bloodType}`;
}

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
  recommendations: DailyRecommendation[];
  mysticSignature: MysticSignature;
  dailyContext: DailyContext;
  dailyFortune: DailyFortune;
  universeSize: number;
  universeSnapshot: string;
};

export type AnalyzeOptions = {
  dailyContext?: DailyContext;
  affinity?: AffinityProfile;
  recentPositiveCodes?: string[];
};

export function resolveBirthTimeInput(profile: BirthProfile): { time: string; estimated: boolean } {
  return profile.birthTimeKnown === false
    ? { time: "12:00", estimated: true }
    : { time: profile.birthTime, estimated: false };
}

const STEM_ELEMENT: Record<string, ElementName> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const BRANCH_ELEMENT: Record<string, ElementName> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
const PRODUCER: Record<ElementName, ElementName> = { 木: "水", 火: "木", 土: "火", 金: "土", 水: "金" };
const ARCHETYPES: Record<ElementName, string> = {
  木: "青木拓荒客", 火: "离火追光者", 土: "厚土守局人", 金: "白金决断派", 水: "玄水游猎家",
};
const FORTUNE_GRADES = ["灵光初现", "小吉可观", "青龙抬首", "上吉有缘", "紫气盈门"];
const LUCKY_COLORS: Record<ElementName, string> = { 木: "松烟青", 火: "朱砂红", 土: "琥珀黄", 金: "月魄白", 水: "玄青蓝" };
const LUCKY_HOURS = ["子时 23:00—01:00", "辰时 07:00—09:00", "巳时 09:00—11:00", "午时 11:00—13:00", "酉时 17:00—19:00", "亥时 21:00—23:00"];

function adjustClock(birthDate: string, birthTime: string, offsetMinutes: number) {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);
  const adjusted = new Date(Date.UTC(year, month - 1, day, hour, minute + offsetMinutes));
  return { year: adjusted.getUTCFullYear(), month: adjusted.getUTCMonth() + 1, day: adjusted.getUTCDate(), hour: adjusted.getUTCHours(), minute: adjusted.getUTCMinutes() };
}

function countElements(pillars: string[]): Record<ElementName, number> {
  const counts = Object.fromEntries(ELEMENTS.map((element) => [element, 0])) as Record<ElementName, number>;
  for (const pillar of pillars) {
    if (STEM_ELEMENT[pillar[0]]) counts[STEM_ELEMENT[pillar[0]]] += 1;
    if (BRANCH_ELEMENT[pillar[1]]) counts[BRANCH_ELEMENT[pillar[1]]] += 0.7;
  }
  return counts;
}

function toPercentages(counts: Record<ElementName, number>): Record<ElementName, number> {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(ELEMENTS.map((element) => [element, Math.round((counts[element] / total) * 100)])) as Record<ElementName, number>;
}

function destinyNumber(birthDate: string): number {
  const sum = [...birthDate].filter((value) => /\d/.test(value)).reduce((total, value) => total + Number(value), 0);
  return sum % 9 || 9;
}

export function getShanghaiDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

export function profileFingerprint(profile: BirthProfile): string {
  const birthTime = resolveBirthTimeInput(profile);
  return stableHash([profile.gender, profile.birthDate, birthTime.estimated ? "unknown-noon" : birthTime.time, profile.location, advancedInputKey(profile)].join("|")).toString(36);
}

export async function createDailyContext(date = new Date(), drawVersion: number = 0): Promise<DailyContext> {
  const dateKey = getShanghaiDateKey(date);
  const [year, month, day] = dateKey.split("-").map(Number);
  const { Solar } = await import("lunar-javascript");
  const lunar = Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar() as unknown as { getDayInGanZhi(): string };
  const dayPillar = lunar.getDayInGanZhi();
  return { dateKey, dayPillar, dayElement: STEM_ELEMENT[dayPillar[0]] ?? "土", drawVersion };
}

function makeDailyFortune(profileKey: string, daily: DailyContext): DailyFortune {
  const key = `${profileKey}|${daily.dateKey}|${daily.drawVersion}`;
  const luckyNumber = stableHash(`${key}|灵数`) % 9 || 9;
  const grade = FORTUNE_GRADES[stableHash(`${key}|吉`) % FORTUNE_GRADES.length];
  return {
    grade,
    title: `${daily.dayPillar}日 · ${daily.dayElement}气行运`,
    luckyHour: LUCKY_HOURS[stableHash(`${key}|时`) % LUCKY_HOURS.length],
    luckyColor: LUCKY_COLORS[daily.dayElement],
    luckyNumber,
    favorable: ["宜观冷门", "宜收一签", "宜午后复盘"],
    avoid: ["忌追热", "忌凭签下注"],
  };
}

export async function analyzeProfile(profile: BirthProfile, options: AnalyzeOptions = {}): Promise<FortuneResult> {
  const longitude = resolveLocationLongitude(profile.location);
  const birthTime = resolveBirthTimeInput(profile);
  const birthTimeKnown = !birthTime.estimated;
  const adjusted = adjustClock(profile.birthDate, birthTime.time, Math.round((longitude - 120) * 4));
  const { Solar } = await import("lunar-javascript");
  const lunar = Solar.fromYmdHms(adjusted.year, adjusted.month, adjusted.day, adjusted.hour, adjusted.minute, 0).getLunar();
  const eightChar = lunar.getEightChar();
  const pillarValues = [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()];
  const percentages = toPercentages(countElements(pillarValues));
  const ordered = [...ELEMENTS].sort((left, right) => percentages[left] - percentages[right]);
  const favorableElement = ordered[0];
  const dominantElement = ordered.at(-1) ?? "土";
  const dayMaster = STEM_ELEMENT[pillarValues[2][0]] ?? "土";
  const strength = percentages[dayMaster] + percentages[PRODUCER[dayMaster]] * 0.55 >= 30 ? "身强" : "身偏弱";
  const riskProfile = ARCHETYPES[favorableElement];
  const profileKey = [profile.gender, profile.birthDate, birthTime.estimated ? "unknown-noon" : birthTime.time, profile.location, advancedInputKey(profile), ...pillarValues].join("|");
  const dailyContext = options.dailyContext ?? await createDailyContext();
  const universe = await loadMysticUniverse();
  const ranked = rankMysticStocks(universe, {
    profileKey, favorableElement, dayMaster, dominantElement, gender: profile.gender,
    destinyNumber: destinyNumber(profile.birthDate), daily: dailyContext,
    luckyNumber: Number.isInteger(profile.luckyNumber) && (profile.luckyNumber as number) >= 1 && (profile.luckyNumber as number) <= 9 ? profile.luckyNumber : undefined,
    industryPreference: INDUSTRY_PREFERENCE_IDS.includes(profile.industryPreference as ElementName) ? profile.industryPreference : undefined,
    guardianBeast: (BEASTS as readonly string[]).includes(profile.guardianBeast ?? "") ? profile.guardianBeast : undefined,
    yinYangPreference: profile.dayNight === "sun" ? "阳" : profile.dayNight === "moon" ? "阴" : undefined,
    bloodType: BLOOD_TYPES.includes(profile.bloodType as BloodType) ? profile.bloodType : undefined,
    affinity: options.affinity, recentPositiveCodes: options.recentPositiveCodes,
  });
  const spread = percentages[dominantElement] - percentages[favorableElement];
  return {
    pillars: ["年柱", "月柱", "日柱", birthTimeKnown ? "时柱" : "时柱（估）"].map((label, index) => ({ label, value: pillarValues[index] })),
    lunarDate: lunar.toString(),
    trueSolarTime: `${birthTimeKnown ? "" : "约 "}${String(adjusted.hour).padStart(2, "0")}:${String(adjusted.minute).padStart(2, "0")}`,
    dayMaster, favorableElement, dominantElement,
    pattern: `${profile.gender === "male" ? "乾造" : "坤造"} · ${birthTimeKnown ? "真太阳时校正" : "时辰未录，以正午估算"} · ${dayMaster}日主${strength} · ${dominantElement}气偏旺`,
    riskProfile,
    summary: spread <= 8 ? `五行分布相对均衡，以${dayMaster}日主与流日寻缘。` : `${dominantElement}气相对集中，取${favorableElement}为调和之象，命盘化身为“${riskProfile}”。`,
    elementPercentages: percentages,
    recommendations: ranked.recommendations,
    mysticSignature: ranked.signature,
    dailyContext,
    dailyFortune: makeDailyFortune(profileKey, dailyContext),
    universeSize: universe.stockCount,
    universeSnapshot: universe.snapshotAt,
  };
}
