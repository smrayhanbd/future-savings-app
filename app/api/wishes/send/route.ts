import { NextResponse } from "next/server"
import { sendSpecialWishesForDate } from "@/lib/specialWishes"

// This endpoint is designed to be called by a cron service (e.g., Vercel Cron, GitHub Actions, or any external scheduler).
// It automatically sends birthday, marriage anniversary, joining anniversary, and festival wishes to all active members.
//
// To set up automatic daily execution:
//
// Option 1: Vercel Cron (vercel.json)
//   {
//     "crons": [{
//       "path": "/api/wishes/send",
//       "schedule": "0 6 * * *"
//     }]
//   }
//
// Option 2: GitHub Actions
//   Schedule a workflow that calls this endpoint daily.
//
// Option 3: External cron services
//   Use cron-job.org, EasyCron, etc. to hit this URL daily.
//
// Security: You can add a query param check like ?secret=YOUR_SECRET
// and validate it below if needed.

export const dynamic = "force-dynamic"

// Optional: Validate a secret token to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET

function isAuthorized(request: Request): boolean {
  if (!CRON_SECRET) return true // No secret configured = open
  const url = new URL(request.url)
  const token = url.searchParams.get("secret") || request.headers.get("x-cron-secret") || ""
  return token === CRON_SECRET
}

export async function GET(request: Request) {
  // Security check
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await sendSpecialWishesForDate()
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...summary,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Wish sender error:", error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
