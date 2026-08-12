import { normalizeMysticState, type PersistedMysticState } from "./mystic-state.ts";

const ITERATIONS = 160_000;

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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  const payload: EncryptedProfileFile = {
    format: "xuanjian-profile", version: 1, algorithm: "AES-GCM", kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext),
  };
  return JSON.stringify(payload);
}

export async function decryptMysticState(payloadText: string, password: string): Promise<PersistedMysticState> {
  let payload: EncryptedProfileFile;
  try {
    payload = JSON.parse(payloadText) as EncryptedProfileFile;
  } catch {
    throw new Error("这不是有效的玄鉴档案文件。");
  }
  if (payload.format !== "xuanjian-profile" || payload.version !== 1 || payload.algorithm !== "AES-GCM" || payload.kdf !== "PBKDF2-SHA256") {
    throw new Error("档案版本不受支持。");
  }
  try {
    const salt = base64ToBytes(payload.salt);
    const iv = base64ToBytes(payload.iv);
    const key = await deriveKey(password, salt, payload.iterations);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, base64ToBytes(payload.ciphertext) as BufferSource);
    return normalizeMysticState(JSON.parse(new TextDecoder().decode(plaintext)));
  } catch {
    throw new Error("密码错误，或档案已经损坏。");
  }
}
