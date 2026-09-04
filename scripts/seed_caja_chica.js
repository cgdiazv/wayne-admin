const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Caja Chica Fund & initial transactions...");

  let fund = await prisma.pettyCashFund.findUnique({
    where: { code: "CC-001" },
  });

  if (!fund) {
    fund = await prisma.pettyCashFund.create({
      data: {
        code: "CC-001",
        name: "Caja Chica Principal - Planta Búfalo",
        custodianName: "Lic. Roberto Mondragón",
        custodianEmail: "R.mondragon@waynetrademarkhn.com",
        currency: "HNL",
        initialAmount: 10000.0,
        currentBalance: 7850.0,
        minThreshold: 3000.0,
        status: "ACTIVO",
        notes: "Fondo fijo para gastos operativos menores de manufactura, logística y administración.",
      },
    });
    console.log("Created Fund:", fund.name);

    const transactions = [
      {
        fundId: fund.id,
        date: "2026-09-01",
        type: "EGRESO",
        concept: "Envío urgente de muestras flexográficas a San Pedro Sula",
        category: "Transporte y Fletes",
        beneficiary: "Transportes Rápidos del Norte",
        voucherNumber: "FAC-001-002-8821",
        cai: "8E392B-4819A0-29184B-119283-A1",
        amount: 450.0,
        taxDeductible: true,
        status: "REGISTRADO",
      },
      {
        fundId: fund.id,
        date: "2026-09-02",
        type: "EGRESO",
        concept: "Suministro de agua purificada y café para personal de planta",
        category: "Cafetería y Alimentos",
        beneficiary: "Distribuidora La Fuente",
        voucherNumber: "REC-9941",
        amount: 620.0,
        taxDeductible: false,
        status: "REGISTRADO",
      },
      {
        fundId: fund.id,
        date: "2026-09-02",
        type: "EGRESO",
        concept: "Tornillos, cinta de empaque industrial y marcadores permanentes",
        category: "Suministros de Oficina",
        beneficiary: "Ferretería Búfalo",
        voucherNumber: "FAC-000-001-01-00817211",
        cai: "3C8291-AA8219-918201-992812-44",
        amount: 580.0,
        taxDeductible: true,
        status: "REGISTRADO",
      },
      {
        fundId: fund.id,
        date: "2026-09-03",
        type: "EGRESO",
        concept: "Combustible para generador de emergencia de prensa flexográfica",
        category: "Combustible",
        beneficiary: "Gasolinera Uno Villanueva",
        voucherNumber: "FAC-001-003-918230",
        amount: 500.0,
        taxDeductible: true,
        status: "REGISTRADO",
      },
    ];

    for (const t of transactions) {
      await prisma.pettyCashTransaction.create({ data: t });
    }
    console.log(`Created ${transactions.length} initial transactions.`);

    await prisma.pettyCashVoucher.create({
      data: {
        fundId: fund.id,
        voucherNumber: "VALE-2026-001",
        employeeName: "Carlos Gómez (Mantenimiento)",
        amount: 500.0,
        issueDate: "2026-09-03",
        dueDate: "2026-09-04",
        purpose: "Compra de repuesto urgente para rodillo anilox en San Pedro Sula",
        status: "PENDIENTE",
      },
    });
    console.log("Created 1 initial voucher.");
  } else {
    console.log("Fund already exists:", fund.code);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
