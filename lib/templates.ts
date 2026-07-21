import prisma from "@/lib/prisma"

/**
 * Reusable message templates with `{{variable}}` placeholders.
 *
 * Templates are stored as {@link MessageTemplate} rows (EMAIL or SMS channel)
 * and edited via the Mail/SMS settings pages. Existing callers of sendEmail /
 * sendSMS are NOT changed — templates are opt-in for new code and the editor UI.
 *
 * Usage:
 *   const t = await renderTemplate("DEPOSIT_RECEIVED", { memberName: "Rakib", amount: "500" })
 *   if (t) await sendEmail(member.email, t.subject!, t.body)
 */

export interface RenderedTemplate {
  subject: string | null
  body: string
}

/** Replace every {{key}} occurrence with the matching value (missing keys → ""). */
export function fillTemplate(text: string, vars: Record<string, string | number | undefined>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (full, key: string) => {
    const v = vars[key]
    return v === undefined || v === null ? "" : String(v)
  })
}

/** Load a template by key and fill its placeholders. Returns null when absent. */
export async function renderTemplate(
  key: string,
  vars: Record<string, string | number | undefined>
): Promise<RenderedTemplate | null> {
  const tpl = await prisma.messageTemplate.findUnique({ where: { key } })
  if (!tpl) return null
  return {
    subject: tpl.subject ? fillTemplate(tpl.subject, vars) : null,
    body: fillTemplate(tpl.body, vars),
  }
}

/**
 * Catalogue of default templates seeded on first run / via prisma seed. Each
 * entry lists the variables the body references, surfaced in the editor UI as
 * a helper hint. Keys mirror the notification contexts already used inline in
 * the actions (approval, auth, meeting, member, transactions).
 */
export interface SeedTemplate {
  channel: "EMAIL" | "SMS"
  key: string
  name: string
  subject?: string
  body: string
  variables: string
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  // ── Email ────────────────────────────────────────────────────────────────
  {
    channel: "EMAIL",
    key: "MEMBER_WELCOME",
    name: "Member Welcome",
    subject: "Membership Approved! Welcome to the Portal",
    variables: "memberName, username, tempPassword, loginUrl",
    body: `<p>Dear {{memberName}},</p><p>Congratulations! Your membership has been approved by the management.</p><p>Your Member ID is: <strong>{{username}}</strong></p><p>You can now log in to your Member Portal using the credentials below:</p><p><strong>Username:</strong> {{username}}<br/><strong>Temporary Password:</strong> {{tempPassword}}<br/><strong>Login URL:</strong> {{loginUrl}}</p><p>Please change your password after logging in for the first time.</p>`,
  },
  {
    channel: "EMAIL",
    key: "PASSWORD_RESET",
    name: "Password Reset",
    subject: "Password Reset Request",
    variables: "memberName, resetUrl",
    body: `<p>Dear {{memberName}},</p><p>You requested a password reset. Click the link below to set a new password:</p><p><a href="{{resetUrl}}">{{resetUrl}}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
  },
  {
    channel: "EMAIL",
    key: "DEPOSIT_RECEIVED",
    name: "Deposit Received",
    subject: "Deposit Received — ৳{{amount}}",
    variables: "memberName, amount, balance, transactionId",
    body: `<p>Hello {{memberName}},</p><p>Your deposit of <strong>৳{{amount}}</strong> has been received.</p><p>Transaction ID: {{transactionId}}</p><p>Current Balance: ৳{{balance}}</p><p>Future Savings Foundation</p>`,
  },
  {
    channel: "EMAIL",
    key: "WITHDRAWAL_APPROVED",
    name: "Withdrawal Approved",
    subject: "Withdrawal Approved — ৳{{amount}}",
    variables: "memberName, amount, balance, transactionId",
    body: `<p>Hello {{memberName}},</p><p>Your withdrawal of <strong>৳{{amount}}</strong> has been approved.</p><p>Transaction ID: {{transactionId}}</p><p>Remaining Balance: ৳{{balance}}</p>`,
  },
  {
    channel: "EMAIL",
    key: "LOAN_APPROVED",
    name: "Loan Approved",
    subject: "Loan Approved — ৳{{loanAmount}}",
    variables: "memberName, loanAmount",
    body: `<p>Dear {{memberName}},</p><p>Good news! Your loan of <strong>৳{{loanAmount}}</strong> has been approved.</p>`,
  },
  {
    channel: "EMAIL",
    key: "MEETING_NOTICE",
    name: "Meeting Notice",
    subject: "Meeting Notice — {{meetingTitle}}",
    variables: "memberName, meetingTitle, meetingDate, meetingLink, agenda",
    body: `<p>Dear {{memberName}},</p><p>This is a notice that <strong>{{meetingTitle}}</strong> will be held on <strong>{{meetingDate}}</strong>.</p><p>Link/Location: {{meetingLink}}</p><p>Agenda:</p><div>{{agenda}}</div>`,
  },
  {
    channel: "EMAIL",
    key: "FINE_NOTICE",
    name: "Fine Notice",
    subject: "Fine Notice",
    variables: "memberName, amount, reason",
    body: `<p>Dear {{memberName}},</p><p>A fine of <strong>৳{{amount}}</strong> has been recorded.</p><p>Reason: {{reason}}</p>`,
  },
  {
    channel: "EMAIL",
    key: "PROFIT_DISTRIBUTION",
    name: "Profit Distribution",
    subject: "Profit Distribution — ৳{{amount}}",
    variables: "memberName, amount, balance",
    body: `<p>Dear {{memberName}},</p><p>Your profit share of <strong>৳{{amount}}</strong> has been credited.</p><p>New Balance: ৳{{balance}}</p>`,
  },
  {
    channel: "EMAIL",
    key: "GENERAL_ANNOUNCEMENT",
    name: "General Announcement",
    subject: "Announcement: {{subject}}",
    variables: "memberName, subject, message",
    body: `<p>Dear {{memberName}},</p><div>{{message}}</div>`,
  },
  // ── SMS ──────────────────────────────────────────────────────────────────
  {
    channel: "SMS",
    key: "OTP_SMS",
    name: "OTP",
    variables: "otp",
    body: `Your verification code is {{otp}}. Do not share it with anyone. — Future Savings Foundation`,
  },
  {
    channel: "SMS",
    key: "MEMBER_WELCOME_SMS",
    name: "Member Welcome",
    variables: "memberName, username, tempPassword, loginUrl",
    body: `Welcome {{memberName}}! Your account is approved. Member ID: {{username}}, Password: {{tempPassword}}. Login: {{loginUrl}}`,
  },
  {
    channel: "SMS",
    key: "DEPOSIT_RECEIVED_SMS",
    name: "Deposit Received",
    variables: "memberName, amount, balance",
    body: `Dear {{memberName}}, your deposit of ৳{{amount}} has been received. Balance: ৳{{balance}}. — Future Savings Foundation`,
  },
  {
    channel: "SMS",
    key: "WITHDRAWAL_APPROVED_SMS",
    name: "Withdrawal Approved",
    variables: "memberName, amount, balance",
    body: `Dear {{memberName}}, withdrawal of ৳{{amount}} approved. Balance: ৳{{balance}}.`,
  },
  {
    channel: "SMS",
    key: "LOAN_APPROVED_SMS",
    name: "Loan Approved",
    variables: "memberName, loanAmount",
    body: `Dear {{memberName}}, your loan of ৳{{loanAmount}} is approved. — Future Savings Foundation`,
  },
  {
    channel: "SMS",
    key: "LOAN_REMINDER_SMS",
    name: "Loan Reminder",
    variables: "memberName, amount, dueDate",
    body: `Dear {{memberName}}, your loan installment of ৳{{amount}} is due on {{dueDate}}. Please pay on time.`,
  },
  {
    channel: "SMS",
    key: "MEETING_NOTICE_SMS",
    name: "Meeting Notice",
    variables: "meetingTitle, meetingDate, meetingLink",
    body: `Meeting Notice: {{meetingTitle}} on {{meetingDate}}. Venue/Link: {{meetingLink}}. — Future Savings Foundation`,
  },
  {
    channel: "SMS",
    key: "FINE_NOTICE_SMS",
    name: "Fine Notice",
    variables: "memberName, amount, reason",
    body: `Dear {{memberName}}, a fine of ৳{{amount}} ({{reason}}) has been recorded.`,
  },
  {
    channel: "SMS",
    key: "DUE_REMINDER_SMS",
    name: "Due Reminder",
    variables: "memberName, amount",
    body: `Dear {{memberName}}, your due balance is ৳{{amount}}. Please clear it soon.`,
  },
  {
    channel: "SMS",
    key: "PASSWORD_RESET_SMS",
    name: "Password Reset OTP",
    variables: "otp",
    body: `Your password reset code is {{otp}}. — Future Savings Foundation`,
  },
]

/** Insert any seed templates that don't already exist (idempotent). */
export async function seedDefaultTemplates(): Promise<void> {
  for (const t of SEED_TEMPLATES) {
    await prisma.messageTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: {
        channel: t.channel,
        key: t.key,
        name: t.name,
        subject: t.subject,
        body: t.body,
        variables: t.variables,
      },
    })
  }
}
