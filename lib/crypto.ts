import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

/**
 * Reversible symmetric encryption for secrets stored at rest (SMTP passwords,
 * provider API keys, tokens). NOT for password hashing — that stays in bcrypt.
 *
 * Algorithm: AES-256-GCM with a random 12-byte IV per value. The output is
 * `base64(iv) : base64(ciphertext) : base64(tag)`.
 *
 * Key source: `ENCRYPTION_KEY` env var, derived to 32 bytes via scrypt.
 *
 * IMPORTANT: `ENCRYPTION_KEY` MUST be identical across every environment
 * (local, staging, production). Secrets encrypted in one environment must
 * decrypt in all others — they all share one database. There is intentionally
 * NO fallback to another env var: a fallback would silently use a different
 * key and produce "Unsupported state or unable to authenticate data" errors
 * the moment a secret saved under one key is read under another.
 */

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const SALT = "future-savings|settings-key"

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Mail/SMS secrets cannot be encrypted or decrypted without it. " +
        "Set ENCRYPTION_KEY in your environment (a 32+ char random string) — it MUST be identical " +
        "across local, staging, and production, since secrets encrypted in one environment must " +
        "decrypt in all others."
    )
  }
  cachedKey = scryptSync(raw, SALT, 32)
  return cachedKey
}

/** Encrypt a plaintext secret into an opaque string safe to store in a DB column. */
export function encrypt(plain: string): string {
  if (plain === "") return ""
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("base64"), ciphertext.toString("base64"), tag.toString("base64")].join(":")
}

/**
 * Decrypt a value produced by {@link encrypt}. Throws a descriptive error on
 * auth-tag mismatch — the most common cause is `ENCRYPTION_KEY` differing
 * between the environment that saved the secret and the one reading it.
 */
export function decrypt(payload: string): string {
  if (!payload) return ""
  const parts = payload.split(":")
  if (parts.length !== 3) throw new Error("Invalid ciphertext payload (expected iv:ct:tag).")
  const [ivB64, ctB64, tagB64] = parts
  try {
    const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"))
    decipher.setAuthTag(Buffer.from(tagB64, "base64"))
    return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8")
  } catch {
    throw new Error(
      "Failed to decrypt a stored secret. This almost always means ENCRYPTION_KEY differs from the " +
        "value used when the secret was saved (for example: secret saved on localhost, then read on " +
        "Vercel which has a different or missing ENCRYPTION_KEY). Set the SAME ENCRYPTION_KEY on " +
        "every environment, then re-save the mail/SMS credentials."
    )
  }
}

/**
 * Re-encrypt only when the caller supplied a non-empty new value. Returns the
 * existing ciphertext untouched when `next` is blank — used by the settings
 * save actions so a masked/blank password field does not wipe the stored secret.
 */
export function reencrypt(next: string | null | undefined, existing: string | null | undefined): string | null {
  if (next && next.trim() !== "") return encrypt(next.trim())
  return existing ?? null
}

/** Mask a secret for display in the UI. Returns nothing meaningful to reveal. */
export function mask(value: string | null | undefined): string {
  if (!value) return ""
  return "•".repeat(Math.min(16, Math.max(8, value.length)))
}
