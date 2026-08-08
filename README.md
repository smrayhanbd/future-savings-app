This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Task Management Module

An ERP-grade task subsystem spanning the staff dashboard and the member portal.

### Routes

- `/dashboard/tasks` — staff hub (List / Kanban / Calendar) with KPIs and filters
- `/dashboard/tasks/new` — create form (assignees, checklist, reminders, recurrence, dependencies, record-linking)
- `/dashboard/tasks/[id]` — task detail (checklist, comments, attachments, time logs, approval, audit timeline)
- `/dashboard/tasks/reports` — completion / workload / time-tracking analytics
- `/dashboard/committees` — committee CRUD + membership management
- `/portal/tasks` & `/portal/tasks/[id]` — member portal: view and update assigned tasks only
- `POST|GET /api/tasks/process` — hourly cron (reminders, recurring spawn, overdue escalation)

### Hourly cron setup

The dispatcher runs via an external scheduler (same pattern as `/api/wishes/send`).
Vercel `vercel.json`:

```json
{ "crons": [{ "path": "/api/tasks/process", "schedule": "0 * * * *" }] }
```

Alternatively, hit the URL hourly with `x-cron-secret` header (or `?secret=`) equal to
`CRON_SECRET`. Without `CRON_SECRET` set, the endpoint is open (development only).

### Permissions (granted via User Control matrix)

- `TASK_CREATE` — create tasks
- `TASK_VIEW_ALL` — see all tasks (otherwise only created/assigned)
- `TASK_ASSIGN` — reassign / edit others' tasks
- `TASK_APPROVE` — approve task completion
- `TASK_DELETE` — delete tasks
- `TASK_MANAGE_RECURRING` — change a task's recurrence
- `COMMITTEE_MANAGE` — manage committees and memberships

`SUPER_ADMIN` bypasses all checks.

### Cross-module integration

Tasks auto-spawn from business events (non-blocking, idempotent):

- Loan disbursement → "Process disbursement documentation"
- New withdrawal / closing request → "Review member request"
- Meeting creation → "Prepare for meeting"
- Member approval → "Onboard new member"

Loan and member-approval detail pages show a **Linked Tasks** panel with a
"Create follow-up task" button that pre-fills the record link.

### Seed

```bash
SEED_TASKS=true npm run db:seed   # or: node prisma/seed.js
```

Creates an Executive Committee, grants the demo admin all task permissions, and
seeds one recurring + one open task. Default seed (without the flag) is unchanged.

