/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// RBAC SEED — system roles + the full Permission catalogue.
// ----------------------------------------------------------------------------
// Idempotent: safe to re-run. Creates the 5 system roles with their default
// permission grants and ensures every permission node from the registry
// exists as a Permission row so the matrix UI can resolve keys.
//
// Run with:  node prisma/seed-permissions.js
//   (wired into `prisma db seed` via package.json "prisma.seed")
//
// NOTE ON CO/EXISTENCE WITH THE OLD MODEL:
// This script leaves User.role (the flat string) and the UserPermission table
// untouched. During migration the resolver honours both systems. The Super
// Admin created by seed.js (admin@foundation.com) is additionally linked to
// the new Super Admin role here so the new resolver also recognises them.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Permission registry (mirrors lib/permissions/permission-registry.ts) ─
// Kept as plain data so this CJS seed needs no TS transpiler. The TS file is
// the canonical source; if you change the registry there, mirror the change
// here (or run a one-off sync from enumerateRegistry()).
const REGISTRY = {
  Overview: {
    Dashboard: { tabs: [], actions: ['export_pdf', 'print'] },
  },
  'Member Management': {
    'Member Panel': { tabs: ['all', 'active', 'pending', 'suspended'], actions: ['create_member', 'edit_member', 'delete_member', 'approve_member', 'suspend_member', 'export_pdf', 'send_sms'] },
    'Pending Approvals': { tabs: ['member_requests', 'profile_requests'], actions: ['approve', 'reject', 'request_more_info'] },
    "Member's Pending Req.": { tabs: ['profile_requests', 'pending'], actions: ['approve', 'reject', 'request_more_info'] },
    'Trust Leaderboard': { tabs: [], actions: ['export_pdf', 'print'] },
    'Achievement Badges': { tabs: ['all', 'awarded'], actions: ['create_badge', 'edit_badge', 'delete_badge', 'assign_badge'] },
    'Score Settings': { tabs: [], actions: ['edit_config', 'reset_scores'] },
  },
  Transactions: {
    "Members Due List": { tabs: ['all', 'overdue', 'upcoming'], actions: ['send_sms', 'export_pdf', 'print', 'apply_charge'] },
    'Deposit Entry': { tabs: ['pending', 'approved', 'reversed'], actions: ['create_deposit', 'edit_deposit', 'delete_deposit', 'approve_deposit', 'reverse_deposit', 'print'] },
    'Withdrawal Entry': { tabs: ['pending', 'approved', 'reversed'], actions: ['create_withdrawal', 'edit_withdrawal', 'delete_withdrawal', 'approve_withdrawal', 'reverse_withdrawal', 'print'] },
    'Distribute Income': { tabs: ['draft', 'posted', 'reversed'], actions: ['create_distribution', 'post_distribution', 'reverse_distribution', 'print', 'export_pdf'] },
    'Apply Charges': { tabs: ['pending', 'approved', 'reversed'], actions: ['create_charge', 'edit_charge', 'delete_charge', 'approve_charge', 'reverse_charge', 'send_sms'] },
    'Admin Submitted': { tabs: ['pending', 'approved', 'returned', 'rejected'], actions: ['approve', 'return', 'reject', 'reverse'] },
    'Member Requests': { tabs: ['pending', 'approved', 'rejected'], actions: ['approve', 'reject', 'request_more_info'] },
    'Cash Closing': { tabs: ['open', 'closed'], actions: ['open_cash', 'close_cash', 'adjust', 'print'] },
    'Transaction History': { tabs: ['deposits', 'withdrawals', 'charges', 'distributions'], actions: ['export_pdf', 'print', 'view_detail', 'reverse'] },
    'Fees & Charge Setup': { tabs: ['active', 'inactive'], actions: ['create_fee', 'edit_fee', 'delete_fee', 'toggle_active'] },
  },
  'Finance & Accounting': {
    'Loan Management': { tabs: ['overview', 'pending', 'active', 'closed', 'defaulted'], actions: ['create_loan', 'edit_loan', 'delete_loan', 'approve_loan', 'disburse_loan', 'reject_loan', 'record_repayment', 'write_off', 'export_pdf', 'print', 'send_sms'] },
    'Chart of Accounts': { tabs: ['assets', 'liabilities', 'income', 'expense'], actions: ['create_account', 'edit_account', 'delete_account', 'toggle_active'] },
    'Voucher Entry': { tabs: ['journal', 'receipt', 'payment', 'contra'], actions: ['create_voucher', 'edit_voucher', 'delete_voucher', 'post_voucher', 'print'] },
    'Trial Balance': { tabs: [], actions: ['export_pdf', 'print'] },
    'Balance Sheet': { tabs: [], actions: ['export_pdf', 'print'] },
    'Profit & Loss': { tabs: [], actions: ['export_pdf', 'print'] },
    'Account Ledger': { tabs: [], actions: ['export_pdf', 'print'] },
    'Member Ledger': { tabs: [], actions: ['export_pdf', 'print', 'send_sms'] },
    'Money Receipts': { tabs: [], actions: ['print', 'export_pdf'] },
    'View Vouchers': { tabs: ['journal', 'receipt', 'payment'], actions: ['print', 'reverse', 'export_pdf'] },
  },
  'Operations & Management': {
    'Meeting Management': { tabs: ['upcoming', 'completed', 'cancelled'], actions: ['create_meeting', 'edit_meeting', 'delete_meeting', 'mark_attendance', 'upload_minutes', 'send_sms'] },
    'Project Management': { tabs: ['planning', 'active', 'completed'], actions: ['create_project', 'edit_project', 'delete_project', 'record_expense', 'record_revenue', 'export_pdf'] },
    'Investment Management': { tabs: ['active', 'exited', 'draft'], actions: ['create_investment', 'edit_investment', 'delete_investment', 'record_income', 'record_exit', 'record_valuation', 'distribute_income', 'export_pdf'] },
    'All Tasks': { tabs: ['my_tasks', 'all_tasks', 'completed', 'overdue'], actions: ['create_task', 'edit_task', 'delete_task', 'assign_task', 'approve_task', 'start_task', 'complete_task', 'log_time'] },
    'Task Reports': { tabs: [], actions: ['export_pdf', 'print'] },
    Committees: { tabs: ['active', 'archived'], actions: ['create_committee', 'edit_committee', 'delete_committee', 'assign_member'] },
    'Special Wishes': { tabs: ['upcoming', 'past'], actions: ['create_wish', 'edit_wish', 'delete_wish', 'send_sms'] },
  },
  'System & Settings': {
    'User Control': { tabs: ['users', 'roles', 'audit'], actions: ['create_user', 'edit_user', 'delete_user', 'deactivate_user', 'assign_role', 'manage_permissions', 'view_audit'] },
    'Role Permissions': { tabs: ['roles', 'matrix'], actions: ['create_role', 'edit_role', 'delete_role', 'manage_permissions', 'view_audit'] },
    'Organization Info': { tabs: [], actions: ['edit'] },
    'Landing Page Content': { tabs: [], actions: ['edit'] },
    'Active Bank Accounts': { tabs: [], actions: ['create_account', 'edit_account', 'delete_account', 'set_default'] },
    'Mail Server Setup': { tabs: [], actions: ['edit', 'test_connection'] },
    'SMS Service API': { tabs: [], actions: ['edit', 'test_connection', 'send_test'] },
    'Approval Limits': { tabs: [], actions: ['create_limit', 'edit_limit', 'delete_limit'] },
    'Cloud Backup': { tabs: ['backups', 'settings'], actions: ['create_backup', 'restore_backup', 'download_backup', 'delete_backup'] },
  },
};

const SEP = '::';
const groupKey = (g) => g;
const pageKey = (g, p) => `${g}${SEP}${p}`;
const tabKey = (g, p, t) => `${g}${SEP}${p}${SEP}${t}`;
const actionKey = (g, p, a, t) => `${g}${SEP}${p}${SEP}${t ?? ''}${SEP}${a}`;

// Walk the registry → every permission node (mirrors enumerateRegistry()).
// tab/action use '' (empty string), NOT null — see the Permission model note.
function enumerateRegistry() {
  const nodes = [];
  for (const [group, pages] of Object.entries(REGISTRY)) {
    nodes.push({ menuGroup: group, page: '', tab: '', action: '', key: groupKey(group) });
    for (const [page, def] of Object.entries(pages)) {
      nodes.push({ menuGroup: group, page, tab: '', action: '', key: pageKey(group, page) });
      for (const tab of def.tabs) {
        nodes.push({ menuGroup: group, page, tab, action: '', key: tabKey(group, page, tab) });
      }
      for (const action of def.actions) {
        nodes.push({ menuGroup: group, page, tab: '', action, key: actionKey(group, page, action) });
      }
    }
  }
  return nodes;
}

// ── Helper: every key under a group (the group + all its pages/tabs/actions) ─
function allKeysUnderGroup(group) {
  return enumerateRegistry()
    .filter((n) => n.menuGroup === group)
    .map((n) => n.key);
}

// ── Helper: for a group, only the read-only/view keys (group + page + tabs,
//    plus export/print actions, but NO create/edit/delete/approve actions).
//    Used for Auditor + read-only roles.
const READONLY_ACTIONS = new Set(['export_pdf', 'print', 'view_detail']);
function readOnlyKeysForGroup(group) {
  const out = [groupKey(group)];
  for (const [page, def] of Object.entries(REGISTRY[group])) {
    out.push(pageKey(group, page));
    for (const tab of def.tabs) out.push(tabKey(group, page, tab));
    for (const action of def.actions) {
      if (READONLY_ACTIONS.has(action)) out.push(actionKey(group, page, action));
    }
  }
  return out;
}

// ── The 5 system roles and their default permission keys ─────────────────
const SYSTEM_ROLES = [
  {
    name: 'Super Admin',
    description: 'Full unrestricted access to every module. Cannot be deleted.',
    isSystem: true,
    isSuperAdmin: true,
    // The resolver short-circuits on isSuperAdmin, so the grant set is empty —
    // we still create the role rows for audit/display.
    keys: [],
  },
  {
    name: 'Treasurer / Cashier',
    description: 'Full Transactions section (deposits, withdrawals, charges, distributions, approvals). Read-only Finance reports. No System Settings, no User Control.',
    isSystem: true,
    isSuperAdmin: false,
    keys: [
      // Overview (read)
      ...readOnlyKeysForGroup('Overview'),
      // Full Transactions
      ...allKeysUnderGroup('Transactions'),
      // Finance & Accounting: loans + voucher entry (full), statements + reports (read-only)
      ...allKeysUnderGroup('Finance & Accounting').filter((k) => {
        const page = k.split(SEP)[1];
        return page === 'Loan Management' || page === 'Voucher Entry' || page === 'Chart of Accounts';
      }),
      ...['Trial Balance', 'Balance Sheet', 'Profit & Loss', 'Account Ledger', 'Member Ledger', 'Money Receipts', 'View Vouchers'].flatMap((p) => readOnlyKeysForGroup('Finance & Accounting').filter((k) => k.split(SEP)[1] === p)),
    ],
  },
  {
    name: 'Auditor',
    description: 'Read-only access to all of Finance & Accounting and Transactions history. Can view reports and ledgers but cannot create, edit, approve, or delete anything.',
    isSystem: true,
    isSuperAdmin: false,
    keys: [
      ...readOnlyKeysForGroup('Overview'),
      ...readOnlyKeysForGroup('Finance & Accounting'),
      ...readOnlyKeysForGroup('Transactions').filter((k) => {
        const page = k.split(SEP)[1];
        // Auditor sees transaction history & approvals read-only, not data entry.
        return page === 'Transaction History' || page === 'Admin Submitted' || page === 'Member Requests';
      }),
    ],
  },
  {
    name: 'Committee Member',
    description: 'Operations & Management (meetings, projects, investments, tasks, committees, wishes). Read-only Dashboard. No financial data entry.',
    isSystem: true,
    isSuperAdmin: false,
    keys: [
      ...readOnlyKeysForGroup('Overview'),
      ...allKeysUnderGroup('Operations & Management'),
    ],
  },
  {
    name: 'Member Support',
    description: 'Member Management section (members, approvals, trust score). View-only Transactions. No Finance, no Settings, no User Control.',
    isSystem: true,
    isSuperAdmin: false,
    keys: [
      ...readOnlyKeysForGroup('Overview'),
      ...allKeysUnderGroup('Member Management'),
      // View-only on Transactions: just see history & due list, no actions.
      ...readOnlyKeysForGroup('Transactions').filter((k) => {
        const page = k.split(SEP)[1];
        return page === 'Members Due List' || page === 'Transaction History';
      }),
    ],
  },
];

// Dedupe helper (role keys may overlap after filtering).
const uniq = (arr) => Array.from(new Set(arr));

// ── Key → (menuGroup, page, tab, action) for Permission.upsert natural key ─
// tab/action default to '' (empty string), never null — matches the column
// default so the compound unique lookup always works.
function keyToFields(key) {
  // Split into at most 4 segments. The tab segment may be '' for action keys.
  const parts = key.split(SEP);
  if (parts.length === 1) return { menuGroup: parts[0], page: '', tab: '', action: '' };
  if (parts.length === 2) return { menuGroup: parts[0], page: parts[1], tab: '', action: '' };
  if (parts.length === 3) return { menuGroup: parts[0], page: parts[1], tab: parts[2], action: '' };
  // 4 segments: group, page, tab (possibly ''), action
  return { menuGroup: parts[0], page: parts[1], tab: parts[2], action: parts[3] };
}

async function main() {
  console.log('→ Seeding RBAC permissions & system roles…');

  // ── 1. Ensure every registry node exists as a Permission row ──────────
  const nodes = enumerateRegistry();
  let permCount = 0;
  for (const node of nodes) {
    await prisma.permission.upsert({
      where: {
        menuGroup_page_tab_action: {
          menuGroup: node.menuGroup,
          page: node.page,
          tab: node.tab,
          action: node.action,
        },
      },
      update: {},
      create: {
        menuGroup: node.menuGroup,
        page: node.page,
        tab: node.tab,
        action: node.action,
      },
    });
    permCount++;
  }
  console.log(`  ✓ ${permCount} permission rows ensured`);

  // ── 2. Ensure the 5 system roles exist with their default grants ──────
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isSuperAdmin: roleDef.isSuperAdmin,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isSuperAdmin: roleDef.isSuperAdmin,
      },
    });

    // Super Admin needs no RolePermission rows (resolver short-circuits).
    if (roleDef.isSuperAdmin) {
      console.log(`  ✓ Role "${roleDef.name}" (super-admin, all access)`);
      continue;
    }

    // Replace this role's grants with the seed defaults. (Re-running the seed
    // resets system-role grants to the spec; custom roles are never touched.)
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const keys = uniq(roleDef.keys);
    for (const key of keys) {
      const fields = keyToFields(key);
      const perm = await prisma.permission.findUnique({
        where: { menuGroup_page_tab_action: fields },
        select: { id: true },
      });
      if (!perm) {
        console.warn(`    ! permission not found for key "${key}" — skipping`);
        continue;
      }
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: perm.id },
      });
    }
    console.log(`  ✓ Role "${roleDef.name}" → ${keys.length} permissions`);
  }

  // ── 3. Link the bootstrap Super Admin user to the new Super Admin role ─
  // seed.js creates admin@foundation.com with role='SUPER_ADMIN'. Attach the
  // new Role too so the new resolver recognises them.
  const admin = await prisma.user.findUnique({ where: { email: 'admin@foundation.com' } });
  if (admin) {
    const superRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    if (superRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: admin.id, roleId: superRole.id } },
        update: {},
        create: { userId: admin.id, roleId: superRole.id, assignedBy: 'seed' },
      });
      console.log(`  ✓ Linked ${admin.email} → Super Admin role`);
    }
  }

  console.log('→ RBAC seed complete.');
}

main()
  .catch((e) => {
    console.error('RBAC seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
