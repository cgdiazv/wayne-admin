const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@waynetrademarkhn.com").toLowerCase().trim();
  const rawPassword = process.env.ADMIN_PASSWORD || "WayneAdmin2026!";
  const name = "Wayne Administrator";
  const role = "SUPER_ADMIN";

  console.log(`[Seed Admin] Processing initial administrator for: ${email}`);

  // Generate salt and hash with 10 rounds
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role,
      isActive: true,
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role,
      isActive: true,
    },
  });

  console.log(`[Seed Admin] User successfully seeded/updated in database!`);
  console.log(`[Seed Admin] User ID: ${user.id}`);
  console.log(`[Seed Admin] Email: ${user.email}`);
  console.log(`[Seed Admin] Role: ${user.role}`);
  console.log(`[Seed Admin] Password Hash: ${user.password.substring(0, 10)}...`);
}

main()
  .catch((e) => {
    console.error('[Seed Admin] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
