import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCATION_COUNT,
  LOCATION_DATA_VERSION,
  LOCATION_HIERARCHY,
  LOCATIONS,
  resolveLocationLongitude,
  resolveLocationPath,
} from "../app/lib/locations.ts";

test("bundles the nationwide county and city snapshot with usable longitudes", () => {
  assert.equal(LOCATION_DATA_VERSION, "2026.0.0");
  assert.equal(LOCATIONS.length, LOCATION_COUNT);
  assert.ok(LOCATION_COUNT >= 3_300);
  assert.ok(LOCATIONS.every((location) => location.longitude >= 73 && location.longitude <= 135));
});

test("location hierarchy exposes province, city, and county levels", () => {
  assert.ok(LOCATION_HIERARCHY.length >= 34);
  const guangdong = LOCATION_HIERARCHY.find((province) => province.name === "广东省");
  const guangzhou = guangdong?.cities.find((city) => city.name === "广州市");
  assert.ok(guangdong);
  assert.ok(guangzhou);
  assert.ok(guangzhou.counties.some((county) => county.name === "天河区"));
});

test("full paths disambiguate duplicate county names", () => {
  const hebei = resolveLocationPath("河北省 / 石家庄市 / 长安区");
  const shaanxi = resolveLocationPath("陕西省 / 西安市 / 长安区");
  assert.equal(hebei.province.name, "河北省");
  assert.equal(hebei.city.name, "石家庄市");
  assert.equal(shaanxi.province.name, "陕西省");
  assert.equal(shaanxi.city.name, "西安市");
});

test("legacy city-only profiles retain their longitude correction", () => {
  assert.equal(resolveLocationLongitude("广州市"), resolveLocationLongitude("广东省 / 广州市"));
  assert.notEqual(
    resolveLocationLongitude("北京市 / 延庆区"),
    resolveLocationLongitude("北京市 / 通州区"),
  );
});
