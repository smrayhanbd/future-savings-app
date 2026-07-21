# Task Management Module — Implementation Plan

An ERP-grade Task Management module for the Somiti Management System, built end-to-end following the existing codebase conventions (Next.js 16 App Router, Prisma 6, NextAuth, shadcn/ui, server actions, cron-style scheduled routes). All decisions below reflect your selections: **real Committee entity**, **approve-completion workflow**, **full auto-spawn integration**, **hourly cron dispatcher**, **dedicated TaskAuditLog**, **everything built now**.

---

## 1. Data Model — `prisma/schema.prisma`

New enums:
- `TaskStatus` — `TODO | IN_PROGRESS | ON_HOLD | IN_REVIEW | DONE | APPROVED | CANCELLED`
- `TaskPriority` — `LOW | MEDIUM | HIGH | URGENT`
- `TaskRecurrence` — `NONE | DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY`
- `TaskAssigneeType` — `STAFF | MEMBER | COMMITTEE`
- `TaskReminderChannel` — `IN_APP | SMS | EMAIL`
- `TaskTimeScope` (for time logs) — not an enum; uses minutes integer.
- `AuditAction` (free-text strings, consistent with existing pattern) — e.g. `CREATE | UPDATE | STATUS_CHANGE | ASSIGN | COMMENT | APPROVE | REJECT | ATTACH | TIME_LOG`.

New models:

- **`Task`** — core record. Fields: `id`, `title`, `description` (`@db.Text`), `status`, `priority`, `dueDate?`, `reminderDate?`, `recurrence`, `recurrenceEndDate?`, `recurrenceParentId?` (self-relation linking generated occurrences to template), `order` (Kanban sort), `completionNote?`, `requiresApproval`, `approvalRequestedAt?`, `approvedById?`→User, `approvedAt?`, `returnReason?`, `progressPct` (0–100, optional auto-from-checklist), `isPrivate` (visible only to assignees+creators+admins), `location?`, plus **integration FKs** (all optional): `meetingId?`→Meeting, `loanId?`→Loan, `memberRequestId?`→MemberRequest, `transactionId?`→Transaction (collections), `relatedMemberId?`→Member. Full audit columns mirroring Transaction: `createdBy/createdById/createdAt`, `updatedById/updatedAt`. Indexes on `status`, `priority`, `dueDate`, `assigneeType`, each integration FK, `recurrenceParentId`.
- **`TaskAssignee`** — junction resolving polymorphic assignment. Fields: `taskId`, `assigneeType` (STAFF|MEMBER|COMMITTEE), `userId?`→User, `memberId?`→Member, `committeeId?`→Committee. Compound unique `[taskId, assigneeType, userId, memberId, committeeId]`. Enables multi-target assignment (a task can go to a staff, a committee, and several members at once).
- **`TaskChecklistItem`** — `id`, `taskId`, `title`, `isDone`, `order`, `completedById?`, `completedAt?`.
- **`TaskComment`** — `id`, `taskId`, `authorUserId?`→User, `authorMemberId?`→Member, `body` (`@db.Text`), `createdAt`, `updatedAt`. Supports both staff and member authors.
- **`TaskAttachment`** — `id`, `taskId`, `url`, `fileName`, `fileType?`, `fileSize?`, `uploadedById`→User, `createdAt` (reuses existing `saveUploadedFile` + Cloudinary pattern).
- **`TaskTimeLog`** — `id`, `taskId`, `userId?`, `memberId?`, `minutes`, `note?`, `loggedAt`, `createdAt`.
- **`TaskReminder`** — `id`, `taskId`, `channel` (IN_APP|SMS|EMAIL), `offsetMinutes` (e.g. −1440 = 1 day before), `dispatchedAt?` (cron marks this so it never re-fires). For recurring tasks, `dispatchedAt` is cleared on each spawned occurrence.
- **`TaskDependency`** — self-relation. Fields: `taskId` (blocked), `dependsOnTaskId` (blocking). Compound unique `[taskId, dependsOnTaskId]`. Server action validates no cycles.
- **`TaskAuditLog`** — append-only. Fields: `id`, `taskId`, `actorUserId?`→User, `actorMemberId?`→Member, `action` (string), `summary`, `changes` (`Json?` diff, secret-free), `createdAt`. Indexed on `[taskId, createdAt(sort:Desc)]`.
- **`TaskApprovalRequest`** — tracks the completion-approval gate. Fields: `id`, `taskId`, `requestedById`→User, `requestedAt`, `decision` (`PENDING|APPROVED|REJECTED|RETURNED`), `decidedById?`, `decidedAt?`, `comment?`.
- **`Committee`** — real entity. Fields: `id`, `name`, `description?`, `chairUserId?`→User, `isActive`, `createdAt`, `updatedAt`. Relation to `CommitteeMember`.
- **`CommitteeMember`** — junction. Fields: `id`, `committeeId`, `memberId?`→Member, `userId?`→Staff, `role?` (e.g. MEMBER/SECRETARY). Compound unique `[committeeId, memberId]` and `[committeeId, userId]`.

All new models get back-relations added to existing models (`User`, `Member`, `Meeting`, `Loan`, `MemberRequest`, `Transaction`).

Migration: `prisma migrate dev --name add_task_management_module`.

---

## 2. Permissions — `lib/permissions.ts`

Add to `PERMISSIONS` constant and `PERMISSION_GROUPS`:
- `TASK_CREATE`, `TASK_VIEW_ALL`, `TASK_ASSIGN`, `TASK_APPROVE`, `TASK_DELETE`, `TASK_MANAGE_RECURRING`, `COMMITTEE_MANAGE`.

Authorization rules (enforced in actions):
- **Create**: needs `TASK_CREATE` (SUPER_ADMIN always).
- **View**: staff with `TASK_VIEW_ALL` sees all; otherwise sees only tasks they created or are assigned to. Members see only tasks assigned to them or their committee (via portal).
- **Update/edit**: creator, assignee, or any user with `TASK_ASSIGN`/`TASK_APPROVE`. Members (via portal) can update **status only** of tasks assigned to them, plus add comments and complete checklists.
- **Delete**: `TASK_DELETE` only.
- **Approve completion**: needs `TASK_APPROVE` (manager/admin tier).

---

## 3. Server Actions — `app/actions/tasks.ts` + `app/actions/committee.ts`

Follow `app/actions/users.ts` pattern: `"use server"`, `ActionResult` return type, `getCurrentUser`/`requirePermission`, `revalidatePath`, atomic Prisma transactions where multi-row writes occur. Every mutating action writes a `TaskAuditLog` row inside the same transaction.

**tasks.ts** exports:
- `createTask(formData)` — validate (zod), persist task + assignees + checklist + reminders + attachments, set integration FK, write audit, create `Notification`/`MemberNotification` ("Task assigned: <title>") + optional SMS/email. If `recurrence != NONE`, schedule first occurrence logic via cron.
- `updateTask(id, formData)` — diff-aware, enforced by permission, audit log.
- `updateTaskStatus(id, status, note?)` — member-portal safe (members restricted to subset of transitions), revalidates progress, blocks DONE→APPROVED unless `requiresApproval` is honored.
- `requestCompletionApproval(id)` — assignee/creator sets task to `IN_REVIEW`, creates `TaskApprovalRequest(PENDING)`, notifies approvers.
- `approveTask(id, comment?)` / `rejectTask(id, reason?)` / `returnTask(id, reason?)` — gated by `TASK_APPROVE`, transitions status, writes audit, notifies assignees.
- `addComment(id, body)` / `deleteComment(commentId)` — staff & member authors.
- `addChecklistItem`, `toggleChecklistItem`, `reorderChecklist`, `deleteChecklistItem` — progress auto-derived when items exist.
- `addAttachment(id, formData)` / `deleteAttachment(id)` — reuses `lib/upload.ts`.
- `logTime(id, minutes, note?)` / `deleteTimeLog(id)`.
- `addDependency(taskId, dependsOnTaskId)` / `removeDependency` — with cycle-detection (DFS).
- `setReminder(id, channel, offsetMinutes)` / `removeReminder`.
- `deleteTask(id)` — `TASK_DELETE`; soft/prevent if spawned recurring children exist.
- `bulkUpdateStatus(ids, status)`, `bulkAssign(ids, …)`, `bulkDelete(ids)`.
- Read helpers (non-mutating, exported for pages): `getTaskById`, `listTasks(filters)`, `getTaskStats()`, `getTaskActivity(id)`, `getMyTasks(scope)`, `getPortalMemberTasks(memberId)`.

**committee.ts** exports: `createCommittee`, `updateCommittee`, `toggleCommitteeActive`, `deleteCommittee`, `addCommitteeMember`, `removeCommitteeMember`, plus read `listCommittees`.

Validation: shared zod schemas in a new `lib/tasks/validation.ts`. Reminder/notification dispatch centralized in `lib/tasks/notify.ts`.

---

## 4. Auto-Spawn Integration

Add non-blocking spawn hooks into existing modules (create task + audit + notify):
- **Loans** (`app/actions/loan.ts`): on `DISBURSED` → spawn "Process disbursement documentation for L####"; when a loan becomes overdue (detected by existing due logic) → spawn "Collection follow-up: <member>".
- **Member Requests** (`app/actions/approval.ts` / `transactions.ts`): on new withdrawal/closing request → spawn "Review member request: <member>".
- **Meetings** (`app/actions/meeting.ts`): on create → spawn "Prepare agenda / notify members" assigned to creator (if staff) or default admin.
- **New Member approval**: on member approved → spawn "Welcome & onboard <member>" (KYC follow-up checklist).
- A reusable `lib/tasks/spawn.ts` (`spawnTask(opts)`) keeps all hooks consistent and idempotent (skips if an open task already links the same record+title).

Each detail page of those modules gains a **"Create follow-up task"** button and a read-only panel listing linked tasks (bi-directional display).

---

## 5. Reminders & Recurring Cron — `app/api/tasks/process/route.ts`

Mirrors `app/api/wishes/send/route.ts` exactly (`CRON_SECRET` via header/query, `force-dynamic`). Designed for **hourly** external invocation (documented in route header + `vercel.json` snippet in README). Responsibilities:
- **Due-soon / overdue reminders**: find `TaskReminder` rows where `dispatchedAt` is null and the reminder time has arrived; dispatch via channel (SMS/Email/In-App → `Notification`/`MemberNotification`); mark `dispatchedAt`.
- **Recurring spawn**: for tasks where `recurrence != NONE`, `status not in (CANCELLED)`, and next-occurrence date ≤ now and (no `recurrenceEndDate` or not passed): create a new `Task` clone (status `TODO`, fresh reminders), link `recurrenceParentId` to template, carry assignees/checklist/integration FKs.
- **Overdue escalation**: tasks past `dueDate` and still `TODO/IN_PROGRESS` → In-App `Notification` to creator + assignees (once per task per overdue state).
Central logic in `lib/tasks/dispatcher.ts` so it's unit-testable and reusable.

---

## 6. Dashboard UI — `app/dashboard/tasks/*`

Server pages (`export const dynamic = 'force-dynamic'`, parallel Prisma queries, serialize to client components — same pattern as `loans/page.tsx`). Layout:

- `app/dashboard/tasks/layout.tsx` — shared header + filter bar (status, priority, assignee, due-range, search) in a client component.
- `app/dashboard/tasks/page.tsx` — **main hub**: KPI cards (Open / In Progress / Due This Week / Overdue / Pending Approval), tabs for **List / Kanban / Calendar**.
  - `TaskList.tsx` — sortable/filterable table (shadcn `Table`), row actions (view, status, quick-approve).
  - `TaskKanban.tsx` — drag-and-drop columns (status groups); uses framer-motion (already a dep) for DnD, calls `updateTaskStatus` on drop.
  - `TaskCalendar.tsx` — month grid (`react-day-picker` already installed) showing tasks on their due dates.
- `app/dashboard/tasks/new/page.tsx` — create form (react-hook-form + zod): title, description (TipTap rich text — already installed), priority, due/reminder, assignee multi-select (staff/members/committees), checklist editor, attachments, recurrence, dependencies, integration link, `requiresApproval` toggle.
- `app/dashboard/tasks/[id]/page.tsx` — **detail**:
  - Left: title, status badge, description, checklist (with progress bar), attachments, comments thread, activity timeline (from `TaskAuditLog`), time-log panel.
  - Right sidebar: assignees, priority, due date, dependencies, reminders, integration chips (Meeting/Loan/Request/Collection/Member with links), approval block (request/approve/return/reject).
- `app/dashboard/tasks/board/[committeeId]/page.tsx` (optional filtered board).
- `app/dashboard/tasks/reports/page.tsx` — **reports & analytics**: completion rate, avg time-to-close, overdue %, workload per assignee/staff, by-priority breakdown, CSV export. Uses server-side aggregation + a charting-friendly table.
- `app/dashboard/committees/page.tsx` — committee CRUD UI (members management matrix).

Shared client components in `components/tasks/*` (badge styles, status pill, assignee avatar stack, filter bar, etc.), reusing existing `components/ui/*`.

---

## 7. Member Portal — `app/portal/tasks/*`

Gated to `MEMBER` role by existing `app/portal/layout.tsx`. Members see **only tasks assigned to them or their committee** (`getPortalMemberTasks`).
- `app/portal/tasks/page.tsx` — simplified List + Kanban of the member's tasks.
- `app/portal/tasks/[id]/page.tsx` — read-only-ish detail: can update **their** status (limited transitions: TODO→IN_PROGRESS→IN_REVIEW), check off checklist items assigned to the task, post comments, log their own time. Cannot edit title/dates/assignees or approve. Validation server-side in `app/actions/tasks.ts` enforces this regardless of UI.
Add **"My Tasks"** entry to `components/PortalSidebar.tsx` (`/portal/tasks`).

---

## 8. Navigation & Seed

- Add `Committee Management` nav entry under "Operations & Management" in `components/AppSidebar.tsx` (Task Management entry already present at `/dashboard/tasks`).
- Add `My Tasks` entry in `components/PortalSidebar.tsx`.
- Extend `prisma/seed.js` with: a sample `Committee` ("Executive Committee"), a few seeded permission grants for an admin demo user (so the module works out-of-box), and one demo recurring task + reminder (only if env `SEED_TASKS=true`, default off — keeps existing seed deterministic).
- Update `README.md` with: new `/api/tasks/process` cron schedule snippet (hourly), new permissions list, and the optional `SEED_TASKS` flag.

---

## 9. Notifications & Validation

- **Reminders/notifications** route through the existing `sendEmail` (`lib/email.ts`) and `sendSMS` (`lib/sms.ts`) plus `Notification` (admin topbar) and `MemberNotification` (portal). No new transport code.
- **Validation**: zod schemas (`lib/tasks/validation.ts`) for all inputs; server actions double-check authorization and return `ActionResult`. File uploads validated by `lib/upload.ts`. Cycle-detection on dependencies. All FK lookups verified before write.

---

## 10. File Plan (summary)

**New files**
- `prisma/schema.prisma` (edited — add 11 models + 7 enums + back-relations)
- `app/actions/tasks.ts`, `app/actions/committee.ts`
- `lib/tasks/validation.ts`, `lib/tasks/notify.ts`, `lib/tasks/spawn.ts`, `lib/tasks/dispatcher.ts`
- `app/api/tasks/process/route.ts`
- `app/dashboard/tasks/{layout,page,new,reports}.tsx`, `app/dashboard/tasks/[id]/page.tsx`, `app/dashboard/tasks/board/[committeeId]/page.tsx`
- `app/dashboard/committees/page.tsx`
- `app/portal/tasks/page.tsx`, `app/portal/tasks/[id]/page.tsx`
- `components/tasks/*` (shared: TaskBadge, StatusPill, AssigneeStack, FilterBar, ChecklistEditor, CommentThread, ApprovalPanel, TimeLogPanel, KanbanBoard, CalendarGrid, TaskForm)
- `prisma/seed.js` (edited), `README.md` (edited)
- Edited: `lib/permissions.ts`, `components/AppSidebar.tsx`, `components/PortalSidebar.tsx`, `app/actions/{loan,meeting,approval,transactions}.ts` (spawn hooks), `app/dashboard/{loans,meetings,approvals}/[id]` detail pages (linked-tasks panel + "Create follow-up task" button).

**Build & verify**: run `npx prisma format && npx prisma generate`, then `npm run build` to confirm types compile and the new routes/pages build cleanly. Fix any type errors before finishing.

---

## Notes & Assumptions
- Assumes `lib/upload.ts`'s MIME allow-list is acceptable for task attachments (PDF/DOC/DOCX/TXT) — I'll extend it to images + a safe superset for this module (with a guardlist for executables).
- Recurring spawn uses the template-task pattern (one record per occurrence linked via `recurrenceParentId`) — simplest and matches how most task trackers behave; matches your append-only audit philosophy.
- No new dependencies required (DnD via framer-motion; calendar via react-day-picker; charts via plain shadcn tables/CSS bars to avoid a chart-lib bump — can upgrade later if desired).
- Everything is gated server-side; the member-portal restrictions are enforced in actions regardless of what the UI exposes.

Let me know if you'd like me to adjust scope (e.g., drop auto-spawn to Phase 2, or add a dedicated charts library) before I start building.