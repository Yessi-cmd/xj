import type { BirthProfile, Gender } from "./fortune.ts";
import { resolveLocation } from "./locations.ts";
import { isLunarBirthDate } from "./lunar-date.ts";

export type BirthProfileDraft = Omit<BirthProfile, "gender"> & {
  gender: Gender | "";
};

export const EMPTY_PROFILE_DRAFT: BirthProfileDraft = {
  name: "",
  gender: "",
  birthDate: "",
  birthCalendar: "solar",
  birthTime: "12:00",
  birthTimeKnown: false,
  location: "",
};

export type ProfileDraftValidation =
  | { ok: true; profile: BirthProfile }
  | { ok: false; message: string };

function isRealDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function validateProfileDraft(
  draft: BirthProfileDraft,
  maximumDate: string,
): ProfileDraftValidation {
  if (draft.gender !== "male" && draft.gender !== "female") {
    return { ok: false, message: "请选择性别后再启盘。" };
  }
  if (!isRealDateKey(draft.birthDate) || draft.birthDate < "1920-01-01" || draft.birthDate > maximumDate) {
    return { ok: false, message: "请选择有效的出生日期后再启盘。" };
  }
  if (draft.birthCalendar === "lunar" && !isLunarBirthDate(draft.lunarBirthDate)) {
    return { ok: false, message: "请重新选择完整的农历出生日期。" };
  }
  if (draft.birthTimeKnown === true && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.birthTime)) {
    return { ok: false, message: "请填写有效的出生时间。" };
  }
  if (!draft.location || !resolveLocation(draft.location)) {
    return { ok: false, message: "请选择出生地点后再启盘。" };
  }

  return {
    ok: true,
    profile: {
      ...draft,
      name: draft.name.trim().slice(0, 40),
      gender: draft.gender,
      birthTime: draft.birthTimeKnown === true ? draft.birthTime : "12:00",
    },
  };
}
