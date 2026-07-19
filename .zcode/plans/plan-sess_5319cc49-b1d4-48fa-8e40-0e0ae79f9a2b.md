# Member Performance Score & Achievement Badge System

Implements FRS v2.0 as a modular, event-driven Trust Score engine in the existing Next.js 16 + Prisma (PostgreSQL) codebase. Placed under **Member Management** (admin) **plus** a member-facing **portal** page.

## Architecture overview

The FRS §23 calls for nine loosely-coupled components. I'll implement them as pure functions in `lib/trustScore/`, with a single `recalculateTrustScore(memberId, eventType, ctx)` entry point. Event hooks in existing server actions call it after their DB writes commit. Score update + audit-log write happen in **one Prisma `$transaction`** (FRS §7, §23.2). No public recalc endpoint is exposed.

---

## Phase A — Data model & scoring engine

### A1. Prisma schema additions (`prisma/schema.prisma`)

New fields on **Member** (no breaking change — all nullable/ defaulted):
- `trustScore Int @default(60)`, `badgeLevel String @default("Silver Member")`, `riskLevel String @default("Average")`, `scoreLastUpdated DateTime?`, `referredByMemberId String?` (self-ref), `memberStatus` is already represented by existing `status` enum — I'll reuse it (map `SUSPENDED`/`ACTIVE`/etc.). `@@index([trustScore])`.

New models (UUID PKs to match the codebase convention; the FRS's `INT`/`BIGINT` is adapted to the existing `String @id @default(uuid())` style):
- **KpiConfiguration** — singleton config row (weights, thresholds, badge mins, initialScore, suspension/reactivation thresholds, `updatedBy`). Defaults from FRS §16.4.
- **TrustScoreHistory** — immutable audit log (memberId, eventType, referenceId, referenceType, kpiAffected, scoreBefore, scoreChange, scoreAfter, remarks, createdBy). Index `(memberId, createdAt desc)`. `ON DELETE: Restrict`.
- **AchievementBadge** — memberId, badgeCode, badgeName, earnedDate, lostDate?, status (`ACTIVE`/`LOST`).
- **FineType** — unique name, penaltyPoints (>0), isActive.
- **Fine** — memberId, fineTypeId, amount?, status (`ISSUED`/`PAID`/`WAIVED`), issuedDate, resolvedDate?, notes?, referenceType?.
- **MeetingAttendance** — meetingId, memberId, status (`PRESENT`/`ABSENT`/`EXCUSED`), markedAt, markedBy. Compound unique `[meetingId, memberId]`.
- **MemberNotification** — memberId, type, title, message, isRead, createdAt (new persistent per-member notification table for score/badge/suspension events per FRS §14).

Then `npx prisma generate` + `npx prisma db push` (no `migrations/` folder exists today — project uses push). Add a `lib/trustScore/seedConfig.ts` idempotent upsert invoked lazily on first config read.

### A2. Scoring engine — `lib/trustScore/` (new)

```
lib/trustScore/
  types.ts              # KpiCode, ScoreEvent, KpiBreakdown, TrustScoreResult
  config.ts             # getKpiConfig() -> singleton, with defaults upsert
  context.ts            # loadMemberContext(memberId) -> raw data bundle (savings, loans+schedule, meetings, fines, referrals, feeSetups, dueCalc)
  weights.ts            # computeRedistributedWeights(context, config) — FRS §6, incl. rounding-correction-to-highest
  kpis/
    deposit.ts          # DEPOSIT — uses dueCalculator's totalExpected; on-time from savings date vs dueDay; late-penalty tiers
    loan.ts             # LOAN — aggregate LoanSchedule (PAID/OVERDUE/PARTIAL); N/A if no loan history; 0 on DEFAULTED
    attend.ts           # ATTEND — present+excused / total; full weight if no meetings
    fine.ts             # FINE — FineType penaltyPoints * unresolved Fines
    referral.ts         # REFERRAL — active+approved referred members table
  assembler.ts          # sum KPIs -> raw_total, clamp 0..100, round, correction-to-highest if ≠100
  badges.ts             # assignBadgeLevel(score, config); evaluateAchievements(ctx) -> diff (earned/lost) for the 7 achievement badges
  suggestions.ts        # rule-based improvement tips (FRS §13)
  recalculate.ts        # orchestrator: load -> weights -> each KPI -> assemble -> badge/risk -> atomic tx (update member + insert audit row) -> suspend check -> achievements diff + insert AchievementBadge rows -> notifications (async, non-blocking) -> returns result
```

**Mapping to existing data** (key decisions, faithful to FRS):
- **Deposit on-time rate**: `totalExpected` and per-cycle due dates come from the *existing* `lib/dueCalculator.ts` (already computes cycles + dueDay); payments (`Savings` excluding `WITHDRAWAL`/`FINE`/`LOAN_PAYMENT`) are matched against cycles by date. Late penalty uses FRS §5.2 tiers by days overdue.
- **Loan on-time rate**: aggregate across all `LoanSchedule` rows for the member's loans; `PAID`/`WAIVED` = on-time if `paidDate <= dueDate`; `OVERDUE`/`PARTIAL` past due = not on-time. `DEFAULTED` loan ⇒ LOAN KPI = 0.
- **Applicability**: LOAN N/A when member has no `Loan` rows at all (weight redistributed). Other KPIs always applicable.
- **Rounding correction**: per FRS §6.1/§3, if redistributed weights don't sum to 100 or post-round raw_total needs correction, the remainder goes to the highest-default-weight applicable KPI.

---

## Phase B — Event hooks (the trigger layer)

Add `await recalculateTrustScore(memberId, eventType)` calls **after the DB write, before any `redirect()`** (redirect throws). Existing files touched (small, surgical additions):

| File | Location | Event |
|---|---|---|
| `app/actions/finance.ts` | after `addCollection` create (line ~31), guard on `type` | `DEPOSIT_COLLECTED` / `FINE_ISSUED` |
| `app/actions/savings.ts` | after `addSavings` create (line ~20) | `DEPOSIT_COLLECTED` |
| `app/actions/loan.ts` | `approveLoan`, `disburseLoan`, `recordRepayment` (after tx), `writeOffLoan` | `LOAN_APPROVED` / `LOAN_DISBURSED` / `LOAN_INSTALLMENT_PAID` / `LOAN_CLOSED` |
| `app/actions/approval.ts` | `approveMember` (after status update) | `MEMBER_ACTIVATED` (initial score) |
| `app/actions/member.ts` | `updateMemberStatus` | `MEMBER_SUSPENDED` / `MEMBER_REACTIVATED` |

Hooks are wrapped in try/catch + `console.error` so a scoring failure never breaks the parent business operation (but the transaction inside the engine is still atomic for its own writes).

---

## Phase C — Attendance, Fines & Referral modules (per your "full management modules" choice)

### C1. Fines & Penalties (`/dashboard/fines` — replaces the current "ComingSoon")
- **FineType config**: list/create/deactivate (name, penaltyPoints, active). Maps to FRS §12.3.
- **Fine issuance**: pick member + FineType + amount + (optional linked Savings/fee). Creates `Fine` row (status ISSUED). Optionally mirror a `Savings{type:"FINE"}` for ledger continuity. Triggers recalc.
- **Pay / Waive**: transitions status, reverses penalty immediately via recalc.
- Actions in new `app/actions/fines.ts`; UI in `app/dashboard/fines/FinesManager.tsx`.

### C2. Meeting Attendance (`/dashboard/meetings` extended)
- Add an **Attendance** panel to each meeting card: member chips with PRESENT/ABSENT/EXCUSED toggle, bulk "mark all present", and save. Action `markAttendance(meetingId, rows)` in `app/actions/meeting.ts` upserts `MeetingAttendance` rows then fires `MEETING_ATTENDANCE_MARKED` recalc per affected member.

### C3. Referral capture
- Add an optional **Referred By** member-select to `components/member/MemberForm.tsx` + `addMember`/`updateMember` actions. On first approved activation of the referred member, fires `REFERRAL_APPROVED` against the referrer. Referral deactivation (referred member suspended/inactive) is evaluated by the KPI at recalc time.

---

## Phase D — Admin UI under "Member Management"

Add to `SIDEBAR_MENU_GROUPS` "Member Management" group in `components/AppSidebar.tsx`:
- **Trust Leaderboard** (`Award` icon) → `/dashboard/trust-score` (system-wide leaderboard + averages + risk distribution).
- **Achievement Badges** (`Medal` icon) → `/dashboard/trust-score/badges` (who holds which badge).
- **Score Settings** (`SlidersHorizontal`/`Settings` icon) → `/dashboard/trust-score/config` (KPI weights, thresholds, badge mins, initial score) — admin-only, FRS §12.

Routes (server components + client islands, matching the existing pattern):
- `app/dashboard/trust-score/page.tsx` + `TrustLeaderboardClient.tsx` — ranked members table with score, badge, risk, sortable/filterable, search; system stat cards (avg score, counts per tier, suspended count).
- `app/dashboard/trust-score/[id]/page.tsx` + `TrustScoreDetailClient.tsx` — the per-member dashboard (FRS §11): radial score card, KPI breakdown bars (green/yellow/red), 12-month trend chart (inline SVG sparkline-style to avoid a new chart dep), achievement badges grid (earned + locked), improvement suggestions, score-history table (paginated 20, filterable). Plus a **Reactivate** button for suspended members (FRS §9.2, calls `reactivateMember` action gated by committee/admin).
- `app/dashboard/trust-score/badges/page.tsx` — badge roster.
- `app/dashboard/trust-score/config/page.tsx` + `KpiConfigForm.tsx` — validates weights sum to 100 (blocks save otherwise), and on save triggers a background batch recalc across all members.
- Also surface a compact **Trust Score badge + number** on the existing member detail page (`app/dashboard/members/[id]/page.tsx`) and in the member list row, with a link to the score detail.

### D2. Member profile integration
On member detail page, add a "Trust Score" summary card linking to `/dashboard/trust-score/[id]`.

---

## Phase E — Member portal self-service (per your "also add member portal" choice)

- New route `app/portal/trust-score/page.tsx` (server component, same `getServerSession`/`memberId = session.user.id` prelude as `app/portal/savings/page.tsx`). Renders the member's **own** score card, KPI breakdown, badges, suggestions, and history — reusing the same server actions/ lib functions (read-only).
- Add `{ label: "Trust Score", icon: ShieldCheck, href: "/portal/trust-score" }` to `buildMenu()` in `components/PortalSidebar.tsx` and a title line in `components/PortalTopbar.tsx` `usePageTitle()`.
- Score-change notifications surface in the existing portal notification list (`getMemberNotifications` in `app/actions/portal.ts`) by also reading the new `MemberNotification` rows for the member.

---

## Phase F — Verify

Run `npx prisma generate`, `npx tsc --noEmit` (typecheck), and `npx next lint`; fix any issues. I won't run a full `next build` unless you want it (it's slower); typecheck + lint will catch the integration errors. I will **not** run `db push` automatically — I'll show you the command and the generated diff so you can apply it, since it touches the production schema. (If you'd prefer I run it, say so.)

---

## Notes / deviations from the FRS (called out for transparency)
- **PKs are UUIDs** (codebase convention) instead of the FRS's `INT`/`BIGINT`. Functionally equivalent.
- **`member_status` enum** is not added — the existing `MemberStatus` enum (`PENDING/ACTIVE/INACTIVE/SUSPENDED/DECEASED/CLOSED/REJECTED`) is reused; suspension uses `SUSPENDED`.
- **DB-level `REVOKE UPDATE, DELETE`** on audit history (FRS §15.1) can't be expressed in Prisma; I'll enforce immutability in code (no update/delete paths on `TrustScoreHistory`) and leave a comment with the SQL to run manually for hardening.
- **Async notifications** use `void`-returned fire-and-forget inside the same request (no external queue) — non-blocking relative to the score transaction, matching FRS §14.2's "must not block score update."
- **Score trend chart** uses inline SVG (no new dependency) to keep the bundle lean.
- Achievement-badge **expiry windows** are evaluated at recalc time from live data (e.g., "12 consecutive on-time deposits"), per FRS §10.1, rather than by a separate scheduler — which keeps correctness without new infra.

## Out of scope (future, per FRS §22)
Email/SMS for score events, ML risk, branch leaderboards, PDF/Excel export, mobile push.