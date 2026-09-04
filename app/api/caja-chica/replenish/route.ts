import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { numberToSpanishWords } from "@/lib/numberToWords";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fundId,
      bankAccountId,
      paymentMethod = "CHEQUE",
      referenceNumber,
      checkPayee,
      notes,
      transactionIds,
    } = body;

    if (!fundId || !bankAccountId) {
      return NextResponse.json(
        { success: false, error: "Fondo de caja chica y cuenta bancaria son requeridos." },
        { status: 400 }
      );
    }

    // 1. Fetch Fund
    const fund = await prisma.pettyCashFund.findUnique({
      where: { id: fundId },
      include: {
        transactions: {
          where: {
            type: "EGRESO",
            status: "REGISTRADO",
            ...(Array.isArray(transactionIds) && transactionIds.length > 0
              ? { id: { in: transactionIds } }
              : {}),
          },
        },
      },
    });

    if (!fund) {
      return NextResponse.json({ success: false, error: "Fondo de caja chica no encontrado." }, { status: 404 });
    }

    if (fund.transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay comprobantes pendientes de reembolso en este fondo." },
        { status: 400 }
      );
    }

    // 2. Fetch Bank Account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      return NextResponse.json({ success: false, error: "Cuenta bancaria no encontrada." }, { status: 404 });
    }

    const totalReimbursement = fund.transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

    if (bankAccount.bankBalance < totalReimbursement) {
      return NextResponse.json(
        {
          success: false,
          error: `Saldo insuficiente en ${bankAccount.name}. Saldo disponible: ${bankAccount.currency} ${bankAccount.bankBalance.toFixed(
            2
          )}, requerido: ${bankAccount.currency} ${totalReimbursement.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Generate Policy and Reference numbers
    const totalAuditsAndPolicies = await prisma.pettyCashAudit.count();
    const policyNumber = `POL-${new Date().getFullYear()}-${String(totalAuditsAndPolicies + 101).padStart(4, "0")}`;
    const assignedReference =
      referenceNumber ||
      (paymentMethod === "CHEQUE"
        ? `CHQ-${String(Math.floor(1000 + Math.random() * 9000))}`
        : `ACH-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`);

    const payeeName = checkPayee || fund.custodianName;

    // 3. Group expenses by Category for Journal Entry Debits
    const categoryTotals: Record<string, number> = {};
    let totalTaxDeductible = 0;

    for (const tx of fund.transactions) {
      const cat = tx.category || "Gastos Varios";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
      if (tx.taxDeductible) {
        totalTaxDeductible += tx.amount;
      }
    }

    // Calculate approximate ISV 15% credit from tax deductible receipts
    // Base = Total / 1.15; ISV = Total - Base
    const isvCredit = Math.round((totalTaxDeductible - totalTaxDeductible / 1.15) * 100) / 100;
    const netExpenses = Math.round((totalReimbursement - isvCredit) * 100) / 100;

    // Build Accounting Journal Entry (Partida de Diario)
    const journalEntry: Array<{
      accountCode: string;
      accountName: string;
      type: "DEBIT" | "CREDIT";
      debit: number;
      credit: number;
    }> = [];

    // Debit lines (Cargos)
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
      // Map category to standard Wayne COA accounts
      let code = "6000";
      let name = `Gastos de Operación (${cat})`;

      if (cat.includes("Transporte") || cat.includes("Combustible") || cat.includes("Envíos")) {
        code = "6100";
        name = "Gastos de Transporte, Fletes y Combustibles";
      } else if (cat.includes("Papelería") || cat.includes("Oficina")) {
        code = "6200";
        name = "Gastos de Papelería, Útiles y Suministros";
      } else if (cat.includes("Mantenimiento") || cat.includes("Reparación")) {
        code = "5000";
        name = "Costo de Mantenimiento y Operaciones Planta";
      } else if (cat.includes("Alimentación") || cat.includes("Cafetería")) {
        code = "6400";
        name = "Gastos de Personal, Cafetería y Alimentación";
      }

      const netCatAmount = isvCredit > 0 && totalTaxDeductible > 0 ? (amount / totalReimbursement) * netExpenses : amount;

      journalEntry.push({
        accountCode: code,
        accountName: name,
        type: "DEBIT",
        debit: Math.round(netCatAmount * 100) / 100,
        credit: 0,
      });
    });

    if (isvCredit > 0) {
      journalEntry.push({
        accountCode: "1150",
        accountName: "Crédito Fiscal — Impuesto Sobre Ventas (ISV 15%)",
        type: "DEBIT",
        debit: isvCredit,
        credit: 0,
      });
    }

    // Credit line (Abono al Banco)
    journalEntry.push({
      accountCode: "1100",
      accountName: `${bankAccount.name} (${bankAccount.accountNumber})`,
      type: "CREDIT",
      debit: 0,
      credit: totalReimbursement,
    });

    // 4. Atomic Execution
    const targetTxIds = fund.transactions.map((t) => t.id);

    const [bankTx, updatedBank, updatedFund] = await prisma.$transaction([
      // A. Create BankTransaction
      prisma.bankTransaction.create({
        data: {
          bankAccountId: bankAccount.id,
          date: new Date().toLocaleDateString("es-HN"),
          description: `Póliza ${policyNumber} - Reposición Caja Chica ${fund.code} (${paymentMethod} ${assignedReference})`,
          payee: payeeName,
          type: "expense",
          amount: totalReimbursement,
          suggestedAccount: "Caja Chica y Gastos Operativos",
          ruleApplied: "Reposición de Fondo Fijo",
          status: "categorizadas",
        },
      }),

      // B. Decrement Bank Balance
      prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          bankBalance: { decrement: totalReimbursement },
          bookBalance: { decrement: totalReimbursement },
          lastUpdated: `Hoy, ${new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" })}`,
        },
      }),

      // C. Update Petty Cash Transactions to REEMBOLSADO
      prisma.pettyCashTransaction.updateMany({
        where: { id: { in: targetTxIds } },
        data: {
          status: "REEMBOLSADO",
          notes: `Liquidado en ${policyNumber} con ${paymentMethod} #${assignedReference}`,
        },
      }),

      // D. Insert Petty Cash Reimbursement Record
      prisma.pettyCashTransaction.create({
        data: {
          fundId: fund.id,
          date: new Date().toISOString().split("T")[0],
          type: "REPOSICION",
          concept: `Reembolso de Fondo Fijo — ${bankAccount.name} (${paymentMethod} #${assignedReference})`,
          category: "Reposición de Fondo Fijo",
          beneficiary: payeeName,
          voucherNumber: assignedReference,
          amount: totalReimbursement,
          taxDeductible: false,
          status: "REEMBOLSADO",
          notes: notes || `Póliza Contable ${policyNumber}`,
        },
      }),

      // E. Restore Fund Balance to Fixed Amount
      prisma.pettyCashFund.update({
        where: { id: fund.id },
        data: {
          currentBalance: fund.initialAmount,
          status: "ACTIVO",
        },
      }),
    ]);

    // Amount in Spanish words
    const amountInWords = numberToSpanishWords(totalReimbursement, fund.currency);

    const policyPayload = {
      policyNumber,
      date: new Date().toISOString(),
      formattedDate: new Date().toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      fund: {
        id: fund.id,
        code: fund.code,
        name: fund.name,
        custodianName: fund.custodianName,
        currency: fund.currency,
        fixedAmount: fund.initialAmount,
      },
      bankAccount: {
        id: bankAccount.id,
        name: bankAccount.name,
        accountNumber: bankAccount.accountNumber,
        currency: bankAccount.currency,
        previousBalance: bankAccount.bankBalance,
        newBalance: bankAccount.bankBalance - totalReimbursement,
      },
      paymentMethod,
      referenceNumber: assignedReference,
      checkPayee: payeeName,
      totalAmount: totalReimbursement,
      amountInWords,
      reimbursedTransactions: fund.transactions,
      journalEntry,
      notes: notes || `Reposición de ${fund.transactions.length} comprobantes de gasto menor.`,
    };

    return NextResponse.json({
      success: true,
      policy: policyPayload,
      bankTransaction: bankTx,
      fund: updatedFund,
    });
  } catch (error: any) {
    console.error("Error processing petty cash replenishment:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
