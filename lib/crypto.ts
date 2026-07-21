import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

/**
 * Reversible symmetric encryption for secrets stored at rest (SMTP passwords,
 * provider API keys, tokens). NOT for password hashing — that stays in bcrypt.
 *
 * Algorithm: AES-256-GCM with a random 12-byte IV per value. The output is
 * `base64(iv) : base64(ciphertext) : base64(tag)`.
 *
 * Key source: `ENCRYPTION_KEY` env var, derived to 32 bytes via scrypt. Falls
 * back to `NEXTAUTH_SECRET` (with a console warning) so the feature is usable
 * before a dedicated key is set, but a dedicated `ENCRYPTION_KEY` is strongly
 * recommended — rotating it invalidates all stored ciphertext.
 */

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const SALT = "future-savings|settings-key"

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Add a 32+ char random string to .env to store mail/SMS secrets encrypted."
    )
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.warn(
      "[crypto] ENCRYPTION_KEY missing — falling back to NEXTAUTH_SECRET. Set a dedicated ENCRYPTION_KEY for mail/SMS secret storage."
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

/** Decrypt a value produced by {@link encrypt}. Throws on tampering / wrong key. */
export function decrypt(payload: string): string {
  if (!payload) return ""
  const parts = payload.split(":")
  if (parts.length !== 3) throw new Error("Invalid ciphertext payload (expected iv:ct:tag).")
  const [ivB64, ctB64, tagB64] = parts
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8")
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
