import { describe, expect, it } from "vitest";
import { credentialFingerprint, credentialWriteUsingKey, requireEncryptedCredential } from "./credential-security";
import { InventoryItem } from "../mongo/models";

describe("required credential encryption", () => {
  it("returns the encrypted payload when encryption succeeded", () => {
    expect(requireEncryptedCredential({ encrypted: "enc:v1:payload", plaintext: undefined })).toBe("enc:v1:payload");
  });

  it("fails closed instead of accepting a plaintext fallback", () => {
    expect(() => requireEncryptedCredential({ encrypted: undefined, plaintext: "raw-key" })).toThrow(
      "Credential encryption is not configured",
    );
  });

  it("refuses credential writes when no encryption key is configured", () => {
    expect(() => credentialWriteUsingKey("raw-key", "")).toThrow("Credential encryption is not configured");
    expect(credentialWriteUsingKey("", "")).toEqual({ plaintext: undefined, encrypted: undefined });
    expect(credentialWriteUsingKey("raw-key", "qa-key").encrypted).toMatch(/^enc:v1:/);
  });

  it("uses deterministic non-plaintext fingerprints for inventory uniqueness", () => {
    const fingerprint = credentialFingerprint(" https://activation.example/code ");
    expect(fingerprint).toBe(credentialFingerprint("https://activation.example/code"));
    expect(fingerprint).not.toContain("activation.example");
    expect(fingerprint).toHaveLength(64);
  });

  it("enforces unique sparse fingerprints for encrypted inventory secrets", () => {
    for (const field of ["licenseKeyFingerprint", "activationLinkFingerprint"]) {
      const options = (InventoryItem.schema.path(field) as any).options;
      expect(options.unique).toBe(true);
      expect(options.sparse).toBe(true);
    }
  });
});
