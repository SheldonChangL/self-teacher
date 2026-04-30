// Lightweight parent-area lock. Goal: keep curious kid hands from
// accidentally hitting "delete profile" — not adversarial security.
//
// Cookie format: `<base64url-payload>.<base64url-hmac>` where payload is
// JSON `{exp: <unix-ms>}`. HMAC-SHA256 over payload using PARENT_AUTH_SECRET
// (stable across restarts; set via env var or generated on first PIN set).
//
// PIN itself is stored hashed (PBKDF2) in the settings table.

const enc = new TextEncoder();

const PIN_HASH_KEY = "parent_pin_hash";
const SECRET_KEY = "parent_auth_secret";
const SESSION_COOKIE = "parent_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

export const COOKIE_NAME = SESSION_COOKIE;

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const std = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(std);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64urlEncode(sig);
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function signSession(secret: string): Promise<string> {
  const payload = b64urlEncode(
    enc.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })),
  );
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySession(
  secret: string,
  cookie: string | undefined | null,
): Promise<boolean> {
  if (!cookie || !cookie.includes(".")) return false;
  const [payload, sig] = cookie.split(".");
  const expected = await hmac(secret, payload);
  if (!constantTimeEq(sig, expected)) return false;
  try {
    const data = JSON.parse(
      new TextDecoder().decode(b64urlDecode(payload)),
    ) as { exp?: number };
    if (typeof data.exp !== "number" || Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

// PBKDF2 password hashing (Node + edge-compatible via Web Crypto)
const PBKDF2_ITERS = 200_000;

async function deriveBits(pin: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    key,
    256,
  );
}

function bytesToArrayBuffer(b: Uint8Array): ArrayBuffer {
  // Copy into a fresh ArrayBuffer to satisfy the strictest BufferSource type.
  const ab = new ArrayBuffer(b.byteLength);
  new Uint8Array(ab).set(b);
  return ab;
}

export async function hashPin(pin: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(pin, bytesToArrayBuffer(saltBytes));
  return `${b64urlEncode(saltBytes)}.${b64urlEncode(bits)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored.includes(".")) return false;
  const [saltB64, hashB64] = stored.split(".");
  const saltBytes = b64urlDecode(saltB64);
  const bits = await deriveBits(pin, bytesToArrayBuffer(saltBytes));
  return constantTimeEq(b64urlEncode(bits), hashB64);
}

export const KEYS = {
  pinHash: PIN_HASH_KEY,
  secret: SECRET_KEY,
};

export function newSecret(): string {
  return b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
}
