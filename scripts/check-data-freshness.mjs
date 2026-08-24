import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { freshnessProblems } from "./data-freshness-lib.mjs";

function option(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  return value ?? fallback;
}

const strict = process.argv.includes("--strict");
const shanghaiDateParts = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());
const datePart = (type) => shanghaiDateParts.find((part) => part.type === type)?.value ?? "";
const shanghaiToday = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
const asOfDate = option("as-of", shanghaiToday);
const marketMaxDays = Number(option("market-max-days", "7"));
const factsMaxDays = Number(option("facts-max-days", "14"));
if (![marketMaxDays, factsMaxDays].every((value) => Number.isSafeInteger(value) && value >= 0)) {
  throw new Error("新鲜度上限必须是非负整数天数。");
}

const market = JSON.parse(await readFile(resolve("app/data/market-snapshot.json"), "utf8"));
const universe = JSON.parse(await readFile(resolve("public/data/mystic-stocks.json"), "utf8"));
const result = freshnessProblems({
  asOfDate,
  marketDate: market.tradingDate,
  factsDate: universe.factsSnapshot?.tradingDate,
  marketMaxDays,
  factsMaxDays,
});

console.log(`data freshness: asOf=${asOfDate} market=${result.marketAge}d facts=${result.factsAge}d`);
if (result.problems.length > 0) {
  const message = result.problems.join("；");
  if (strict) throw new Error(message);
  console.warn(`WARNING: ${message}`);
}
