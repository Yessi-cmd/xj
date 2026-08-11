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

export type Recommendation = {
  code: string;
  name: string;
  kind: "股票" | "基金";
  theme: string;
  quantScore: number;
  elementScore: number;
  combinedScore: number;
  rationale: string;
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

const ELEMENT_FACTORS: Record<
  ElementName,
  Array<{ name: string; label: string; weight: number }>
> = {
  木: [
    { name: "growth", label: "成长", weight: 1.3 },
    { name: "quality", label: "质量", weight: 1.15 },
    { name: "momentum", label: "动量", weight: 1.05 },
    { name: "value", label: "价值", weight: 0.9 },
    { name: "low_risk", label: "低波", weight: 0.9 },
  ],
  火: [
    { name: "momentum", label: "动量", weight: 1.3 },
    { name: "growth", label: "成长", weight: 1.2 },
    { name: "quality", label: "质量", weight: 1.0 },
    { name: "value", label: "价值", weight: 0.85 },
    { name: "low_risk", label: "低波", weight: 0.85 },
  ],
  土: [
    { name: "quality", label: "质量", weight: 1.25 },
    { name: "low_risk", label: "低波", weight: 1.2 },
    { name: "value", label: "价值", weight: 1.1 },
    { name: "growth", label: "成长", weight: 0.9 },
    { name: "momentum", label: "动量", weight: 0.85 },
  ],
  金: [
    { name: "value", label: "价值", weight: 1.3 },
    { name: "quality", label: "质量", weight: 1.15 },
    { name: "low_risk", label: "低波", weight: 1.0 },
    { name: "momentum", label: "动量", weight: 0.9 },
    { name: "growth", label: "成长", weight: 0.85 },
  ],
  水: [
    { name: "low_risk", label: "低波", weight: 1.3 },
    { name: "value", label: "价值", weight: 1.15 },
    { name: "quality", label: "质量", weight: 1.1 },
    { name: "growth", label: "成长", weight: 0.9 },
    { name: "momentum", label: "动量", weight: 0.85 },
  ],
};

const CANDIDATES: Record<
  ElementName,
  Array<Omit<Recommendation, "combinedScore">>
> = {
  木: [
    { code: "300750", name: "宁德时代", kind: "股票", theme: "新能源成长", quantScore: 86, elementScore: 91, rationale: "成长与质量因子占优，作为木元素扩张主题的研究样本。" },
    { code: "601012", name: "隆基绿能", kind: "股票", theme: "绿色制造", quantScore: 78, elementScore: 88, rationale: "以产业成长弹性承接木元素的生发倾向。" },
    { code: "000333", name: "美的集团", kind: "股票", theme: "制造升级", quantScore: 84, elementScore: 82, rationale: "质量底仓与长期成长的平衡样本。" },
    { code: "159915", name: "创业板ETF", kind: "基金", theme: "成长宽基", quantScore: 82, elementScore: 90, rationale: "用分散化工具表达成长偏好，降低单一个股依赖。" },
    { code: "516160", name: "新能源ETF", kind: "基金", theme: "绿色产业", quantScore: 76, elementScore: 88, rationale: "对应木元素的成长与绿色产业主题。" },
  ],
  火: [
    { code: "002230", name: "科大讯飞", kind: "股票", theme: "人工智能", quantScore: 80, elementScore: 92, rationale: "动量与科技热度作为火元素主题的研究样本。" },
    { code: "300308", name: "中际旭创", kind: "股票", theme: "光通信", quantScore: 87, elementScore: 91, rationale: "高景气科技链样本，强调动量信号而非主观追涨。" },
    { code: "600276", name: "恒瑞医药", kind: "股票", theme: "创新医药", quantScore: 83, elementScore: 80, rationale: "创新属性与质量约束并重。" },
    { code: "512480", name: "半导体ETF", kind: "基金", theme: "科技制造", quantScore: 81, elementScore: 90, rationale: "以行业基金承接火元素的科技与动量偏好。" },
    { code: "515880", name: "通信ETF", kind: "基金", theme: "数字基础设施", quantScore: 84, elementScore: 88, rationale: "分散布局数字基础设施的主题样本。" },
  ],
  土: [
    { code: "600519", name: "贵州茅台", kind: "股票", theme: "消费龙头", quantScore: 89, elementScore: 88, rationale: "盈利质量与现金流稳定性契合土元素的守成倾向。" },
    { code: "600036", name: "招商银行", kind: "股票", theme: "优质金融", quantScore: 86, elementScore: 86, rationale: "质量、价值和稳健风格的综合样本。" },
    { code: "601318", name: "中国平安", kind: "股票", theme: "综合金融", quantScore: 82, elementScore: 84, rationale: "以价值和低波约束表达稳健配置。" },
    { code: "510300", name: "沪深300ETF", kind: "基金", theme: "核心宽基", quantScore: 88, elementScore: 91, rationale: "核心资产分散配置，作为土元素的组合底座。" },
    { code: "512880", name: "证券ETF", kind: "基金", theme: "金融行业", quantScore: 77, elementScore: 79, rationale: "金融主题样本，需受组合行业上限约束。" },
  ],
  金: [
    { code: "601088", name: "中国神华", kind: "股票", theme: "资源价值", quantScore: 88, elementScore: 91, rationale: "价值、现金流与股息特征契合金元素的收敛倾向。" },
    { code: "601668", name: "中国建筑", kind: "股票", theme: "低估值央企", quantScore: 83, elementScore: 87, rationale: "低估值与规模质量的研究样本。" },
    { code: "600030", name: "中信证券", kind: "股票", theme: "头部券商", quantScore: 81, elementScore: 83, rationale: "以行业龙头和价值因子承接金元素主题。" },
    { code: "510050", name: "上证50ETF", kind: "基金", theme: "大盘价值", quantScore: 86, elementScore: 90, rationale: "聚焦大盘价值并提供基金级分散。" },
    { code: "512800", name: "银行ETF", kind: "基金", theme: "高股息金融", quantScore: 84, elementScore: 88, rationale: "价值与低波特征较集中，仍需行业限额。" },
  ],
  水: [
    { code: "600900", name: "长江电力", kind: "股票", theme: "公用事业", quantScore: 91, elementScore: 93, rationale: "低波、现金流与防御属性契合水元素的流动与守御。" },
    { code: "600886", name: "国投电力", kind: "股票", theme: "清洁电力", quantScore: 86, elementScore: 90, rationale: "以稳健公用事业样本承接低波倾向。" },
    { code: "601006", name: "大秦铁路", kind: "股票", theme: "交通运输", quantScore: 82, elementScore: 84, rationale: "现金流与价值特征兼顾的防御样本。" },
    { code: "512170", name: "医疗ETF", kind: "基金", theme: "防御行业", quantScore: 80, elementScore: 85, rationale: "用基金分散表达防御与长期需求主题。" },
    { code: "515450", name: "红利低波ETF", kind: "基金", theme: "低波红利", quantScore: 89, elementScore: 92, rationale: "低波与价值因子共同构成组合防守底座。" },
  ],
};

const PRODUCER: Record<ElementName, ElementName> = {
  木: "水",
  火: "木",
  土: "火",
  金: "土",
  水: "金",
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

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
  const riskProfile =
    favorableElement === "木" || favorableElement === "火"
      ? "成长进取"
      : favorableElement === "土"
        ? "均衡稳健"
        : "价值防守";
  const factorWeights = ELEMENT_FACTORS[favorableElement];
  const recommendations = CANDIDATES[favorableElement].map((candidate) => ({
    ...candidate,
    combinedScore: Math.round(candidate.quantScore * 0.85 + candidate.elementScore * 0.15),
  }));

  const genderLabel = profile.gender === "male" ? "乾造" : "坤造";
  const pattern = `${genderLabel} · ${dayMaster}日主${strength} · ${dominantElement}气偏旺`;
  const summary =
    balanceSpread <= 8
      ? `五行分布相对均衡，以${dayMaster}日主为核心，组合上更适合保持因子分散。`
      : `${dominantElement}元素相对集中，原型引擎以${favorableElement}作为平衡倾向，映射为${riskProfile}型研究偏好。`;

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
    factorWeights,
    recommendations,
    methodologyNote:
      "组合分数 = AShare 量化基础分 × 85% + 命理偏好匹配 × 15%。命理层只做轻量偏好调整，不覆盖基本面、风险与可交易性约束。",
  };
}

export function recommendationWeight(score: number): number {
  return clamp(Math.round((score - 70) * 0.45 + 4), 4, 12);
}
