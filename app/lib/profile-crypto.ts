import { normalizeMysticState, type PersistedMysticState } from "./mystic-state.ts";

const ITERATIONS = 160_000;
export const MAX_PROFILE_FILE_BYTES = 3_000_000;
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 1_000_000;
const MAX_CIPHERTEXT_BYTES = 2_000_000;

export type EncryptedProfileFile = {
  format: "xuanjian-profile";
  version: 1;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("档案编码无效。");
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function inspectEncryptedProfile(payloadText: string): EncryptedProfileFile {
  if (new TextEncoder().encode(payloadText).byteLength > MAX_PROFILE_FILE_BYTES) {
    throw new Error("档案文件过大，无法安全导入。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    throw new Error("这不是有效的玄鉴档案文件。");
  }
  if (!isRecord(parsed)) throw new Error("这不是有效的玄鉴档案文件。");
  const payload = parsed as EncryptedProfileFile;
  if (payload.format !== "xuanjian-profile" || payload.version !== 1 || payload.algorithm !== "AES-GCM" || payload.kdf !== "PBKDF2-SHA256") {
    throw new Error("档案版本不受支持。");
  }
  if (!Number.isSafeInteger(payload.iterations) || payload.iterations < MIN_ITERATIONS || payload.iterations > MAX_ITERATIONS) {
    throw new Error("档案密钥参数不受支持。");
  }

  try {
    const salt = base64ToBytes(payload.salt);
    const iv = base64ToBytes(payload.iv);
    const ciphertext = base64ToBytes(payload.ciphertext);
    if (salt.byteLength !== 16 || iv.byteLength !== 12 || ciphertext.byteLength < 17 || ciphertext.byteLength > MAX_CIPHERTEXT_BYTES) {
      throw new Error("档案加密参数无效。");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("档案")) throw error;
    throw new Error("档案编码无效。");
  }
  return payload;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMysticState(state: PersistedMysticState, password: string): Promise<string> {
  if (password.length < 6) throw new Error("导出密码至少需要6位。");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(state));
  if (plaintext.byteLength + 16 > MAX_CIPHERTEXT_BYTES) {
    throw new Error("档案内容过大，无法安全导出。");
  }
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  const payload: EncryptedProfileFile = {
    format: "xuanjian-profile", version: 1, algorithm: "AES-GCM", kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext),
  };
  return JSON.stringify(payload);
}

export async function decryptMysticState(payloadText: string, password: string): Promise<PersistedMysticState> {
  const payload = inspectEncryptedProfile(payloadText);
  let plaintext: ArrayBuffer;
  try {
    const salt = base64ToBytes(payload.salt);
    const iv = base64ToBytes(payload.iv);
    const key = await deriveKey(password, salt, payload.iterations);
    plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, base64ToBytes(payload.ciphertext) as BufferSource);
  } catch {
    throw new Error("密码错误，或档案已经损坏。");
  }
  let state: unknown;
  try {
    state = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error("档案内容已经损坏。");
  }
  if (!isRecord(state) || state.version !== 1) {
    throw new Error("档案内容版本不受支持。");
  }
  return normalizeMysticState(state);
}
