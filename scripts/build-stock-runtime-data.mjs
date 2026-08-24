import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sourcePath = resolve(root, "public/data/mystic-stocks.json");
const indexPath = resolve(root, "public/data/mystic-stock-index.json");
const factsDir = resolve(root, "public/data/mystic-stock-facts");

const universe = JSON.parse(await readFile(sourcePath, "utf8"));
if (!Array.isArray(universe.stocks) || universe.stocks.length !== universe.stockCount) {
  throw new Error("完整股票标签池的 stockCount 与 stocks 数量不一致。");
}
const stockCodes = universe.stocks.map((stock) => stock.code);
if (stockCodes.some((code) => !/^\d{6}$/.test(code)) || new Set(stockCodes).size !== stockCodes.length) {
  throw new Error("完整股票标签池包含无效或重复代码。");
}

const indexFields = [
  "code",
  "name",
  "exchange",
  "industry",
  "primaryElement",
  "secondaryElement",
  "yinYang",
  "star",
  "beast",
  "palace",
  "number",
  "explorationScore",
  "listingDate",
  "listingDayPillar",
  "exchangeDirection",
  "industryElement",
  "tagVersion",
];

const factFields = [
  "marketCap",
  "floatMarketCap",
  "pe",
  "changePercent",
  "change5Percent",
  "businessProfile",
  "businessScope",
  "industryCsrc",
  "employeeCount",
  "chairman",
  "revenue",
  "revenueItem",
  "revenueReportDate",
];

function pick(source, fields) {
  return Object.fromEntries(fields.flatMap((field) => source[field] === undefined ? [] : [[field, source[field]]]));
}

const runtimeSource = "交易所上市资料 · 腾讯行情 · 东方财富F10 · 玄学标签静态快照";
const index = {
  schemaVersion: 1,
  sourceSchemaVersion: universe.schemaVersion,
  snapshotAt: universe.snapshotAt,
  source: runtimeSource,
  stockCount: universe.stockCount,
  factsSnapshot: universe.factsSnapshot,
  stocks: universe.stocks.map((stock) => pick(stock, indexFields)),
};

const shards = new Map();
for (const stock of universe.stocks) {
  const prefix = stock.code.slice(0, 4);
  const entries = shards.get(prefix) ?? {};
  entries[stock.code] = pick(stock, factFields);
  shards.set(prefix, entries);
}

await rm(factsDir, { recursive: true, force: true });
await mkdir(factsDir, { recursive: true });
await writeFile(indexPath, JSON.stringify(index), "utf8");
await Promise.all([...shards.entries()].map(([prefix, stocks]) => writeFile(
  resolve(factsDir, `${prefix}.json`),
  JSON.stringify({
    schemaVersion: 1,
    sourceSchemaVersion: universe.schemaVersion,
    prefix,
    factsSnapshot: universe.factsSnapshot,
    stocks,
  }),
  "utf8",
)));

const indexBytes = Buffer.byteLength(JSON.stringify(index));
console.log(`runtime stock data: stocks=${universe.stockCount} index=${indexBytes}B factShards=${shards.size}`);
