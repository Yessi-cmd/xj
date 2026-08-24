import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_PROFILE_DRAFT,
  validateProfileDraft,
} from "../app/lib/profile-draft.ts";

test("a new profile cannot open from silent placeholder values", () => {
  assert.deepEqual(
    validateProfileDraft(EMPTY_PROFILE_DRAFT, "2026-08-23"),
    { ok: false, message: "请选择性别后再启盘。" },
  );
});

test("explicit required inputs produce a normalized birth profile while time stays optional", () => {
  const validated = validateProfileDraft({
    ...EMPTY_PROFILE_DRAFT,
    name: "  玄鉴客  ",
    gender: "female",
    birthDate: "1991-01-02",
    location: "北京市",
  }, "2026-08-23");
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.profile.name, "玄鉴客");
  assert.equal(validated.profile.birthTimeKnown, false);
  assert.equal(validated.profile.birthTime, "12:00");
});

test("profile validation rejects future dates and unknown locations", () => {
  const base = {
    ...EMPTY_PROFILE_DRAFT,
    gender: "male" as const,
    birthDate: "1990-06-15",
    location: "北京市",
  };
  assert.equal(validateProfileDraft({ ...base, birthDate: "2027-01-01" }, "2026-08-23").ok, false);
  assert.equal(validateProfileDraft({ ...base, location: "不存在的地点" }, "2026-08-23").ok, false);
});
