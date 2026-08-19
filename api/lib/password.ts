import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [scheme, iterationValue, salt, hash] = storedHash.split("$");
  if (scheme !== "pbkdf2" || !iterationValue || !salt || !hash) return false;

  const iterations = Number(iterationValue);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
