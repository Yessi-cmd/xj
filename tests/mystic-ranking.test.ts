import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  rankMysticStocks,
  type MysticUniverse,
} from "../app/lib/mystic-ranking.ts";

const universe = JSON.parse(
  await readFile(new URL("../public/data/mystic-stocks.json", import.meta.url), "utf8"),
) as MysticUniverse;

test("ranks the full tagged universe deterministically", () => {
  const context = {
    profileKey: "male|1990-06-15|08:30|北京市|庚午|壬午|辛亥|壬辰",
    favorableElement: "木" as const,
    dayMaster: "金" as const,
    dominantElement: "水" as const,
    gender: "male" as const,
    destinyNumber: 4,
  };

  const first = rankMysticStocks(universe, context);
  const second = rankMysticStocks(universe, context);

  assert.ok(universe.stockCount >= 4500);
  assert.deepEqual(first, second);
  assert.equal(first.recommendations.length, 6);
  assert.equal(new Set(first.recommendations.map((item) => item.code)).size, 6);
});

test("different birth profiles produce substantially different stock lists", () => {
  const first = rankMysticStocks(universe, {
    profileKey: "female|1974-01-02|01:15|上海市|甲寅|甲子|癸丑|癸丑",
    favorableElement: "火",
    dayMaster: "水",
    dominantElement: "木",
    gender: "female",
    destinyNumber: 6,
  });
  const second = rankMysticStocks(universe, {
    profileKey: "male|2002-11-28|22:40|乌鲁木齐市|壬午|辛亥|庚子|丁亥",
    favorableElement: "土",
    dayMaster: "金",
    dominantElement: "水",
    gender: "male",
    destinyNumber: 7,
  });

  const firstCodes = new Set(first.recommendations.map((item) => item.code));
  const overlap = second.recommendations.filter((item) => firstCodes.has(item.code));
  assert.ok(overlap.length <= 2, `expected at most 2 overlapping stocks, got ${overlap.length}`);
  assert.notDeepEqual(first.signature, second.signature);
});
