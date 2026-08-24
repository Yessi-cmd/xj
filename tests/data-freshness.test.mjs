import assert from "node:assert/strict";
import test from "node:test";

import { calendarDayAge, freshnessProblems } from "../scripts/data-freshness-lib.mjs";

test("snapshot age checks are deterministic and accept compact fact dates", () => {
  assert.equal(calendarDayAge("20260813", "2026-08-23"), 10);
  assert.deepEqual(freshnessProblems({
    asOfDate: "2026-08-23",
    marketDate: "2026-08-21",
    factsDate: "20260813",
  }), { marketAge: 2, factsAge: 10, problems: [] });
});

test("strict release policy can identify stale snapshots without accessing the network", () => {
  const result = freshnessProblems({
    asOfDate: "2026-08-23",
    marketDate: "2026-08-12",
    factsDate: "20260701",
  });
  assert.equal(result.problems.length, 2);
});
