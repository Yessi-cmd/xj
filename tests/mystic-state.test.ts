import assert from "node:assert/strict";
import test from "node:test";

import { affinityTags, buildAffinityProfile, calculateStreak, createEmptyMysticState, hasDailyEntry, normalizeMysticState, positiveCodesInLastDays, prepareStateForDailyOpening } from "../app/lib/mystic-state.ts";
import type { DailyHistoryEntry, PersistedMysticState } from "../app/lib/mystic-state.ts";

const recommendation = (code: string, isPositive = true) => ({
  code, name: code, kind: "股票" as const, role: isPositive ? "today" as const : "clash" as const,
  roleLabel: isPositive ? "今日上签" : "相冲签", isPositive, theme: "木系", natalScore: 80, dailyScore: 80,
  affinityScore: 50, explorationScore: 80, combinedScore: 78, primaryElement: "木" as const,
  star: "紫微", beast: "青龙", palace: "坎", number: 3, industry: "J 金融业", exchange: "SZ" as const,
  exchangeDirection: "南·离", listingDate: "1991-04-03", tags: ["木火双象"], rationale: "测试契合理由。",
});

const history = (dateKey: string, codes: string[]): DailyHistoryEntry => ({
  dateKey, profileFingerprint: "p1", drawVersion: 0,
  dailyContext: { dateKey, dayPillar: "戊午", dayElement: "土", drawVersion: 0 },
  dailyFortune: { grade: "上吉有缘", title: "测试", luckyHour: "辰时", luckyColor: "琥珀黄", luckyNumber: 3, favorable: [], avoid: [] },
  recommendations: [...codes.map((code) => recommendation(code)), recommendation("clash", false)],
  archetype: "青木拓荒客", openedAt: `${dateKey}T00:00:00.000Z`,
  openedByUser: true,
});

test("corrupt and legacy-like state normalizes safely without dropping a collection", () => {
  assert.deepEqual(normalizeMysticState("bad"), createEmptyMysticState());
  const migrated = normalizeMysticState({ collection: ["000001", "000001"], feedback: {}, history: [], rerolls: {} });
  assert.deepEqual(migrated.collection, ["000001"]);
  assert.equal(migrated.version, 1);
});

test("reroll counters normalize as non-negative integers and survive beyond the old single-reroll limit", () => {
  const state = {
    ...createEmptyMysticState(),
    history: [history("2026-08-12", ["a"]), history("2026-08-13", ["b"])],
    rerolls: { "2026-08-12": 5, "2026-08-13": 0, "2026-08-14": -2, "2026-08-15": "x" } as unknown as Record<string, number>,
  };
  const normalized = normalizeMysticState(state);
  assert.equal(normalized.rerolls["2026-08-12"], 5);
  assert.equal(normalized.rerolls["2026-08-13"], 0);
  assert.equal(normalized.rerolls["2026-08-14"], undefined);
  assert.equal(normalized.rerolls["2026-08-15"], undefined);
});

test("feedback produces bounded tag preferences, suppression, and avoidance", () => {
  const state: PersistedMysticState = {
    ...createEmptyMysticState(),
    feedback: {
      a: { code: "a", name: "A", action: "affinity", tags: ["element:木"], updatedAt: "2026-08-12T00:00:00Z" },
      b: { code: "b", name: "B", action: "neutral", tags: ["element:火"], updatedAt: "2026-08-11T00:00:00Z" },
      c: { code: "c", name: "C", action: "avoid", tags: ["star:破军"], updatedAt: "2026-08-10T00:00:00Z" },
    },
  };
  const affinity = buildAffinityProfile(state, new Date("2026-08-12T00:00:00Z"));
  assert.deepEqual(affinity.blockedCodes, ["c"]);
  assert.deepEqual(affinity.suppressedCodes, ["b"]);
  assert.equal(affinity.tagWeights["element:木"], 1);
});

test("expired neutral feedback decays out of suppression and tag weights", () => {
  const state: PersistedMysticState = {
    ...createEmptyMysticState(),
    feedback: {
      recent: { code: "r", name: "R", action: "neutral", tags: ["element:火"], updatedAt: "2026-08-01T00:00:00Z" },
      stale: { code: "s", name: "S", action: "neutral", tags: ["element:金"], updatedAt: "2026-07-01T00:00:00Z" },
      liked: { code: "l", name: "L", action: "affinity", tags: ["element:木"], updatedAt: "2026-07-01T00:00:00Z" },
    },
  };
  const affinity = buildAffinityProfile(state, new Date("2026-08-12T00:00:00Z"));
  assert.deepEqual(affinity.suppressedCodes, ["r"]);
  assert.equal(affinity.tagWeights["element:火"], -0.45);
  assert.equal(affinity.tagWeights["element:金"], undefined);
  assert.equal(affinity.tagWeights["element:木"], 1);
});

test("affinity tags carry structured element, star, beast, palace, and number keys", () => {
  assert.deepEqual(affinityTags(recommendation("a")), ["element:木", "star:紫微", "beast:青龙", "palace:坎", "number:3"]);
});

test("seven-day cooldown and streak calculations use distinct Shanghai dates", () => {
  const state = { ...createEmptyMysticState(), history: [history("2026-08-12", ["a"]), history("2026-08-11", ["b"]), history("2026-08-10", ["c"])] };
  assert.equal(calculateStreak(state.history, "2026-08-12"), 3);
  assert.deepEqual(new Set(positiveCodesInLastDays(state, "2026-08-12")), new Set(["b", "c"]));
});

test("a saved profile must reopen the draw screen when the Shanghai date changes", () => {
  const state = { ...createEmptyMysticState(), history: [history("2026-08-12", ["a"])] };
  assert.equal(hasDailyEntry(state, "2026-08-12", "p1"), true);
  assert.equal(hasDailyEntry(state, "2026-08-13", "p1"), false);
  assert.equal(hasDailyEntry(state, "2026-08-12", "another-profile"), false);
});

test("legacy auto-generated entries do not count as today's explicit draw", () => {
  const legacy = { ...history("2026-08-13", ["a"]), openedByUser: undefined };
  const state = { ...createEmptyMysticState(), history: [legacy, history("2026-08-12", ["b"])], rerolls: { "2026-08-13": 1 as const } };
  assert.equal(hasDailyEntry(state, "2026-08-13", "p1"), false);
  assert.equal(calculateStreak(state.history, "2026-08-13"), 0);
  assert.deepEqual(prepareStateForDailyOpening(state, "2026-08-13", "p1").rerolls, {});
});
