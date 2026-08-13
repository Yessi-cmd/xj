"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  formatLocationLabel,
  LOCATION_COUNT,
  LOCATION_HIERARCHY,
  resolveLocationPath,
  type CityLocationOption,
  type ProvinceLocationOption,
} from "@/app/lib/locations";

type LocationPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

function includesName(name: string, query: string): boolean {
  return name.toLocaleLowerCase("zh-CN").includes(query.trim().toLocaleLowerCase("zh-CN"));
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const resolvedPath = useMemo(() => resolveLocationPath(value), [value]);
  const [open, setOpen] = useState(false);
  const [provinceCode, setProvinceCode] = useState(resolvedPath.province.code);
  const [cityCode, setCityCode] = useState(resolvedPath.city.code);
  const [provinceQuery, setProvinceQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [countyQuery, setCountyQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
        return;
      }
      // 移动端遮罩是容器的伪元素，点击会解析到容器自身，同样视为“面板之外”
      if (target === rootRef.current) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const selectedProvince = LOCATION_HIERARCHY.find((province) => province.code === provinceCode)
    ?? resolvedPath.province;
  const selectedCity = selectedProvince.cities.find((city) => city.code === cityCode)
    ?? selectedProvince.cities[0]
    ?? resolvedPath.city;

  const provinces = LOCATION_HIERARCHY.filter((province) => includesName(province.name, provinceQuery));
  const cities = selectedProvince.cities.filter((city) => includesName(city.name, cityQuery));
  const counties = selectedCity.counties.filter((county) => includesName(county.name, countyQuery));

  const resetQueries = () => {
    setProvinceQuery("");
    setCityQuery("");
    setCountyQuery("");
  };

  const chooseProvince = (province: ProvinceLocationOption) => {
    setProvinceCode(province.code);
    setCityCode(province.cities[0]?.code ?? "");
    setCityQuery("");
    setCountyQuery("");
  };

  const chooseCity = (city: CityLocationOption) => {
    setCityCode(city.code);
    setCountyQuery("");
    if (city.counties.length === 0) {
      onChange(city.location.label);
      setOpen(false);
    }
  };

  const chooseCityLevel = () => {
    onChange(selectedCity.location.label);
    setOpen(false);
  };

  return (
    <div
      className={`location-picker location-cascade ${open ? "open" : ""}`}
      ref={rootRef}
      onBlur={(event) => {
        // iOS Safari 点击不可聚焦元素时 relatedTarget 为 null，不能据此关闭面板
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="location-trigger"
        ref={triggerRef}
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          resetQueries();
          if (!open) {
            setProvinceCode(resolvedPath.province.code);
            setCityCode(resolvedPath.city.code);
          }
          setOpen(!open);
        }}
      >
        <span>
          <strong>{formatLocationLabel(value)}</strong>
          <small>省级 / 市级 / 县区级</small>
        </span>
        <b aria-hidden="true">⌄</b>
      </button>

      {open && (
        <section className="location-cascade-panel" id={panelId} aria-label="选择出生地点">
          <header>
            <div>
              <strong>逐级选择出生地点</strong>
              <small>先选省级，再选市级，最后选县区级</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="关闭地点选择">×</button>
          </header>

          <div className="location-cascade-columns">
            <section className="location-level" aria-label="省级">
              <div className="location-level-heading"><b>一</b><span>省级</span><small>{LOCATION_HIERARCHY.length}</small></div>
              <input value={provinceQuery} onChange={(event) => setProvinceQuery(event.target.value)} placeholder="查找省份" aria-label="查找省份" />
              <div className="location-level-options">
                {provinces.map((province) => (
                  <button
                    type="button"
                    className={province.code === selectedProvince.code ? "selected" : ""}
                    aria-pressed={province.code === selectedProvince.code}
                    key={province.code}
                    onClick={() => chooseProvince(province)}
                  >
                    <span>{province.name}</span><b>›</b>
                  </button>
                ))}
              </div>
            </section>

            <section className="location-level" aria-label="市级">
              <div className="location-level-heading"><b>二</b><span>市级</span><small>{selectedProvince.cities.length}</small></div>
              <input value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="查找城市" aria-label="查找城市" />
              <div className="location-level-options">
                {cities.map((city) => (
                  <button
                    type="button"
                    className={city.code === selectedCity.code ? "selected" : ""}
                    aria-pressed={city.code === selectedCity.code}
                    key={city.code}
                    onClick={() => chooseCity(city)}
                  >
                    <span>{city.name}</span><b>›</b>
                  </button>
                ))}
              </div>
            </section>

            <section className="location-level county-level" aria-label="县区级">
              <div className="location-level-heading"><b>三</b><span>县区级</span><small>{selectedCity.counties.length}</small></div>
              <input value={countyQuery} onChange={(event) => setCountyQuery(event.target.value)} placeholder="查找县区" aria-label="查找县区" disabled={selectedCity.counties.length === 0} />
              <div className="location-level-options">
                {selectedCity.counties.length > 0 && (
                  <button type="button" className={!resolvedPath.county && value === selectedCity.location.label ? "selected" : ""} onClick={chooseCityLevel}>
                    <span>不细分，按{selectedCity.name}</span><b>市级</b>
                  </button>
                )}
                {counties.map((county) => (
                  <button
                    type="button"
                    className={county.location.label === value ? "selected" : ""}
                    aria-pressed={county.location.label === value}
                    key={county.code}
                    onClick={() => {
                      onChange(county.location.label);
                      setOpen(false);
                    }}
                  >
                    <span>{county.name}</span><b>选定</b>
                  </button>
                ))}
                {selectedCity.counties.length === 0 && <p>该地区无下级县区，选择市级后即完成。</p>}
              </div>
            </section>
          </div>

          <footer>
            <span>当前路径</span>
            <strong>{selectedProvince.name} · {selectedCity.name}{resolvedPath.county && resolvedPath.city.code === selectedCity.code ? ` · ${resolvedPath.county.name}` : ""}</strong>
            <small>全国 {LOCATION_COUNT.toLocaleString("zh-CN")} 个县市地点 · 仅在本机用于经度校正</small>
          </footer>
        </section>
      )}
    </div>
  );
}
