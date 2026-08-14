import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const universePath = resolve(root, "public/data/mystic-stocks.json");
const factsPath = resolve(root, process.argv[2] ?? "var/stock-facts.json");

const universe = JSON.parse(await readFile(universePath, "utf8"));
const facts = JSON.parse(await readFile(factsPath, "utf8"));

const quotes = facts.quotes ?? {};
const profiles = facts.profiles ?? {};

function clip(value, max) {
  if (typeof value !== "string") return value;
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max)}…` : text || undefined;
}

let withQuotes = 0;
let withProfile = 0;
let withRevenue = 0;

universe.stocks = universe.stocks.map((stock) => {
  const quote = quotes[stock.code] ?? {};
  const detail = profiles[stock.code] ?? {};
  const profile = detail.profile ?? {};
  const revenue = detail.revenue ?? {};
  if (quote.marketCap != null) withQuotes += 1;
  if (profile.businessProfile) withProfile += 1;
  if (revenue.revenue != null) withRevenue += 1;
  return {
    ...stock,
    marketCap: quote.marketCap ?? null,
    floatMarketCap: quote.floatCap ?? null,
    pe: quote.pe ?? null,
    changePercent: quote.changePct ?? null,
    change5Percent: detail.change5 ?? null,
    businessProfile: clip(profile.businessProfile, 160),
    businessScope: clip(profile.businessScope, 120),
    industryCsrc: profile.industryCsrc ?? undefined,
    employeeCount: profile.employeeCount ?? undefined,
    chairman: profile.chairman ?? undefined,
    revenue: revenue.revenue ?? null,
    revenueItem: revenue.revenueItem ?? undefined,
    revenueReportDate: revenue.revenueReportDate ?? undefined,
    tagVersion: "3.0",
  };
});

universe.schemaVersion = 3;
universe.snapshotAt = facts.capturedAt;
universe.source = `${universe.source.replace(/ · 玄学标签 v\d+$/, "")} · 基本面快照 · 玄学标签 v3`;
universe.factsSnapshot = {
  tradingDate: facts.tradingDate ?? "",
  capturedAt: facts.capturedAt,
  source: "腾讯行情 · 东方财富F10 · 仅作娱乐参考，不构成投资建议",
};

await writeFile(universePath, JSON.stringify(universe), "utf8");
console.log(`merged: stocks=${universe.stocks.length} withQuotes=${withQuotes} withProfile=${withProfile} withRevenue=${withRevenue} tradingDate=${universe.factsSnapshot.tradingDate}`);
