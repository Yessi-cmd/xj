import type { DailyContext } from "./mystic-ranking.ts";
import type { ElementName } from "./fortune.ts";

export type DailyFengShuiOverview = {
  dateKey: string;
  dayPillar: string;
  dayElement: ElementName;
  headline: string;
  summary: string;
  direction: string;
  activeTime: string;
  favorable: string;
  avoid: string;
};

type ElementOverview = Omit<DailyFengShuiOverview, "dateKey" | "dayPillar" | "dayElement" | "headline">;

const ELEMENT_OVERVIEWS: Record<ElementName, ElementOverview> = {
  木: {
    summary: "木气主生发与条达，适合让空间保持通透，从一件小事开始推进。",
    direction: "东方",
    activeTime: "卯时 05:00–07:00",
    favorable: "开窗纳气 · 整理动线 · 循序启新",
    avoid: "堆物阻路 · 急于求成",
  },
  火: {
    summary: "火气主明朗与外显，适合补足采光、清理视线，并把表达说得简明。",
    direction: "南方",
    activeTime: "午时 11:00–13:00",
    favorable: "增添光亮 · 清理桌面 · 坦诚沟通",
    avoid: "情绪过热 · 仓促定论",
  },
  土: {
    summary: "土气主承载与安定，适合稳住空间中心，先收拢杂物再安排次序。",
    direction: "中宫",
    activeTime: "辰时 07:00–09:00",
    favorable: "归置旧物 · 稳定作息 · 完成收尾",
    avoid: "反复折腾 · 贪多求快",
  },
  金: {
    summary: "金气主收敛与秩序，适合减少干扰、划清边界，让手边事务更利落。",
    direction: "西方",
    activeTime: "酉时 17:00–19:00",
    favorable: "精简陈设 · 校对细节 · 明确边界",
    avoid: "言辞过锐 · 临时加码",
  },
  水: {
    summary: "水气主流动与沉静，适合留出回旋空间，以观察和复盘代替贸然推进。",
    direction: "北方",
    activeTime: "子时 23:00–01:00",
    favorable: "留白静思 · 清理水位 · 复盘记录",
    avoid: "犹疑失序 · 随意下注",
  },
};

export function buildDailyFengShuiOverview(context: DailyContext): DailyFengShuiOverview {
  const overview = ELEMENT_OVERVIEWS[context.dayElement];
  return {
    dateKey: context.dateKey,
    dayPillar: context.dayPillar,
    dayElement: context.dayElement,
    headline: `${context.dayPillar}日 · ${context.dayElement}气当值`,
    ...overview,
  };
}
