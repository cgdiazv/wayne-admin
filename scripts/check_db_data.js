const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany();
  console.log('ACCOUNTS COUNT:', accounts.length);
  console.log('ACCOUNTS:', accounts);

  const inventory = await prisma.inventoryItem.findMany();
  console.log('INVENTORY COUNT:', inventory.length);
  console.log('INVENTORY:', inventory);

  const customers = await prisma.customer.findMany();
  console.log('CUSTOMERS COUNT:', customers.length);

  const vendors = await prisma.vendor.findMany();
  console.log('VENDORS COUNT:', vendors.length);

  await prisma.$disconnect();
}

main().catch(console.error);
