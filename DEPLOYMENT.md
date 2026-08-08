# Future Savings App — Member Deposit Request Feature

This release adds a complete **Member Deposit Request** workflow on top of the
existing Future Savings Somiti management system, plus three enhancement
features requested for v2.

## What's New

### 1. Member Deposit Request with Slip (core feature)

Members who have deposited money to the Somiti account can submit a deposit
request from their portal (`/portal/deposit-request`) with the deposit slip /
transaction document attached as proof. The request goes to the admin
approval queue; on approval the existing `approveTransaction` flow credits
the member's deposit balance and **auto-generates the money-receipt PDF**
(same code path as a direct admin deposit entry).

### 2. Deposit Request Received Confirmation (enhancement #1)

When a member submits a deposit request, they immediately receive:
- An in-app `MemberNotification`
- An SMS (using the `DEPOSIT_REQUEST_RECEIVED_SMS` template)
- An email (using the `DEPOSIT_REQUEST_RECEIVED` template)

The templates are seeded by the new migration
`20260808000002_deposit_request_templates` and are editable from the
admin Mail/SMS settings pages.

### 3. Returned-for-Correction Resubmission (enhancement #2)

When an admin returns a member-submitted deposit transaction (status =
RETURNED + return reason), the member:
- Receives an in-app notification, SMS, and email using the new
  `DEPOSIT_REQUEST_RETURNED` / `DEPOSIT_REQUEST_RETURNED_SMS` templates.
- Sees a blue "Returned for correction" alert with the admin's reason on
  both the `/portal/deposit-request` page (recent-requests feed) and the
  `/portal/requests` page (Deposits tab).
- Can click **"Edit & Resubmit"** to open a pre-filled dialog where they
  can edit any field, optionally attach a new slip (otherwise the original
  is kept), and resubmit. The linked Transaction moves back to
  `PENDING_APPROVAL` with a fresh approval-tier resolution (in case the
  amount changed).

### 4. Bulk-Approval Source Filter (enhancement #3)

The admin Transaction Approvals page (`/dashboard/transaction-approvals`)
now has a **Source** chip group above the pending-transactions table:
- **All** — shows everything (default)
- **Admin Submitted** — only rows created by admin users
- **Member Submitted** — only member-portal deposit requests

The filter is persisted in the URL search-param `src` so a refresh keeps
the selection. Bulk-approve respects the active filter. The empty-state
message changes based on the active filter to guide the admin back to the
other source.

## Files Changed / Added

### New files
- `app/portal/deposit-request/page.tsx` — member-portal deposit-request page (server)
- `app/portal/deposit-request/DepositRequestClient.tsx` — client UI with slip upload + edit/resubmit dialog
- `prisma/migrations/20260808000001_member_deposit_request/migration.sql` — MemberRequest schema additions
- `prisma/migrations/20260808000002_deposit_request_templates/migration.sql` — seed message templates

### Modified files
- `prisma/schema.prisma` — MemberRequest extended with attachments, breakdown, referenceNo, transactionDate, rejectionReason, reviewedBy, reviewedAt
- `prisma/seed.js` — added the 4 new templates to the seed list
- `lib/templates.ts` — added DEPOSIT_REQUEST_RECEIVED, DEPOSIT_REQUEST_RETURNED, *_SMS variants to SEED_TEMPLATES
- `app/actions/portal.ts` — added submitDepositRequest, resubmitDepositRequest, notifyMemberDepositRequestReceived; extended approveMemberRequest / rejectMemberRequest to record reviewer metadata
- `app/actions/transactions.ts` — approveTransaction / rejectTransaction now record review metadata on the linked MemberRequest; returnTransaction now notifies the member (in-app + SMS + email) using the new templates
- `app/portal/requests/page.tsx` + `RequestsClient.tsx` — added Deposits tab + RETURNED rendering + Edit & Resubmit link
- `app/dashboard/transaction-approvals/page.tsx` + `ApprovalsClient.tsx` — surface member-submitted flag + slip link + Source filter chips
- `app/dashboard/transactions/[id]/page.tsx` + `TransactionDetailClient.tsx` — show "Member Submitted" badge + extended memberRequest info
- `components/PortalSidebar.tsx` — added "Deposit Request" nav item under Finance

## Deployment Steps

1. **Unzip** this archive into your deployment directory:
   ```bash
   unzip future-savings-app.zip -d /path/to/deploy
   cd /path/to/deploy/future-savings-app
   ```

2. **Install dependencies** (use the same package manager you used before;
   npm is shown here — bun / pnpm / yarn also work):
   ```bash
   npm install
   ```

3. **Configure your `.env` file** (copy from `.env.example` if present, or
   use your existing env). Required keys:
   - `DATABASE_URL` — Postgres connection string (pooled)
   - `DIRECT_URL` — Postgres direct connection (for migrations)
   - `NEXTAUTH_SECRET` — random 32+ char secret
   - `NEXTAUTH_URL` — your public URL
   - `EMAIL_USER` / `EMAIL_PASS` (or your configured MailSettings provider)
   - `SMS_USER` / `SMS_KEY` (or your configured SmsSettings provider)
   - Optional: `CLOUDINARY_*` for photo uploads

4. **Apply the database migrations** (idempotent — safe to re-run):
   ```bash
   npx prisma migrate deploy
   ```
   This will apply two new migrations:
   - `20260808000001_member_deposit_request` — adds the deposit-request
     fields to `MemberRequest`.
   - `20260808000002_deposit_request_templates` — seeds the 4 new message
     templates (DEPOSIT_REQUEST_RECEIVED, DEPOSIT_REQUEST_RETURNED, and
     their SMS variants) into the `MessageTemplate` table. Idempotent —
     existing rows are preserved.

5. **Regenerate the Prisma client** (the migration adds new columns, so
   the client must be regenerated to type them):
   ```bash
   npx prisma generate
   ```

6. **Build and start** the production server:
   ```bash
   npm run build
   npm start
   ```
   Or for development:
   ```bash
   npm run dev
   ```

7. **(Optional) Re-seed templates** if you want all the latest default
   templates (not just the new ones):
   ```bash
   npx prisma db seed
   ```
   This is safe to run on an existing DB — it uses `upsert` and won't
   overwrite your customised template bodies.

## Post-Deployment Verification

1. Log in as a member, go to **Portal → Finance → Deposit Request**.
2. Verify the list of Somiti bank accounts is shown.
3. Submit a test request with a small slip image. Check:
   - The request appears in the recent-requests feed with status PENDING.
   - The member receives an in-app notification, SMS, and email.
4. Log in as an admin, go to **Dashboard → Transaction Approvals**.
5. Use the **Source** filter chips to switch between All / Admin Submitted
   / Member Submitted. Verify the member-submitted deposit appears with
   the "Member Submitted" badge and a slip link.
6. Click the slip link to verify the slip opens in a new tab.
7. Test **Return** — click the return arrow, enter a reason. Verify:
   - The Transaction moves to RETURNED.
   - The member receives an in-app notification, SMS, and email with the
     return reason.
   - The member's portal deposit-request page shows a blue "Returned for
     correction" alert with the reason and an "Edit & Resubmit" button.
8. Test **Edit & Resubmit** — click the button, edit a field (e.g.
   reference number), optionally attach a new slip, and submit. Verify:
   - The Transaction moves back to PENDING_APPROVAL.
   - The member receives a fresh "Deposit Request Received" confirmation.
9. Test **Approve** — approve the request. Verify:
   - The Transaction moves to APPROVED.
   - The member's deposit balance increases (visible on the portal
     savings page).
   - The member receives the standard "Deposit Successful" notification
     with the money-receipt PDF attached (existing flow).
   - The receipt is accessible at `/dashboard/receipts/<transactionId>`.

## Compatibility

- **No breaking changes** to existing features. All existing admin direct
  deposits, withdrawals, charges, income distributions, reversals, profile
  requests, closing requests, loans, and tasks continue to work unchanged.
- The new `MemberRequest` columns are nullable / have defaults, so
  existing WITHDRAWAL and CLOSING rows survive the migration unchanged.
- The new `MessageTemplate` rows are seeded via `ON CONFLICT DO NOTHING`,
  so re-running the migration on a DB that already has them (e.g. from a
  fresh `prisma seed`) is a no-op.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript 5
- Prisma 6 (PostgreSQL)
- NextAuth.js
- Tailwind CSS 4
- shadcn/ui components
- pdfkit (money receipt PDF)
- nodemailer (email)
- sendmysms.net (SMS, with provider override support)
