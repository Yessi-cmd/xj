import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { Solar } = require("lunar-javascript");
const universePath = resolve(root, "public/data/mystic-stocks.json");
const listingsPath = resolve(root, "var/stock-listings.json");

const INDUSTRY_ELEMENTS = [
  [/金融|银行|保险|证券|资本|货币/, "金"],
  [/电子|软件|信息|通信|传媒|文化|教育/, "火"],
  [/农|林|牧|渔|医药|生物|纺织|木材/, "木"],
  [/水利|运输|物流|旅游|饮料|化工|石油/, "水"],
  [/制造|建筑|地产|矿|材料|能源|公用|综合/, "土"],
];
const DIRECTIONS = { SH: "东·震巽", SZ: "南·离", BJ: "北·坎" };

function industryElement(industry) {
  if (!industry) return null;
  return INDUSTRY_ELEMENTS.find(([pattern]) => pattern.test(industry))?.[1] ?? null;
}

function listingPillar(listingDate) {
  if (!listingDate) return null;
  const [year, month, day] = listingDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar().getDayInGanZhi();
}

const universe = JSON.parse(await readFile(universePath, "utf8"));
const listingPayload = JSON.parse(await readFile(listingsPath, "utf8"));
let enriched = 0;

universe.stocks = universe.stocks.map((stock) => {
  const listing = listingPayload.stocks[stock.code];
  const industry = listing?.industry || (stock.industry && stock.industry !== "玄学探索" ? stock.industry : undefined);
  const listingDate = listing?.listingDate ?? stock.listingDate ?? null;
  if (listingDate) enriched += 1;
  const next = {
    ...stock,
    listingDate,
    listingDayPillar: listingPillar(listingDate),
    exchangeDirection: DIRECTIONS[stock.exchange],
    industryElement: industryElement(industry),
    tagVersion: "2.0",
  };
  if (industry) next.industry = industry;
  else delete next.industry;
  return next;
});
universe.schemaVersion = 2;
universe.snapshotAt = listingPayload.fetchedAt;
universe.source = `${universe.source.replace(/ · 玄学标签 v\d+$/, "")} · 交易所上市资料 · 玄学标签 v2`;

await writeFile(universePath, JSON.stringify(universe), "utf8");
console.log(`Enriched ${enriched}/${universe.stockCount} mystic stock tags with listing dates.`);
