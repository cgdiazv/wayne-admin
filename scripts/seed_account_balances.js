const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding / updating account balances in PostgreSQL...');

  const accountsToUpsert = [
    // Activos
    { code: '1000', name: 'Cash on Hand (Caja General)', type: 'Asset', currency: 'USD', balance: 2500.00 },
    { code: '1100', name: 'Operating Checking Account (Banco Ficohsa)', type: 'Asset', currency: 'USD', balance: 18450.00 },
    { code: '1200', name: 'Accounts Receivable (Cuentas por Cobrar)', type: 'Asset', currency: 'USD', balance: 6320.00 },
    { code: '1300', name: 'Inventory Asset (Inventario de Mercancías)', type: 'Asset', currency: 'USD', balance: 12970.00 },

    // Pasivos
    { code: '2000', name: 'Accounts Payable (Cuentas por Pagar)', type: 'Liability', currency: 'USD', balance: 4850.00 },

    // Capital
    { code: '3000', name: 'Owner Equity (Capital Social)', type: 'Equity', currency: 'USD', balance: 25000.00 },

    // Ingresos
    { code: '4000', name: 'Sales Revenue (Ventas de Mercancías)', type: 'Income', currency: 'USD', balance: 11450.00 },
    { code: '4100', name: 'Design & Custom Services (Servicios de Impresión y Empaque)', type: 'Income', currency: 'USD', balance: 3800.00 },

    // Gastos
    { code: '5000', name: 'Cost of Goods Sold (Costo de Ventas)', type: 'Expense', currency: 'USD', balance: 3450.00 },
    { code: '6000', name: 'General & Administrative (Gastos Administrativos)', type: 'Expense', currency: 'USD', balance: 1820.00 },
    { code: '6100', name: 'Equipment & Maintenance (Mantenimiento y Maquinaria)', type: 'Expense', currency: 'USD', balance: 1150.00 },
    { code: '6200', name: 'Automobile & Freight (Transporte y Envíos)', type: 'Expense', currency: 'USD', balance: 740.00 },
    { code: '6300', name: 'Advertising & Marketing (Publicidad y Mercadeo)', type: 'Expense', currency: 'USD', balance: 450.00 },
  ];

  for (const acc of accountsToUpsert) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        balance: acc.balance,
        isActive: true,
      },
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        balance: acc.balance,
        isActive: true,
      },
    });
    console.log(`✓ Account ${acc.code} - ${acc.name}: Balance $${acc.balance}`);
  }

  const allAccounts = await prisma.account.findMany();
  console.log(`\nTotal accounts in database: ${allAccounts.length}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
