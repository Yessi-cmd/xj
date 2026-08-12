"use client";

import {
  KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  formatLocationLabel,
  LOCATION_COUNT,
  searchLocations,
  type LocationOption,
} from "@/app/lib/locations";

type LocationPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

const LEVEL_LABELS = {
  city: "城市",
  county: "区县",
  region: "地区",
} as const;

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const searchResult = useMemo(() => searchLocations(query), [query]);
  const activeOption = searchResult.options[activeIndex];

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const chooseLocation = (location: LocationOption) => {
    onChange(location.label);
    setQuery(location.label);
    setOpen(false);
    inputRef.current?.focus();
  };

  const moveActiveOption = (direction: 1 | -1) => {
    if (!open) setOpen(true);
    setActiveIndex((current) => {
      const count = searchResult.options.length;
      if (!count) return 0;
      return (current + direction + count) % count;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveOption(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveOption(-1);
    } else if (event.key === "Enter" && open && activeOption) {
      event.preventDefault();
      chooseLocation(activeOption);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      className={`location-picker ${open ? "open" : ""}`}
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="location-input-wrap">
        <input
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={open && activeOption ? `${listboxId}-${activeOption.code}` : undefined}
          autoComplete="off"
          value={open ? query : formatLocationLabel(value)}
          placeholder="输入县、市或区名搜索"
          onFocus={(event) => {
            setQuery(value);
            setActiveIndex(0);
            setOpen(true);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <span className="location-chevron" aria-hidden="true">⌄</span>
      </div>

      {open && (
        <div className="location-picker-panel">
          <div className="location-picker-meta">
            <span>{query.trim() ? `找到 ${searchResult.total} 个地点` : "常用地点"}</span>
            <small>输入县、市或区名</small>
          </div>
          <div className="location-options" id={listboxId} role="listbox">
            {searchResult.options.length > 0 ? searchResult.options.map((location, index) => (
              <button
                type="button"
                id={`${listboxId}-${location.code}`}
                role="option"
                aria-selected={location.label === value}
                className={`location-option ${index === activeIndex ? "active" : ""}`}
                key={`${location.level}-${location.code}`}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseLocation(location)}
              >
                <span>
                  <strong>{location.shortName}</strong>
                  <small>{formatLocationLabel(location.label)}</small>
                </span>
                <b>{LEVEL_LABELS[location.level]}</b>
              </button>
            )) : (
              <p className="location-empty">未找到这个地点，请换一个县市名称试试。</p>
            )}
          </div>
          <div className="location-picker-foot">已收录全国 {LOCATION_COUNT.toLocaleString("zh-CN")} 个县市地点 · 本地经度校正</div>
        </div>
      )}
    </div>
  );
}
