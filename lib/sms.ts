export interface SmsResult {
  status: "OK" | "ERROR"
  response?: string
}

export async function sendSMS(to: string, msg: string): Promise<SmsResult> {
  const user = process.env.SMS_USER
  const key = process.env.SMS_KEY

  if (!user || !key) {
    return { status: "ERROR", response: "SMS API credentials missing in .env" }
  }

  try {
    const url = `https://sendmysms.net/api.php?user=${user}&key=${key}&to=${to}&msg=${encodeURIComponent(msg)}`
    const response = await fetch(url)
    const data = (await response.json()) as SmsResult
    return data // Returns { status: "OK" } or { status: "ERROR", response: "..." }
  } catch (error) {
    return { status: "ERROR", response: error instanceof Error ? error.message : "SMS request failed" }
  }
}