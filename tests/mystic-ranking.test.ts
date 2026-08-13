import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildDailyFengShuiOverview } from "../app/lib/daily-overview.ts";
import { profileFingerprint, resolveBirthTimeInput, type BirthProfile } from "../app/lib/fortune.ts";
import { summarizeMarket, type MarketSnapshot } from "../app/lib/market-overview.ts";
import { DAILY_ROLES, rankMysticStocks, type MysticContext, type MysticUniverse } from "../app/lib/mystic-ranking.ts";

const universe = JSON.parse(await readFile(new URL("../public/data/mystic-stocks.json", import.meta.url), "utf8")) as MysticUniverse;
const marketSnapshot = JSON.parse(await readFile(new URL("../app/data/market-snapshot.json", import.meta.url), "utf8")) as MarketSnapshot;

const BASE_CONTEXT: MysticContext = {
  profileKey: "male|1990-06-15|08:30|北京市|庚午|壬午|辛亥|壬辰",
  favorableElement: "木",
  dayMaster: "金",
  dominantElement: "水",
  gender: "male",
  destinyNumber: 4,
  daily: { dateKey: "2026-08-12", dayPillar: "戊午", dayElement: "土", drawVersion: 0 },
};

test("daily draw is deterministic, unique, and contains all six roles", () => {
  const first = rankMysticStocks(universe, BASE_CONTEXT);
  const second = rankMysticStocks(universe, BASE_CONTEXT);
  assert.ok(universe.stockCount >= 4500);
  assert.deepEqual(first, second);
  assert.deepEqual(first.recommendations.map((item) => item.role), DAILY_ROLES);
  assert.equal(new Set(first.recommendations.map((item) => item.code)).size, 6);
  assert.equal(first.recommendations.find((item) => item.role === "clash")?.isPositive, false);
});

test("unknown birth time uses a deterministic neutral estimate until the user opts in", () => {
  const unknownMorning: BirthProfile = { name: "", gender: "male", birthDate: "1990-06-15", birthTime: "08:30", birthTimeKnown: false, location: "北京市" };
  const unknownEvening: BirthProfile = { ...unknownMorning, birthTime: "20:45" };
  assert.equal(profileFingerprint(unknownMorning), profileFingerprint(unknownEvening));
  assert.deepEqual(resolveBirthTimeInput(unknownMorning), { time: "12:00", estimated: true });
  assert.deepEqual(resolveBirthTimeInput({ ...unknownMorning, birthTimeKnown: true }), { time: "08:30", estimated: false });
  assert.deepEqual(resolveBirthTimeInput({ ...unknownMorning, birthTimeKnown: undefined }), { time: "08:30", estimated: false });
});

test("daily feng shui overview is deterministic and only follows the Beijing-time daily element", () => {
  const first = buildDailyFengShuiOverview(BASE_CONTEXT.daily);
  const second = buildDailyFengShuiOverview({ ...BASE_CONTEXT.daily, drawVersion: 1 });
  assert.deepEqual(first, second);
  assert.equal(first.headline, "戊午日 · 土气当值");
  assert.equal(first.direction, "中宫");
  assert.match(first.favorable, /归置旧物/);
  assert.doesNotMatch(`${first.summary}${first.favorable}${first.avoid}`, /涨|跌|买入|卖出|收益/);
});

test("versioned market snapshot contains three factual indices and a non-predictive summary", () => {
  assert.equal(marketSnapshot.schemaVersion, 1);
  assert.deepEqual(marketSnapshot.indices.map((index) => index.code), ["000001", "399001", "399006"]);
  assert.ok(marketSnapshot.indices.every((index) => Number.isFinite(index.level) && Number.isFinite(index.changePercent)));
  const summary = summarizeMarket(marketSnapshot);
  assert.match(summary.title, /同步收涨|同步收跌|表现分化|大致持平/);
  assert.match(summary.description, /不推断后市|不把分化解读为后市信号/);
});

test("one reroll changes variable signs but preserves guardian and clash", () => {
  const first = rankMysticStocks(universe, BASE_CONTEXT);
  const rerolled = rankMysticStocks(universe, {
    ...BASE_CONTEXT,
    daily: { ...BASE_CONTEXT.daily, drawVersion: 1 },
  });
  const byRole = (role: string, result: typeof first) => result.recommendations.find((item) => item.role === role)?.code;
  assert.equal(byRole("guardian", first), byRole("guardian", rerolled));
  assert.equal(byRole("clash", first), byRole("clash", rerolled));
  const changed = ["today", "hidden", "sameStar", "remedy"].filter((role) => byRole(role, first) !== byRole(role, rerolled));
  assert.ok(changed.length >= 2, `expected at least two variable signs to change, got ${changed.length}`);
});

test("guardian stays with the natal chart across a month boundary and is exempt from the seven-day cooldown", () => {
  const byRole = (role: string, result: ReturnType<typeof rankMysticStocks>) => result.recommendations.find((item) => item.role === role)?.code;
  const august = rankMysticStocks(universe, { ...BASE_CONTEXT, daily: { dateKey: "2026-08-31", dayPillar: "丁丑", dayElement: "火", drawVersion: 0 } });
  const september = rankMysticStocks(universe, { ...BASE_CONTEXT, daily: { dateKey: "2026-09-01", dayPillar: "戊寅", dayElement: "土", drawVersion: 0 } });
  assert.equal(byRole("guardian", august), byRole("guardian", september));
  const guardianCode = byRole("guardian", august) as string;
  const withCooldown = rankMysticStocks(universe, { ...BASE_CONTEXT, recentPositiveCodes: [guardianCode] });
  assert.equal(byRole("guardian", withCooldown), guardianCode);
});

test("guardian respects neutral suppression and avoidance", () => {
  const baseline = rankMysticStocks(universe, BASE_CONTEXT);
  const guardianCode = baseline.recommendations.find((item) => item.role === "guardian")?.code as string;
  const suppressed = rankMysticStocks(universe, {
    ...BASE_CONTEXT,
    affinity: { tagWeights: {}, blockedCodes: [], suppressedCodes: [guardianCode] },
  });
  assert.notEqual(suppressed.recommendations.find((item) => item.role === "guardian")?.code, guardianCode);
});

test("different dates and profiles produce substantially different positive signs", () => {
  const first = rankMysticStocks(universe, BASE_CONTEXT);
  const second = rankMysticStocks(universe, {
    profileKey: "female|1974-01-02|01:15|上海市|甲寅|甲子|癸丑|癸丑",
    favorableElement: "火", dayMaster: "水", dominantElement: "木", gender: "female", destinyNumber: 6,
    daily: { dateKey: "2026-08-13", dayPillar: "己未", dayElement: "土", drawVersion: 0 },
  });
  const firstCodes = new Set(first.recommendations.filter((item) => item.isPositive).map((item) => item.code));
  const overlap = second.recommendations.filter((item) => item.isPositive && firstCodes.has(item.code));
  assert.ok(overlap.length <= 2, `expected at most 2 overlapping positive stocks, got ${overlap.length}`);
  assert.notDeepEqual(first.signature, second.signature);
});

test("feedback stays within ten percent and avoidance/cooldown filters future positive signs", () => {
  const baseline = rankMysticStocks(universe, BASE_CONTEXT);
  for (const item of baseline.recommendations) {
    assert.ok(item.affinityScore >= 0 && item.affinityScore <= 100);
  }
  const avoidedCode = baseline.recommendations.find((item) => item.role === "today")?.code as string;
  const recentCode = baseline.recommendations.find((item) => item.role === "hidden")?.code as string;
  const filtered = rankMysticStocks(universe, {
    ...BASE_CONTEXT,
    affinity: { tagWeights: { "element:木": 50 }, blockedCodes: [avoidedCode], suppressedCodes: [] },
    recentPositiveCodes: [recentCode],
  });
  assert.ok(!filtered.recommendations.some((item) => item.code === avoidedCode));
  assert.ok(!filtered.recommendations.some((item) => item.isPositive && item.code === recentCode));
  assert.ok(filtered.recommendations.every((item) => item.affinityScore <= 100));
});

test("static universe v2 has listing pillars and does not invent placeholder industries", () => {
  assert.equal(universe.schemaVersion, 2);
  assert.ok(universe.stocks.every((stock) => stock.listingDate && stock.listingDayPillar && stock.tagVersion === "2.0"));
  assert.ok(universe.stocks.every((stock) => stock.industry !== "玄学探索"));
});
