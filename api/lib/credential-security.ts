import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";

const PREFIX = "enc:v1";

function encryptionKey() {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || env.appSecret;
  if (!secret) return null;
  return createHash("sha256").update(secret).digest();
}

export function protectCredential(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return { plaintext: undefined, encrypted: undefined };

  const key = encryptionKey();
  if (!key) return { plaintext: normalized, encrypted: undefined };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    plaintext: undefined,
    encrypted: `${PREFIX}:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`,
  };
}

export function revealCredential(value?: string | null) {
  if (!value) return "";
  if (!value.startsWith(`${PREFIX}:`)) return value;

  const key = encryptionKey();
  if (!key) return "";

  try {
    const [, , ivPart, tagPart, encryptedPart] = value.split(":");
    if (!ivPart || !tagPart || !encryptedPart) return "";
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

export function requireEncryptedCredential(protectedValue: ReturnType<typeof protectCredential>) {
  if (!protectedValue.encrypted) {
    throw new Error("Credential encryption is not configured");
  }
  return protectedValue.encrypted;
}

export function credentialWrite(value?: string | null) {
  const normalized = String(value || "").trim();
  if (!normalized) return { plaintext: undefined, encrypted: undefined };
  return {
    plaintext: undefined,
    encrypted: requireEncryptedCredential(protectCredential(normalized)),
  };
}

export function credentialWriteUsingKey(value: string | null | undefined, secret: string) {
  const normalized = String(value || "").trim();
  if (!normalized) return { plaintext: undefined, encrypted: undefined };
  if (!secret) throw new Error("Credential encryption is not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    plaintext: undefined,
    encrypted: `${PREFIX}:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`,
  };
}

export function credentialFingerprint(value?: string | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? createHash("sha256").update(normalized).digest("hex") : undefined;
}
