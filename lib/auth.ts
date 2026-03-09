import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "cookieledger_session";
const SESSION_TTL_DAYS = 30;

function toHex(buffer: Buffer) {
  return buffer.toString("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${toHex(salt)}:${toHex(hash as Buffer)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");
  const computed = scryptSync(password, salt, hash.length);
  return timingSafeEqual(hash, computed);
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createNumericCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function sessionExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

export function codeExpiryDate(minutes = 15): Date {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt;
}

export const authConstants = {
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
};
