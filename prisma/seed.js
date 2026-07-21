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

  // --- 5. Seed default Mail/SMS message templates ----------------------------
  // Mirrors SEED_TEMPLATES in lib/templates.ts (the runtime source of truth).
  // Only inserts missing rows; existing templates are never overwritten.
  const DEFAULT_TEMPLATES = [
    {
      channel: 'EMAIL', key: 'MEMBER_WELCOME', name: 'Member Welcome',
      subject: 'Membership Approved! Welcome to the Portal',
      variables: 'memberName, username, tempPassword, loginUrl',
      body: '<p>Dear {{memberName}},</p><p>Your membership has been approved. Member ID: <strong>{{username}}</strong></p><p>Username: {{username}}<br/>Temporary Password: {{tempPassword}}<br/>Login URL: {{loginUrl}}</p>',
    },
    {
      channel: 'EMAIL', key: 'PASSWORD_RESET', name: 'Password Reset',
      subject: 'Password Reset Request', variables: 'memberName, resetUrl',
      body: '<p>Dear {{memberName}},</p><p>Reset your password: <a href="{{resetUrl}}">{{resetUrl}}</a></p>',
    },
    {
      channel: 'EMAIL', key: 'DEPOSIT_RECEIVED', name: 'Deposit Received',
      subject: 'Deposit Received — ৳{{amount}}', variables: 'memberName, amount, balance, transactionId',
      body: '<p>Hello {{memberName}},</p><p>Your deposit of <strong>৳{{amount}}</strong> has been received. Transaction ID: {{transactionId}}. Balance: ৳{{balance}}</p>',
    },
    {
      channel: 'EMAIL', key: 'WITHDRAWAL_APPROVED', name: 'Withdrawal Approved',
      subject: 'Withdrawal Approved — ৳{{amount}}', variables: 'memberName, amount, balance, transactionId',
      body: '<p>Hello {{memberName}},</p><p>Your withdrawal of <strong>৳{{amount}}</strong> has been approved. Remaining Balance: ৳{{balance}}</p>',
    },
    {
      channel: 'EMAIL', key: 'LOAN_APPROVED', name: 'Loan Approved',
      subject: 'Loan Approved — ৳{{loanAmount}}', variables: 'memberName, loanAmount',
      body: '<p>Dear {{memberName}},</p><p>Your loan of <strong>৳{{loanAmount}}</strong> has been approved.</p>',
    },
    {
      channel: 'EMAIL', key: 'MEETING_NOTICE', name: 'Meeting Notice',
      subject: 'Meeting Notice — {{meetingTitle}}', variables: 'memberName, meetingTitle, meetingDate, meetingLink, agenda',
      body: '<p>Dear {{memberName}},</p><p>{{meetingTitle}} on {{meetingDate}}. Venue/Link: {{meetingLink}}</p><div>{{agenda}}</div>',
    },
    {
      channel: 'EMAIL', key: 'FINE_NOTICE', name: 'Fine Notice',
      subject: 'Fine Notice', variables: 'memberName, amount, reason',
      body: '<p>Dear {{memberName}},</p><p>A fine of <strong>৳{{amount}}</strong> has been recorded. Reason: {{reason}}</p>',
    },
    {
      channel: 'EMAIL', key: 'PROFIT_DISTRIBUTION', name: 'Profit Distribution',
      subject: 'Profit Distribution — ৳{{amount}}', variables: 'memberName, amount, balance',
      body: '<p>Dear {{memberName}},</p><p>Profit share of <strong>৳{{amount}}</strong> credited. New Balance: ৳{{balance}}</p>',
    },
    {
      channel: 'SMS', key: 'OTP_SMS', name: 'OTP', variables: 'otp',
      body: 'Your verification code is {{otp}}. Do not share it. — Future Savings Foundation',
    },
    {
      channel: 'SMS', key: 'MEMBER_WELCOME_SMS', name: 'Member Welcome', variables: 'memberName, username, tempPassword, loginUrl',
      body: 'Welcome {{memberName}}! Account approved. Member ID: {{username}}, Password: {{tempPassword}}. Login: {{loginUrl}}',
    },
    {
      channel: 'SMS', key: 'DEPOSIT_RECEIVED_SMS', name: 'Deposit Received', variables: 'memberName, amount, balance',
      body: 'Dear {{memberName}}, deposit of ৳{{amount}} received. Balance: ৳{{balance}}. — Future Savings Foundation',
    },
    {
      channel: 'SMS', key: 'WITHDRAWAL_APPROVED_SMS', name: 'Withdrawal Approved', variables: 'memberName, amount, balance',
      body: 'Dear {{memberName}}, withdrawal of ৳{{amount}} approved. Balance: ৳{{balance}}.',
    },
    {
      channel: 'SMS', key: 'LOAN_APPROVED_SMS', name: 'Loan Approved', variables: 'memberName, loanAmount',
      body: 'Dear {{memberName}}, your loan of ৳{{loanAmount}} is approved. — Future Savings Foundation',
    },
    {
      channel: 'SMS', key: 'LOAN_REMINDER_SMS', name: 'Loan Reminder', variables: 'memberName, amount, dueDate',
      body: 'Dear {{memberName}}, your loan installment of ৳{{amount}} is due on {{dueDate}}.',
    },
    {
      channel: 'SMS', key: 'MEETING_NOTICE_SMS', name: 'Meeting Notice', variables: 'meetingTitle, meetingDate, meetingLink',
      body: 'Meeting Notice: {{meetingTitle}} on {{meetingDate}}. Venue/Link: {{meetingLink}}. — Future Savings Foundation',
    },
    {
      channel: 'SMS', key: 'FINE_NOTICE_SMS', name: 'Fine Notice', variables: 'memberName, amount, reason',
      body: 'Dear {{memberName}}, a fine of ৳{{amount}} ({{reason}}) has been recorded.',
    },
    {
      channel: 'SMS', key: 'DUE_REMINDER_SMS', name: 'Due Reminder', variables: 'memberName, amount',
      body: 'Dear {{memberName}}, your due balance is ৳{{amount}}. Please clear it soon.',
    },
    {
      channel: 'SMS', key: 'PASSWORD_RESET_SMS', name: 'Password Reset OTP', variables: 'otp',
      body: 'Your password reset code is {{otp}}. — Future Savings Foundation',
    },
  ];
  for (const tpl of DEFAULT_TEMPLATES) {
    await prisma.messageTemplate.upsert({
      where: { key: tpl.key },
      update: {},
      create: {
        channel: tpl.channel,
        key: tpl.key,
        name: tpl.name,
        subject: tpl.subject || null,
        body: tpl.body,
        variables: tpl.variables,
      },
    });
  }

  console.log('--------------------------------------------------');
  console.log('Seed complete.');
  console.log('Super Admin   : admin@foundation.com / Admin@123');
  console.log('Approval tiers: 3 (Branch / Regional / Super Admin)');
  console.log('System accounts: ' + TXN_SYSTEM_ACCOUNTS.length + ' ensured');
  console.log('Message templates: ' + DEFAULT_TEMPLATES.length + ' ensured');
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
