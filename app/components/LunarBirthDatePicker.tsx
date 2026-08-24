"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getLunarMonthOptions,
  lunarBirthDateToSolar,
  type LunarBirthDate,
  type LunarMonthOption,
} from "@/app/lib/lunar-date";

type LunarBirthDatePickerProps = {
  value?: LunarBirthDate;
  min: string;
  max: string;
  onChange: (lunarDate: LunarBirthDate, solarDate: string) => void;
};

const LUNAR_DAY_NAMES = [
  "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

export default function LunarBirthDatePicker({ value, min, max, onChange }: LunarBirthDatePickerProps) {
  const [months, setMonths] = useState<LunarMonthOption[]>([]);
  const [solarDate, setSolarDate] = useState("");
  const [error, setError] = useState("");
  const [draftYear, setDraftYear] = useState<number | "">("");
  const [draftMonth, setDraftMonth] = useState<number | "">("");
  const [draftDay, setDraftDay] = useState<number | "">("");
  const minYear = Number(min.slice(0, 4)) - 1;
  const maxYear = Number(max.slice(0, 4));
  const selectedYear = value?.year ?? draftYear;
  const selectedMonth = value ? (value.isLeap ? -value.month : value.month) : draftMonth;
  const selectedDay = value?.day ?? draftDay;
  const currentMonth = months.find((month) => month.value === selectedMonth);
  const dayCount = currentMonth?.dayCount ?? 30;
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index), [maxYear, minYear]);

  useEffect(() => {
    if (typeof selectedYear !== "number") return;
    let active = true;
    void getLunarMonthOptions(selectedYear).then((options) => {
      if (active) setMonths(options);
    });
    return () => { active = false; };
  }, [selectedYear]);

  useEffect(() => {
    if (!value) return;
    let active = true;
    void lunarBirthDateToSolar(value).then((nextSolarDate) => {
      if (!active) return;
      setSolarDate(nextSolarDate);
      setError(nextSolarDate < min || nextSolarDate > max ? "该农历日期超出可选范围" : "");
    }).catch(() => {
      if (active) setError("该农历日期无效");
    });
    return () => { active = false; };
  }, [max, min, value]);

  const commit = async (next: LunarBirthDate) => {
    try {
      const nextSolarDate = await lunarBirthDateToSolar(next);
      if (nextSolarDate < min || nextSolarDate > max) {
        setError("该农历日期超出可选范围");
        return;
      }
      setError("");
      setSolarDate(nextSolarDate);
      onChange(next, nextSolarDate);
    } catch {
      setError("该农历日期无效");
    }
  };

  const changeYear = async (year: number) => {
    const options = await getLunarMonthOptions(year);
    setMonths(options);
    if (!value) {
      setDraftYear(year);
      setDraftMonth("");
      setDraftDay("");
      setError("");
      return;
    }
    const matchingMonth = options.find((month) => month.value === selectedMonth)
      ?? options.find((month) => month.value === value.month)
      ?? options[0];
    if (!matchingMonth) return;
    await commit({
      year,
      month: Math.abs(matchingMonth.value),
      day: Math.min(value.day, matchingMonth.dayCount),
      isLeap: matchingMonth.value < 0,
    });
  };

  const changeMonth = async (signedMonth: number) => {
    const option = months.find((month) => month.value === signedMonth);
    if (!option) return;
    if (!value) {
      setDraftMonth(signedMonth);
      setDraftDay("");
      setError("");
      return;
    }
    await commit({
      ...value,
      month: Math.abs(signedMonth),
      day: Math.min(value.day, option.dayCount),
      isLeap: signedMonth < 0,
    });
  };

  const changeDay = async (day: number) => {
    if (value) {
      await commit({ ...value, day });
      return;
    }
    setDraftDay(day);
    if (typeof selectedYear !== "number" || typeof selectedMonth !== "number") return;
    await commit({
      year: selectedYear,
      month: Math.abs(selectedMonth),
      day,
      isLeap: selectedMonth < 0,
    });
  };

  return (
    <div className="lunar-birth-date-picker">
      <div className="lunar-birth-date-control">
        <select aria-label="农历出生年份" required value={selectedYear} onChange={(event) => void changeYear(Number(event.target.value))}>
          <option value="" disabled>年份</option>
          {years.map((year) => <option value={year} key={year}>{year}年</option>)}
        </select>
        <select aria-label="农历出生月份" required disabled={typeof selectedYear !== "number"} value={selectedMonth} onChange={(event) => void changeMonth(Number(event.target.value))}>
          <option value="" disabled>月份</option>
          {months.map((month) => <option value={month.value} key={month.value}>{month.label}</option>)}
        </select>
        <select aria-label="农历出生日期" required disabled={typeof selectedMonth !== "number"} value={typeof selectedDay === "number" ? Math.min(selectedDay, dayCount) : ""} onChange={(event) => void changeDay(Number(event.target.value))}>
          <option value="" disabled>日期</option>
          {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => <option value={day} key={day}>{LUNAR_DAY_NAMES[day - 1]}</option>)}
        </select>
      </div>
      <small className={error ? "lunar-date-note error" : "lunar-date-note"} aria-live="polite">
        {error || (solarDate ? `对应公历 ${solarDate.replaceAll("-", "/")}` : "请依次选择农历年、月、日")}
      </small>
    </div>
  );
}
