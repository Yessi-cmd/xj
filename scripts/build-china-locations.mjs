import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  VERSION as divisionVersion,
  citiesCode,
  countiesCode,
  provincesCode,
} from "cn-division";

const COORDINATE_SOURCE_COMMIT = "7aa2c5fabc6a892015625898c3482874b233f9de";
const COORDINATE_SOURCE_URL = `https://raw.githubusercontent.com/zhChuXiao/ChinaGeoJson/${COORDINATE_SOURCE_COMMIT}/info.json`;

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, "../app/data/china-locations.json");

const response = await fetch(COORDINATE_SOURCE_URL);
if (!response.ok) {
  throw new Error(`地点坐标数据下载失败：HTTP ${response.status}`);
}

const coordinateData = await response.json();
const coordinateEntries = Object.values(coordinateData);
const coordinateByCode = new Map(
  coordinateEntries
    .filter((entry) => Array.isArray(entry.center) && Number.isFinite(entry.center[0]))
    .map((entry) => [String(entry.adcode), entry]),
);

const provincesByCode = new Map(
  provincesCode.map((province) => [String(province.c).padStart(2, "0"), province.n]),
);
const citiesByCode = new Map(
  citiesCode.map((city) => [String(city.c).padStart(4, "0"), city.n]),
);

let exactCoordinateCount = 0;
let parentCoordinateCount = 0;

function resolveCoordinate(code, parentCodes) {
  const candidates = [code, ...parentCodes];
  for (const [index, candidate] of candidates.entries()) {
    const entry = coordinateByCode.get(candidate);
    if (!entry) continue;
    if (index === 0) exactCoordinateCount += 1;
    else parentCoordinateCount += 1;
    return Number(entry.center[0].toFixed(6));
  }
  throw new Error(`无法为行政区划 ${code} 解析经度`);
}

function joinLabel(...parts) {
  return [...new Set(parts.filter(Boolean))].join(" / ");
}

const mainlandCities = citiesCode.map((city) => {
  const code = String(city.c).padStart(4, "0");
  const provinceCode = String(city.p).padStart(2, "0");
  const province = provincesByCode.get(provinceCode);
  if (!province) throw new Error(`城市 ${city.n} 缺少省级归属`);
  const longitude = resolveCoordinate(
    `${code}00`,
    [`${provinceCode}0000`],
  );
  return [code, joinLabel(province, city.n), city.n, longitude, "city"];
});

const mainlandCounties = countiesCode.map((county) => {
  const code = String(county.c);
  const cityCode = String(county.cc).padStart(4, "0");
  const provinceCode = cityCode.slice(0, 2);
  const province = provincesByCode.get(provinceCode);
  const city = citiesByCode.get(cityCode);
  if (!province || !city) throw new Error(`区县 ${county.n} 缺少省市归属`);
  const longitude = resolveCoordinate(
    code.length === 6 ? code : code.slice(0, 6),
    [`${cityCode}00`, `${provinceCode}0000`],
  );
  return [code, joinLabel(province, city, county.n), county.n, longitude, "county"];
});

const supplementalRegions = ["710000", "810000", "820000"].flatMap((provinceCode) => {
  const province = coordinateByCode.get(provinceCode);
  if (!province) return [];
  const provinceEntry = [
    provinceCode,
    province.name,
    province.name,
    Number(province.center[0].toFixed(6)),
    "region",
  ];
  const children = (province.children ?? []).map((child) => [
    String(child.adcode),
    joinLabel(province.name, child.name),
    child.name,
    Number(child.center[0].toFixed(6)),
    child.level === "city" ? "city" : "county",
  ]);
  return [provinceEntry, ...children];
});

const locations = [...mainlandCities, ...mainlandCounties, ...supplementalRegions]
  .sort((left, right) => String(left[0]).localeCompare(String(right[0]), "en"));

const uniqueLabels = new Set(locations.map((location) => location[1]));
if (uniqueLabels.size !== locations.length) {
  throw new Error(`地点标签存在重复：${locations.length - uniqueLabels.size} 条`);
}

const lines = [
  "{",
  "  \"schemaVersion\": 1,",
  `  "divisionVersion": ${JSON.stringify(divisionVersion)},`,
  `  "coordinateSourceCommit": ${JSON.stringify(COORDINATE_SOURCE_COMMIT)},`,
  `  "locationCount": ${locations.length},`,
  "  \"locations\": [",
  ...locations.map((location, index) => `    ${JSON.stringify(location)}${index === locations.length - 1 ? "" : ","}`),
  "  ]",
  "}",
  "",
];

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, lines.join("\n"), "utf8");

console.log(`已生成 ${locations.length} 个全国县市地点：${outputPath}`);
console.log(`精确坐标 ${exactCoordinateCount} 条，沿用上级经度 ${parentCoordinateCount} 条。`);
