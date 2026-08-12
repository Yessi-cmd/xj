import assert from "node:assert/strict";
import test from "node:test";

import { decryptMysticState, encryptMysticState } from "../app/lib/profile-crypto.ts";
import { createEmptyMysticState } from "../app/lib/mystic-state.ts";

test("encrypted .xjprofile round-trips without exposing birth data", async () => {
  const state = { ...createEmptyMysticState(), profile: { name: "玄鉴客", gender: "female" as const, birthDate: "1991-01-02", birthTime: "03:04", location: "广州市" } };
  const encrypted = await encryptMysticState(state, "secret88");
  assert.doesNotMatch(encrypted, /1991-01-02|03:04|广州市/);
  const restored = await decryptMysticState(encrypted, "secret88");
  assert.deepEqual(restored.profile, state.profile);
});

test("wrong passwords and corrupt files fail safely", async () => {
  const encrypted = await encryptMysticState(createEmptyMysticState(), "secret88");
  await assert.rejects(() => decryptMysticState(encrypted, "wrong88"), /密码错误|损坏/);
  await assert.rejects(() => decryptMysticState("not json", "secret88"), /有效/);
  await assert.rejects(() => encryptMysticState(createEmptyMysticState(), "123"), /至少需要6位/);
});
