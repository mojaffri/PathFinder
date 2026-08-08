import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for GitHub OAuth access tokens at rest
 * (`github_connections.access_token_encrypted`) — "encrypt/store
 * appropriately" per the task's security requirements. Never store a token
 * in plaintext, and never send one to the client (see
 * `repositories/github-repository.ts`, which only ever returns connection
 * *status*, never the token itself, to any caller above the repository
 * layer).
 *
 * Key comes from `GITHUB_TOKEN_ENCRYPTION_KEY` (base64-encoded, 32 bytes) —
 * optional infrastructure, same convention as every other secret in this
 * app: without it, `encryptToken`/`decryptToken` return `null` rather than
 * throwing, and the GitHub-connect flow simply doesn't persist a token
 * (public username/repo analysis keeps working regardless — it never
 * needed a connection).
 */

function getKey(): Buffer | null {
  const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    const key = Buffer.from(raw, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

/** Format: `{ivBase64}:{authTagBase64}:{ciphertextBase64}`. */
export function encryptToken(plaintext: string): string | null {
  const key = getKey();
  if (!key) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptToken(encrypted: string): string | null {
  const key = getKey();
  if (!key) return null;

  const parts = encrypted.split(":");
  if (parts.length !== 3) return null;
  const [ivB64, authTagB64, ciphertextB64] = parts;

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}
