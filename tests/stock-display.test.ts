import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMarketCapYi,
  formatRevenuePeriod,
  formatRevenueYuan,
  formatSnapshotDate,
} from "../app/lib/stock-display.ts";

test("formats market caps in 亿元 and F10 revenue in人民币元 without mixing units", () => {
  assert.equal(formatMarketCapYi(91.53), "91.5亿");
  assert.equal(formatMarketCapYi(12_345.67), "1.23万亿");
  assert.equal(formatRevenueYuan(1_100_939_375.47), "11亿");
  assert.equal(formatRevenueYuan(3_865_775_324.26), "38.7亿");
  assert.equal(formatRevenueYuan(null), "—");
});

test("formats compact snapshot dates and financial reporting periods for display", () => {
  assert.equal(formatSnapshotDate("20260813"), "2026-08-13");
  assert.equal(formatSnapshotDate("2026-08-13T11:45:27+08:00"), "2026-08-13");
  assert.equal(formatRevenuePeriod("2025-12-31 00:00:00"), "2025年报");
  assert.equal(formatRevenuePeriod("2026-03-31 00:00:00"), "2026一季报");
});
