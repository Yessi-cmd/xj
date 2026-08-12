import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCATION_COUNT,
  LOCATION_DATA_VERSION,
  LOCATIONS,
  resolveLocationLongitude,
  searchLocations,
} from "../app/lib/locations.ts";

test("bundles the nationwide county and city snapshot with usable longitudes", () => {
  assert.equal(LOCATION_DATA_VERSION, "2026.0.0");
  assert.equal(LOCATIONS.length, LOCATION_COUNT);
  assert.ok(LOCATION_COUNT >= 3_300);
  assert.ok(LOCATIONS.every((location) => location.longitude >= 73 && location.longitude <= 135));
});

test("location search disambiguates duplicate county names with the full path", () => {
  const labels = searchLocations("长安区").options.map((location) => location.label);
  assert.ok(labels.includes("河北省 / 石家庄市 / 长安区"));
  assert.ok(labels.includes("陕西省 / 西安市 / 长安区"));
});

test("location search accepts compact province city and county input", () => {
  const labels = searchLocations("广东广州天河").options.map((location) => location.label);
  assert.ok(labels.includes("广东省 / 广州市 / 天河区"));
});

test("legacy city-only profiles retain their longitude correction", () => {
  assert.equal(resolveLocationLongitude("广州市"), resolveLocationLongitude("广东省 / 广州市"));
  assert.notEqual(
    resolveLocationLongitude("北京市 / 延庆区"),
    resolveLocationLongitude("北京市 / 通州区"),
  );
});
