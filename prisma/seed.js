/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Standard Chart-of-Accounts entries the Transactions Module's double-entry
// rules resolve by `accountCode`. If they don't already exist we create them
// so the approve action can post balanced vouchers without manual setup.
// ---------------------------------------------------------------------------
const TXN_SYSTEM_ACCOUNTS = [
  {
    accountCode: 'MEMBER-SAVINGS-LIABILITY',
    accountName: 'Member Savings Liability',
    accountType: 'LIABILITY',
    nature: 'CREDIT',
    description: 'Aggregate liability owed to members for their savings balances.',
  },
  {
    accountCode: 'CASH-IN-HAND',
    accountName: 'Cash in Hand',
    accountType: 'ASSET',
    nature: 'DEBIT',
    isCash: true,
    description: 'Physical cash held by the Somiti (drawer / petty / main cash).',
  },
  {
    accountCode: 'BANK-ACCOUNTS',
    accountName: 'Bank Accounts',
    accountType: 'ASSET',
    nature: 'DEBIT',
    isBank: true,
    description: 'Parent grouping for all operating bank accounts.',
  },
  {
    accountCode: 'MOBILE-WALLETS',
    accountName: 'Mobile Wallets (bKash/Nagad/Rocket)',
    accountType: 'ASSET',
    nature: 'DEBIT',
    description: 'Parent grouping for mobile-wallet business accounts.',
  },
  {
    accountCode: 'PROFIT-PAYABLE',
    accountName: 'Profit / Income Payable',
    accountType: 'LIABILITY',
    nature: 'CREDIT',
    description: 'Profit/income calculated for distribution but not yet credited to members.',
  },
  {
    accountCode: 'INCOME-PROFIT-INTEREST',
    accountName: 'Profit & Interest Income',
    accountType: 'INCOME',
    nature: 'CREDIT',
    description: 'Project profit, bank interest, investment income, dividends.',
  },
  {
    accountCode: 'EXPENSE-RECOVERY-INCOME',
    accountName: 'Expense Recovery Income',
    accountType: 'INCOME',
    nature: 'CREDIT',
    description: 'Charges recovered from members to offset incurred expenses.',
  },
  {
    accountCode: 'OPERATING-EXPENSES',
    accountName: 'Operating Expenses',
    accountType: 'EXPENSE',
    nature: 'DEBIT',
    description: 'Parent grouping for service, bank, annual and admin charges.',
  },
];

async function main() {
  // --- 1. Bootstrap Super Admin ---------------------------------------------
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@foundation.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'admin@foundation.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      name: 'System Administrator',
    },
  });

  // --- 2. Ensure Counter rows exist -----------------------------------------
  await prisma.counter.upsert({
    where: { id: 'transaction' },
    update: {},
    create: { id: 'transaction', value: 0 },
  });

  // --- 3. Seed default Approval Limits (spec §13) ---------------------------
  // Replace any existing rows with the canonical 3-tier configuration.
  const existingLimits = await prisma.approvalLimit.count();
  if (existingLimits === 0) {
    await prisma.approvalLimit.createMany({
      data: [
        {
          level: 1,
          label: 'Branch Manager',
          role: 'ADMIN',
          minAmount: 0,
          maxAmount: 50000,
          isActive: true,
        },
        {
          level: 2,
          label: 'Regional Manager',
          role: 'ADMIN',
          permission: 'TRANSACTION_APPROVE',
          minAmount: 50000.01,
          maxAmount: 500000,
          isActive: true,
        },
        {
          level: 3,
          label: 'Super Admin / Executive Committee',
          role: 'SUPER_ADMIN',
          minAmount: 500000.01,
          maxAmount: 9999999999,
          isActive: true,
        },
      ],
    });
  }

  // --- 4. Ensure system Chart-of-Accounts entries exist ---------------------
  for (const acc of TXN_SYSTEM_ACCOUNTS) {
    const exists = await prisma.account.findUnique({
      where: { accountCode: acc.accountCode },
      select: { id: true },
    });
    if (!exists) {
      await prisma.account.create({
        data: {
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          accountType: acc.accountType,
          nature: acc.nature,
          description: acc.description,
          isBank: !!acc.isBank,
          isCash: !!acc.isCash,
          allowPosting: true,
          allowJournal: true,
          status: 'ACTIVE',
        },
      });
    }
  }

  console.log('--------------------------------------------------');
  console.log('Seed complete.');
  console.log('Super Admin   : admin@foundation.com / Admin@123');
  console.log('Approval tiers: 3 (Branch / Regional / Super Admin)');
  console.log('System accounts: ' + TXN_SYSTEM_ACCOUNTS.length + ' ensured');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
