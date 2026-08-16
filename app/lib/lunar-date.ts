export type LunarBirthDate = {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
};

export type LunarMonthOption = {
  value: number;
  label: string;
  dayCount: number;
};

type LunarRuntime = {
  Lunar: {
    fromYmd(year: number, month: number, day: number): {
      getSolar(): { getYear(): number; getMonth(): number; getDay(): number };
    };
  };
  LunarYear: {
    fromYear(year: number): {
      getMonthsInYear(): Array<{
        getMonth(): number;
        getDayCount(): number;
        isLeap(): boolean;
      }>;
    };
  };
  Solar: {
    fromYmd(year: number, month: number, day: number): {
      getLunar(): { getYear(): number; getMonth(): number; getDay(): number };
    };
  };
};

const LUNAR_MONTH_NAMES = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(value: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("公历日期格式无效。");
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

async function loadLunarRuntime(): Promise<LunarRuntime> {
  return await import("lunar-javascript") as unknown as LunarRuntime;
}

export function isLunarBirthDate(value: unknown): value is LunarBirthDate {
  if (!value || typeof value !== "object") return false;
  const date = value as Record<string, unknown>;
  return Number.isInteger(date.year)
    && Number.isInteger(date.month)
    && Number.isInteger(date.day)
    && (date.year as number) >= 1900
    && (date.year as number) <= 2200
    && (date.month as number) >= 1
    && (date.month as number) <= 12
    && (date.day as number) >= 1
    && (date.day as number) <= 30
    && typeof date.isLeap === "boolean";
}

export async function getLunarMonthOptions(year: number): Promise<LunarMonthOption[]> {
  const { LunarYear } = await loadLunarRuntime();
  return LunarYear.fromYear(year).getMonthsInYear().map((month) => {
    const signedMonth = month.getMonth();
    const monthNumber = Math.abs(signedMonth);
    const isLeap = month.isLeap();
    return {
      value: signedMonth,
      label: `${isLeap ? "闰" : ""}${LUNAR_MONTH_NAMES[monthNumber - 1]}月`,
      dayCount: month.getDayCount(),
    };
  });
}

export async function lunarBirthDateToSolar(value: LunarBirthDate): Promise<string> {
  if (!isLunarBirthDate(value)) throw new Error("农历日期无效。");
  const { Lunar } = await loadLunarRuntime();
  const signedMonth = value.isLeap ? -value.month : value.month;
  const solar = Lunar.fromYmd(value.year, signedMonth, value.day).getSolar();
  return formatDateKey(solar.getYear(), solar.getMonth(), solar.getDay());
}

export async function solarDateToLunarBirthDate(value: string): Promise<LunarBirthDate> {
  const [year, month, day] = parseDateKey(value);
  const { Solar } = await loadLunarRuntime();
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const signedMonth = lunar.getMonth();
  return {
    year: lunar.getYear(),
    month: Math.abs(signedMonth),
    day: lunar.getDay(),
    isLeap: signedMonth < 0,
  };
}
