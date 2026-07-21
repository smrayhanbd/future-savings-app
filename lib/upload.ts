import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

// Allowed upload types and the per-file size cap (10 MB).
const ALLOWED = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
} as const

const MAX_BYTES = 10 * 1024 * 1024

export interface SavedFile {
  url: string
  fileName: string
}

/**
 * Persist an uploaded File to public/uploads/<subdir>/<uuid>.<ext> and return
 * a web-accessable URL plus the original file name. Rejects unsupported types
 * and oversize files. Callers are expected to have already authorized the user.
 */
export async function saveUploadedFile(file: File, subdir: string): Promise<SavedFile> {
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large. Maximum size is 10 MB.")
  }

  const ext = ALLOWED[file.type as keyof typeof ALLOWED]
  if (!ext) {
    // Fall back to the original extension for mime types Node doesn't map, but
    // still block obviously dangerous file types.
    const fallback = path.extname(file.name).toLowerCase().replace(/^\./, "")
    const safe = ["pdf", "doc", "docx", "txt", "png", "jpg", "jpeg", "webp", "gif", "xls", "xlsx", "zip"]
    if (!safe.includes(fallback)) {
      throw new Error("Unsupported file type. Allowed: PDF, DOC, DOCX, TXT, images (PNG/JPG/WEBP/GIF), XLS/XLSX, ZIP.")
    }
    const id = crypto.randomUUID()
    const dir = path.join(process.cwd(), "public", "uploads", subdir)
    await fs.mkdir(dir, { recursive: true })
    const diskName = `${id}.${fallback}`
    await fs.writeFile(path.join(dir, diskName), Buffer.from(await file.arrayBuffer()))
    return { url: `/uploads/${subdir}/${diskName}`, fileName: file.name }
  }

  const id = crypto.randomUUID()
  const dir = path.join(process.cwd(), "public", "uploads", subdir)
  await fs.mkdir(dir, { recursive: true })
  const diskName = `${id}.${ext}`
  await fs.writeFile(path.join(dir, diskName), Buffer.from(await file.arrayBuffer()))
  return { url: `/uploads/${subdir}/${diskName}`, fileName: file.name }
}
