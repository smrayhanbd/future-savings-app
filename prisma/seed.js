const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@foundation.com' },
    update: {},
    create: {
      email: 'admin@foundation.com',
      password: hashedPassword,
      role: 'ADMIN'
    },
  });
  
  console.log('--------------------------------------------------');
  console.log('Admin user created successfully!');
  console.log('Email: admin@foundation.com');
  console.log('Password: Admin@123');
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