import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

/**
 * Reversible symmetric encryption for secrets stored at rest (SMTP passwords,
 * provider API keys, tokens). NOT for password hashing — that stays in bcrypt.
 *
 * Algorithm: AES-256-GCM with a random 12-byte IV per value. The output is
 * `base64(iv) : base64(ciphertext) : base64(tag)`.
 *
 * Key source: `ENCRYPTION_KEY` env var, derived to 32 bytes via scrypt. As a
 * backward-compatible fallback (secrets saved before ENCRYPTION_KEY existed
 * were encrypted under NEXTAUTH_SECRET), decryption also tries NEXTAUTH_SECRET
 * when ENCRYPTION_KEY fails or is unset.
 *
 * IMPORTANT: For new deployments, prefer setting `ENCRYPTION_KEY` identical
 * across every environment (local, staging, production). The NEXTAUTH_SECRET
 * fallback exists only so previously-saved secrets keep decrypting.
 */

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const SALT = "future-savings|settings-key"

let cachedPrimary: Buffer | null = null
let cachedFallback: Buffer | null = null

/** Derive the 32-byte key for encryption (and the preferred decryption key). */
function getPrimaryKey(): Buffer {
  if (cachedPrimary) return cachedPrimary
  const raw = process.env.ENCRYPTION_KEY
  if (raw) {
    cachedPrimary = scryptSync(raw, SALT, 32)
    return cachedPrimary
  }
  // Fall back to NEXTAUTH_SECRET so the feature works before ENCRYPTION_KEY
  // is configured, matching how earlier secrets were encrypted.
  const fallback = process.env.NEXTAUTH_SECRET
  if (!fallback) {
    throw new Error(
      "Neither ENCRYPTION_KEY nor NEXTAUTH_SECRET is set. Mail/SMS secrets cannot be encrypted or " +
        "decrypted without one. Set ENCRYPTION_KEY (a 32+ char random string) — it MUST be identical " +
        "across local, staging, and production."
    )
  }
  cachedPrimary = scryptSync(fallback, SALT, 32)
  return cachedPrimary
}

/** Derive the legacy fallback key (NEXTAUTH_SECRET). May be the same as primary. */
function getFallbackKey(): Buffer | null {
  if (cachedFallback !== null) return cachedFallback
  const enc = process.env.ENCRYPTION_KEY
  const nas = process.env.NEXTAUTH_SECRET
  // If ENCRYPTION_KEY is the configured key, NEXTAUTH_SECRET is the legacy key.
  if (enc && nas) {
    cachedFallback = scryptSync(nas, SALT, 32)
  } else {
    cachedFallback = null // no separate fallback key available
  }
  return cachedFallback
}

/** Encrypt a plaintext secret into an opaque string safe to store in a DB column. */
export function encrypt(plain: string): string {
  if (plain === "") return ""
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, getPrimaryKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("base64"), ciphertext.toString("base64"), tag.toString("base64")].join(":")
}

/**
 * Decrypt a value produced by {@link encrypt}. Tries the primary key first,
 * then the legacy NEXTAUTH_SECRET key, so secrets saved under either key keep
 * working. Throws a descriptive error only if both fail.
 */
export function decrypt(payload: string): string {
  if (!payload) return ""
  const parts = payload.split(":")
  if (parts.length !== 3) throw new Error("Invalid ciphertext payload (expected iv:ct:tag).")
  const [ivB64, ctB64, tagB64] = parts

  const tryKey = (key: Buffer): string | null => {
    try {
      const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"))
      decipher.setAuthTag(Buffer.from(tagB64, "base64"))
      return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8")
    } catch {
      return null
    }
  }

  const primary = tryKey(getPrimaryKey())
  if (primary !== null) return primary

  const fallbackKey = getFallbackKey()
  if (fallbackKey) {
    const legacy = tryKey(fallbackKey)
    if (legacy !== null) return legacy
  }

  throw new Error(
    "Failed to decrypt a stored secret. This almost always means the encryption key differs from the " +
      "value used when the secret was saved (for example: secret saved on localhost, then read on " +
      "Vercel which has a different or missing ENCRYPTION_KEY). Set the SAME ENCRYPTION_KEY on " +
      "every environment, then re-save the mail/SMS credentials."
  )
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
