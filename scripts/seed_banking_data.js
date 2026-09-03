const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Banking & Automation Data in PostgreSQL (Supabase) ---');

  // 1. Seed Bank Accounts
  const banks = [
    {
      name: 'Banco Ficohsa',
      accountNumber: '•••• 2266',
      type: 'Cuenta de cheques empresarial USD',
      currency: 'USD',
      bankBalance: 18450.00,
      bookBalance: 18450.00,
      lastUpdated: 'Hoy, 10:15 PM',
      status: 'Conectado',
      color: '#0284c7',
    },
    {
      name: 'BAC Credomatic',
      accountNumber: '•••• 8410',
      type: 'Cuenta de operaciones comerciales USD',
      currency: 'USD',
      bankBalance: 6200.00,
      bookBalance: 6200.00,
      lastUpdated: 'Ayer, 06:30 PM',
      status: 'Conectado',
      color: '#dc2626',
    },
    {
      name: 'Banco Atlántida',
      accountNumber: '•••• 5590',
      type: 'Cuenta recaudadora HNL',
      currency: 'HNL',
      bankBalance: 3800.00,
      bookBalance: 3800.00,
      lastUpdated: 'Hace 2 días',
      status: 'Conectado',
      color: '#f59e0b',
    },
  ];

  const createdBanks = [];
  for (const b of banks) {
    let existing = await prisma.bankAccount.findFirst({
      where: { name: b.name, accountNumber: b.accountNumber },
    });
    if (!existing) {
      existing = await prisma.bankAccount.create({ data: b });
      console.log(`Created Bank: ${existing.name} (${existing.accountNumber})`);
    } else {
      existing = await prisma.bankAccount.update({
        where: { id: existing.id },
        data: b,
      });
      console.log(`Updated Bank: ${existing.name} (${existing.accountNumber})`);
    }
    createdBanks.push(existing);
  }

  const ficohsa = createdBanks.find(b => b.name === 'Banco Ficohsa');
  const bac = createdBanks.find(b => b.name === 'BAC Credomatic');

  // 2. Seed Transactions
  if (ficohsa && bac) {
    const txs = [
      {
        bankAccountId: ficohsa.id,
        date: '02/09/2026',
        description: 'DEPÓSITO ACH - MANUFACTURAS BÚFALO S.A.',
        payee: 'Manufacturas Búfalo S.A.',
        type: 'deposit',
        amount: 4850.00,
        suggestedAccount: '4000 - Sales Revenue (Ventas de Mercancías)',
        ruleApplied: 'Regla auto: Depósitos Clientes Búfalo',
        status: 'porRevisar',
      },
      {
        bankAccountId: ficohsa.id,
        date: '01/09/2026',
        description: 'TRANSFERENCIA SALIENTE - SUMINISTROS GRAFICOS INDUSTRIALES',
        payee: 'Suministros Gráficos Industriales',
        type: 'expense',
        amount: 1420.00,
        suggestedAccount: '5000 - Cost of Goods Sold (Costo de Ventas)',
        ruleApplied: 'Regla auto: Proveedores Materia Prima',
        status: 'porRevisar',
      },
      {
        bankAccountId: ficohsa.id,
        date: '30/08/2026',
        description: 'PAGO SERVICIO ENERGIA ELECTRICA EEH - PLANTA VILLANUEVA',
        payee: 'Empresa Energía Honduras (EEH)',
        type: 'expense',
        amount: 680.00,
        suggestedAccount: '6100 - Equipment & Maintenance (Mantenimiento y Maquinaria)',
        ruleApplied: null,
        status: 'porRevisar',
      },
      {
        bankAccountId: bac.id,
        date: '28/08/2026',
        description: 'COBRO POS VISA - PACKAGING CLIENTE LOCAL',
        payee: 'Cliente Local',
        type: 'deposit',
        amount: 890.00,
        suggestedAccount: '4100 - Design & Custom Services (Servicios de Impresión y Empaque)',
        ruleApplied: 'Regla auto: POS Local',
        status: 'porRevisar',
      },
      {
        bankAccountId: ficohsa.id,
        date: '25/08/2026',
        description: 'TRANSFERENCIA ACH - NOMINA TECNICA DE CORTE',
        payee: 'Planilla Operativa Planta',
        type: 'expense',
        amount: 2150.00,
        suggestedAccount: '6000 - General & Administrative (Gastos Administrativos)',
        ruleApplied: 'Regla auto: Nómina',
        status: 'categorizadas',
      },
    ];

    for (const tx of txs) {
      const existingTx = await prisma.bankTransaction.findFirst({
        where: {
          bankAccountId: tx.bankAccountId,
          description: tx.description,
          date: tx.date,
        },
      });

      if (!existingTx) {
        await prisma.bankTransaction.create({ data: tx });
        console.log(`Created Transaction: ${tx.description}`);
      }
    }
  }

  // 3. Seed Automation Rules
  const rules = [
    {
      name: 'Depósitos Clientes Búfalo',
      condition: "Descripción contiene 'MANUFACTURAS BÚFALO'",
      targetAccount: '4000 - Sales Revenue (Ventas de Mercancías)',
      autoConfirm: true,
      active: true,
    },
    {
      name: 'Proveedores Materia Prima e Insumos',
      condition: "Descripción contiene 'SUMINISTROS GRAFICOS'",
      targetAccount: '5000 - Cost of Goods Sold (Costo de Ventas)',
      autoConfirm: false,
      active: true,
    },
    {
      name: 'Combustible y Flota de Reparto',
      condition: "Descripción contiene 'TEXACO' o 'PUMA'",
      targetAccount: '6200 - Automobile & Freight (Transporte y Envíos)',
      autoConfirm: true,
      active: true,
    },
  ];

  for (const r of rules) {
    const existingRule = await prisma.bankRule.findFirst({
      where: { name: r.name },
    });
    if (!existingRule) {
      await prisma.bankRule.create({ data: r });
      console.log(`Created Rule: ${r.name}`);
    } else {
      await prisma.bankRule.update({
        where: { id: existingRule.id },
        data: r,
      });
      console.log(`Updated Rule: ${r.name}`);
    }
  }

  console.log('--- Banking & Automation Data Seeded Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error seeding banking data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
