"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type BirthDatePickerProps = {
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function parseDateKey(value: string): Date | null {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

function dateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function displayDate(value: string): string {
  return value.replaceAll("-", "/");
}

export default function BirthDatePicker({ value, min, max, onChange }: BirthDatePickerProps) {
  const selectedDate = parseDateKey(value) ?? parseDateKey(max) as Date;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)));
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const minYear = Number(min.slice(0, 4));
  const maxYear = Number(max.slice(0, 4));

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const days = useMemo(() => {
    const year = visibleMonth.getUTCFullYear();
    const month = visibleMonth.getUTCMonth();
    const mondayOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => new Date(Date.UTC(year, month, index - mondayOffset + 1)));
  }, [visibleMonth]);

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = parseDateKey(draft);
    if (!parsed) {
      setDraft(null);
      return;
    }
    const next = dateKey(parsed);
    if (next < min || next > max) {
      setDraft(null);
      return;
    }
    onChange(next);
    setDraft(null);
    setVisibleMonth(new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1)));
  };

  const changeMonth = (offset: number) => {
    const next = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + offset, 1));
    if (next.getUTCFullYear() < minYear || next.getUTCFullYear() > maxYear) return;
    setVisibleMonth(next);
  };

  return (
    <div className={`birth-date-picker${open ? " open" : ""}`} ref={rootRef}>
      <div className="birth-date-control">
        <input
          ref={inputRef}
          required
          inputMode="numeric"
          aria-label="出生日期，格式为年/月/日"
          aria-controls={panelId}
          value={draft ?? displayDate(value)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitDraft();
            if (event.key === "ArrowDown" && event.altKey) setOpen(true);
          }}
          placeholder="年/月/日"
        />
        <button
          type="button"
          aria-label="打开出生日期日历"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setVisibleMonth(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)));
            setOpen((current) => !current);
          }}
        ><span aria-hidden="true">日</span></button>
      </div>

      {open && (
        <section className="birth-calendar" id={panelId} role="dialog" aria-label="选择出生日期">
          <header>
            <button type="button" onClick={() => changeMonth(-1)} aria-label="上个月">‹</button>
            <div>
              <select
                aria-label="年份"
                value={visibleMonth.getUTCFullYear()}
                onChange={(event) => setVisibleMonth(new Date(Date.UTC(Number(event.target.value), visibleMonth.getUTCMonth(), 1)))}
              >
                {Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index).map((year) => <option key={year}>{year}</option>)}
              </select>
              <i>年</i>
              <select
                aria-label="月份"
                value={visibleMonth.getUTCMonth()}
                onChange={(event) => setVisibleMonth(new Date(Date.UTC(visibleMonth.getUTCFullYear(), Number(event.target.value), 1)))}
              >
                {Array.from({ length: 12 }, (_, month) => <option value={month} key={month}>{month + 1}</option>)}
              </select>
              <i>月</i>
            </div>
            <button type="button" onClick={() => changeMonth(1)} aria-label="下个月">›</button>
          </header>
          <div className="birth-calendar-weekdays" aria-hidden="true">{WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
          <div className="birth-calendar-days">
            {days.map((date) => {
              const key = dateKey(date);
              const outside = date.getUTCMonth() !== visibleMonth.getUTCMonth();
              const disabled = key < min || key > max;
              return <button
                type="button"
                key={key}
                disabled={disabled}
                className={`${outside ? "outside" : ""}${key === value ? " selected" : ""}${key === max ? " today" : ""}`}
                aria-label={`${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`}
                aria-pressed={key === value}
                onClick={() => {
                  onChange(key);
                  setDraft(null);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
              >{date.getUTCDate()}</button>;
            })}
          </div>
          <footer>
            <button type="button" onClick={() => {
              onChange(max);
              setDraft(null);
              setOpen(false);
            }}>今 日</button>
            <span>公历 · 北京时间日期边界</span>
          </footer>
        </section>
      )}
    </div>
  );
}
