// API Route: Bank Statement Reconciliations (NIIF / US GAAP compliant)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const db = prisma as any;
    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get("bankAccountId");
    const period = searchParams.get("period");
    const status = searchParams.get("status");

    // Check count and seed initial sample reconciliations if none exist
    const count = await db.bankReconciliation.count();
    if (count === 0) {
      const primaryBank = await db.bankAccount.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (primaryBank) {
        // 1. Seed closed reconciliation for Agosto 2026
        const augustRec = await db.bankReconciliation.create({
          data: {
            reconciliationNumber: `REC-${primaryBank.name.slice(0, 3).toUpperCase()}-2026-08`,
            bankAccountId: primaryBank.id,
            period: "2026-08",
            statementDate: "2026-08-31",
            startDate: "2026-08-01",
            endDate: "2026-08-31",
            statementBeginningBalance: 32450.00,
            statementEndingBalance: 41820.50,
            clearedDepositsCount: 4,
            clearedDepositsAmount: 21500.00,
            clearedChecksCount: 5,
            clearedChecksAmount: 12129.50,
            clearedBalance: 41820.50,
            difference: 0.00,
            status: "CERRADA",
            closedAt: new Date("2026-09-02T16:30:00Z"),
            closedBy: "Contador General / Auditoría",
            notes: "Cierre mensual de agosto 2026 conforme sin discrepancias con extracto N.° EST-FIC-08-2026.",
            items: {
              create: [
                {
                  date: "2026-08-04",
                  reference: "DEP-8491",
                  description: "Cobro Factura FAC-0988 - Confecciones Gildan",
                  payee: "Confecciones Gildan Búfalo",
                  type: "DEPOSIT",
                  amount: 7500.00,
                  isCleared: true,
                  clearedAt: new Date("2026-08-05"),
                },
                {
                  date: "2026-08-11",
                  reference: "CHQ-1044",
                  description: "Pago Químicos Industriales S.A. - Factura FPROV-741",
                  payee: "Químicos Industriales S.A.",
                  type: "CHECK",
                  amount: 3200.00,
                  isCleared: true,
                  clearedAt: new Date("2026-08-12"),
                },
                {
                  date: "2026-08-16",
                  reference: "TRF-9921",
                  description: "Abono Textiles Búfalo S.A. - Factura FAC-0992",
                  payee: "Textiles Búfalo S.A.",
                  type: "DEPOSIT",
                  amount: 8200.00,
                  isCleared: true,
                  clearedAt: new Date("2026-08-17"),
                },
                {
                  date: "2026-08-20",
                  reference: "TRF-3382",
                  description: "Pago Proveedor Papelera Hondureña - Bobinas Kraft",
                  payee: "Papelera Hondureña",
                  type: "CHECK",
                  amount: 5400.00,
                  isCleared: true,
                  clearedAt: new Date("2026-08-21"),
                },
                {
                  date: "2026-08-25",
                  reference: "DEP-9102",
                  description: "Cobro Factura FAC-0995 - Embotelladora de Sula",
                  payee: "Embotelladora de Sula S.A.",
                  type: "DEPOSIT",
                  amount: 5800.00,
                  isCleared: true,
                  clearedAt: new Date("2026-08-26"),
                },
                {
                  date: "2026-08-28",
                  reference: "CHQ-1045",
                  description: "Nómina Operativa Quincena 2 Agosto",
                  payee: "Planilla Empleados Producción",
                  type: "CHECK",
                  amount: 3500.00,
                  isCleared: true,
                  clearedAt: new Date("2026-08-29"),
                },
                {
                  date: "2026-08-31",
                  reference: "ND-BNK-88",
                  description: "Comisión mensual mantenimiento de cuenta y banca en línea",
                  payee: "Banco Ficohsa",
                  type: "FEE",
                  amount: 29.50,
                  isCleared: true,
                  clearedAt: new Date("2026-08-31"),
                },
              ],
            },
          },
        });

        // 2. Seed in-process reconciliation for Septiembre 2026
        await db.bankReconciliation.create({
          data: {
            reconciliationNumber: `REC-${primaryBank.name.slice(0, 3).toUpperCase()}-2026-09`,
            bankAccountId: primaryBank.id,
            period: "2026-09",
            statementDate: "2026-09-30",
            startDate: "2026-09-01",
            endDate: "2026-09-30",
            statementBeginningBalance: 41820.50,
            statementEndingBalance: 45200.00,
            clearedDepositsCount: 1,
            clearedDepositsAmount: 8500.00,
            clearedChecksCount: 1,
            clearedChecksAmount: 5120.50,
            clearedBalance: 45200.00,
            difference: 0.00,
            status: "EN_PROCESO",
            notes: "Período actual en proceso de cotejo de transacciones de septiembre 2026.",
            items: {
              create: [
                {
                  date: "2026-09-02",
                  reference: "DEP-9301",
                  description: "Depósito Pago Factura FAC-1001 - Textiles Búfalo",
                  payee: "Textiles Búfalo S.A.",
                  type: "DEPOSIT",
                  amount: 8500.00,
                  isCleared: true,
                  clearedAt: new Date("2026-09-03"),
                },
                {
                  date: "2026-09-03",
                  reference: "CHQ-1048",
                  description: "Pago Insumos Flexográficos S.A. - Orden OC-2026-084",
                  payee: "Insumos Flexográficos S.A.",
                  type: "CHECK",
                  amount: 5120.50,
                  isCleared: true,
                  clearedAt: new Date("2026-09-04"),
                },
                {
                  date: "2026-09-04",
                  reference: "DEP-9344",
                  description: "Depósito Transferencia Confecciones Gildan",
                  payee: "Confecciones Gildan Búfalo",
                  type: "DEPOSIT",
                  amount: 3200.00,
                  isCleared: false,
                  notes: "En tránsito - no reflejado en extracto bancario de corte",
                },
                {
                  date: "2026-09-04",
                  reference: "CHQ-1049",
                  description: "Cheque 1049 emitido a Repuestos y Mantenimiento",
                  payee: "Taller Industrial Búfalo",
                  type: "CHECK",
                  amount: 1450.00,
                  isCleared: false,
                  notes: "Cheque en circulación aún no cobrado en ventanilla",
                },
              ],
            },
          },
        });
      }
    }

    const whereClause: Record<string, unknown> = {};
    if (bankAccountId && bankAccountId !== "ALL") {
      whereClause.bankAccountId = bankAccountId;
    }
    if (period && period !== "ALL") {
      whereClause.period = period;
    }
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const reconciliations = await db.bankReconciliation.findMany({
      where: whereClause,
      include: {
        bankAccount: true,
        items: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { statementDate: "desc" },
    });

    const company = await db.companySettings.findFirst().catch(() => null);
    const activeContador = company?.contadorNombre?.trim()
      ? `${company.contadorNombre.trim()} (${company.contadorTitulo?.trim() || "Contador General"})`
      : null;

    const formattedRecs = reconciliations.map((rec: any) => {
      if (rec.status === "CERRADA" && activeContador && (!rec.closedBy || rec.closedBy.includes("Mondrag") || rec.closedBy.includes("Auditoría") || rec.closedBy.includes("Contador General"))) {
        return {
          ...rec,
          closedBy: activeContador,
        };
      }
      return rec;
    });

    return NextResponse.json({ success: true, data: formattedRecs });
  } catch (error: any) {
    console.error("GET /api/bank-reconciliations error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener conciliaciones bancarias" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = prisma as any;
    const body = await request.json();

    const {
      bankAccountId,
      period,
      statementDate,
      startDate,
      endDate,
      statementBeginningBalance = 0,
      statementEndingBalance = 0,
      notes,
    } = body;

    if (!bankAccountId) {
      return NextResponse.json(
        { success: false, error: "Debe seleccionar una cuenta bancaria." },
        { status: 400 }
      );
    }

    if (!period || !statementDate) {
      return NextResponse.json(
        { success: false, error: "El período (ej. 2026-09) y la fecha de corte son obligatorios." },
        { status: 400 }
      );
    }

    const bank = await db.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bank) {
      return NextResponse.json(
        { success: false, error: "Cuenta bancaria no encontrada." },
        { status: 404 }
      );
    }

    // Check if an existing open reconciliation exists for this bank and period
    const existing = await db.bankReconciliation.findFirst({
      where: {
        bankAccountId,
        period,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya existe una conciliación registrada para ${bank.name} en el período ${period} (Estado: ${existing.status}).`,
        },
        { status: 400 }
      );
    }

    // Generate unique reconciliation number
    const prefix = bank.name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "BNK";
    const cleanPeriod = period.replace(/[^a-zA-Z0-9]/g, "-");
    const recNumber = `REC-${prefix}-${cleanPeriod}`;

    const begBal = Number(statementBeginningBalance) || 0;
    const endBal = Number(statementEndingBalance) || 0;

    // Fetch existing bank transactions for this account to populate items
    const sDate = startDate || `${period}-01`;
    const eDate = endDate || statementDate;

    const existingTx = await db.bankTransaction.findMany({
      where: {
        bankAccountId,
      },
      orderBy: { createdAt: "desc" },
    });

    const initialItems = existingTx.map((tx: any) => ({
      transactionId: tx.id,
      sourceType: "BANK_TRANSACTION",
      date: tx.date || statementDate,
      reference: tx.ruleApplied ? `REGLA-${tx.id.slice(-4)}` : `TX-${tx.id.slice(-4)}`,
      description: tx.description,
      payee: tx.payee || "N/A",
      type: tx.type === "deposit" ? "DEPOSIT" : "CHECK",
      amount: Number(tx.amount) || 0,
      isCleared: tx.status === "categorizadas",
      clearedAt: tx.status === "categorizadas" ? new Date() : null,
      notes: tx.suggestedAccount || null,
    }));

    // Calculate initial cleared amounts
    let clearedDepAmt = 0;
    let clearedDepCnt = 0;
    let clearedChkAmt = 0;
    let clearedChkCnt = 0;

    initialItems.forEach((it: any) => {
      if (it.isCleared) {
        if (it.type === "DEPOSIT") {
          clearedDepAmt += it.amount;
          clearedDepCnt += 1;
        } else {
          clearedChkAmt += it.amount;
          clearedChkCnt += 1;
        }
      }
    });

    const clearedBalance = Math.round((begBal + clearedDepAmt - clearedChkAmt) * 100) / 100;
    const difference = Math.round((endBal - clearedBalance) * 100) / 100;

    const newRec = await db.bankReconciliation.create({
      data: {
        reconciliationNumber: recNumber,
        bankAccountId,
        period,
        statementDate,
        startDate: sDate,
        endDate: eDate,
        statementBeginningBalance: begBal,
        statementEndingBalance: endBal,
        clearedDepositsCount: clearedDepCnt,
        clearedDepositsAmount: clearedDepAmt,
        clearedChecksCount: clearedChkCnt,
        clearedChecksAmount: clearedChkAmt,
        clearedBalance,
        difference,
        status: difference === 0 ? "CONCILIADA_CUADRADA" : "EN_PROCESO",
        notes: notes || `Apertura de conciliación para el período ${period}.`,
        items: {
          create: initialItems,
        },
      },
      include: {
        bankAccount: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: newRec,
      message: `Conciliación ${recNumber} aperturada exitosamente con ${initialItems.length} movimientos preliminares.`,
    });
  } catch (error: any) {
    console.error("POST /api/bank-reconciliations error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la conciliación bancaria" },
      { status: 500 }
    );
  }
}
