import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API_URL = "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=1.000001,0.399001,0.399006&fields=f12,f14,f2,f3,f4,f124";
const OUTPUT_PATH = resolve("app/data/market-snapshot.json");
const EXPECTED_CODES = ["000001", "399001", "399006"];

function shanghaiParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function shanghaiIso(date) {
  const parts = shanghaiParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

function dateKey(date) {
  const parts = shanghaiParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const response = await fetch(API_URL, {
  headers: { "user-agent": "xuanjian-market-snapshot/1.0" },
});
if (!response.ok) {
  throw new Error(`市场快照刷新失败：HTTP ${response.status}`);
}

const payload = await response.json();
const rows = payload?.data?.diff;
if (!Array.isArray(rows) || rows.length !== EXPECTED_CODES.length) {
  throw new Error("市场快照数据不完整");
}

const byCode = new Map(rows.map((row) => [String(row.f12), row]));
const indices = EXPECTED_CODES.map((code) => {
  const row = byCode.get(code);
  if (!row || ![row.f2, row.f3, row.f4, row.f124].every(Number.isFinite)) {
    throw new Error(`市场快照缺少指数 ${code}`);
  }
  return {
    code,
    name: String(row.f14),
    level: row.f2,
    change: row.f4,
    changePercent: row.f3,
  };
});

const capturedAt = new Date();
const marketUpdatedAt = new Date(Math.max(...rows.map((row) => row.f124)) * 1000);
const tradingDate = dateKey(marketUpdatedAt);
const capturedDate = dateKey(capturedAt);
const updatedParts = shanghaiParts(marketUpdatedAt);
const updatedMinutes = Number(updatedParts.hour) * 60 + Number(updatedParts.minute);
const status = tradingDate !== capturedDate
  ? "最近收盘"
  : updatedMinutes >= 15 * 60
    ? "收盘快照"
    : "盘中快照";

const snapshot = {
  schemaVersion: 1,
  tradingDate,
  marketUpdatedAt: shanghaiIso(marketUpdatedAt),
  capturedAt: shanghaiIso(capturedAt),
  status,
  source: {
    name: "东方财富行情中心",
    url: "https://quote.eastmoney.com/center/",
  },
  indices,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`已刷新 ${tradingDate} ${status}：${indices.map((index) => `${index.name} ${index.changePercent}%`).join("，")}`);
