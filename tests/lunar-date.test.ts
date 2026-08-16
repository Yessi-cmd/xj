import assert from "node:assert/strict";
import test from "node:test";

import {
  getLunarMonthOptions,
  lunarBirthDateToSolar,
  solarDateToLunarBirthDate,
} from "../app/lib/lunar-date.ts";
import { profileFingerprint, type BirthProfile } from "../app/lib/fortune.ts";

test("lunar birth dates convert to the same canonical solar date", async () => {
  assert.equal(
    await lunarBirthDateToSolar({ year: 2024, month: 1, day: 1, isLeap: false }),
    "2024-02-10",
  );
  assert.deepEqual(await solarDateToLunarBirthDate("2024-02-10"), {
    year: 2024,
    month: 1,
    day: 1,
    isLeap: false,
  });

  const solarProfile: BirthProfile = {
    name: "",
    gender: "female",
    birthDate: "2024-02-10",
    birthCalendar: "solar",
    birthTime: "12:00",
    birthTimeKnown: false,
    location: "北京市",
  };
  const lunarProfile: BirthProfile = {
    ...solarProfile,
    birthCalendar: "lunar",
    lunarBirthDate: { year: 2024, month: 1, day: 1, isLeap: false },
  };
  assert.equal(profileFingerprint(lunarProfile), profileFingerprint(solarProfile));
});

test("lunar month options preserve leap months and their real day counts", async () => {
  const fourthMonths = (await getLunarMonthOptions(2020)).filter((month) => Math.abs(month.value) === 4);
  assert.deepEqual(fourthMonths, [
    { value: 4, label: "四月", dayCount: 30 },
    { value: -4, label: "闰四月", dayCount: 29 },
  ]);
  assert.equal(
    await lunarBirthDateToSolar({ year: 2020, month: 4, day: 1, isLeap: true }),
    "2020-05-23",
  );
});
