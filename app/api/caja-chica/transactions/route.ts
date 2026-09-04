import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fundId = searchParams.get("fundId");

    const where: any = {};
    if (fundId) where.fundId = fundId;

    const rawTransactions = await prisma.pettyCashTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const mapped = rawTransactions.map((t: any) => ({
      ...t,
      type: t.type === "EGRESO" ? "EXPENSE" : t.type === "INGRESO" || t.type === "REPOSICION" ? "REIMBURSEMENT" : t.type,
      isReimbursed: t.status === "REEMBOLSADO",
    }));

    return NextResponse.json({ success: true, transactions: mapped, data: mapped });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fundId,
      date,
      type,
      concept,
      category,
      beneficiary,
      voucherNumber,
      invoiceNumber,
      cai,
      amount,
      taxDeductible,
      notes,
    } = body;

    if (!fundId || !concept || !amount) {
      return NextResponse.json(
        { success: false, error: "Fondo, concepto y monto son obligatorios." },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    const isExpense = type === "EXPENSE" || type === "EGRESO";
    const dbType = isExpense ? "EGRESO" : type === "REPOSICION" ? "REPOSICION" : "INGRESO";

    if (dbType === "REPOSICION" || type === "REIMBURSEMENT") {
      // Mark unreimbursed expenses as REEMBOLSADO and restore fund cash
      const targetFund = await prisma.pettyCashFund.findUnique({ where: { id: fundId } });
      const targetBalance = targetFund ? targetFund.initialAmount : undefined;

      const [transaction] = await prisma.$transaction([
        prisma.pettyCashTransaction.create({
          data: {
            fundId,
            date: date || new Date().toISOString().split("T")[0],
            type: "REPOSICION",
            concept,
            category: category || "Reposición de Fondo Fijo",
            beneficiary: beneficiary || "Wayne Trademark de Honduras",
            voucherNumber: voucherNumber || invoiceNumber || null,
            cai: cai || null,
            amount: numAmount,
            taxDeductible: false,
            status: "REEMBOLSADO",
            notes: notes || null,
          },
        }),
        prisma.pettyCashTransaction.updateMany({
          where: { fundId, type: "EGRESO", status: "REGISTRADO" },
          data: { status: "REEMBOLSADO" },
        }),
        prisma.pettyCashFund.update({
          where: { id: fundId },
          data: targetBalance
            ? { currentBalance: targetBalance }
            : { currentBalance: { increment: numAmount } },
        }),
      ]);

      const mapped = {
        ...transaction,
        type: "REIMBURSEMENT",
        isReimbursed: true,
      };
      return NextResponse.json({ success: true, transaction: mapped, data: mapped });
    }

    // Normal expense or income
    const [transaction] = await prisma.$transaction([
      prisma.pettyCashTransaction.create({
        data: {
          fundId,
          date: date || new Date().toISOString().split("T")[0],
          type: dbType,
          concept,
          category: category || "Varios",
          beneficiary: beneficiary || "No especificado",
          voucherNumber: voucherNumber || invoiceNumber || null,
          cai: cai || null,
          amount: numAmount,
          taxDeductible: taxDeductible ?? true,
          status: "REGISTRADO",
          notes: notes || null,
        },
      }),
      prisma.pettyCashFund.update({
        where: { id: fundId },
        data: {
          currentBalance: isExpense ? { decrement: numAmount } : { increment: numAmount },
        },
      }),
    ]);

    const mapped = {
      ...transaction,
      type: isExpense ? "EXPENSE" : "REIMBURSEMENT",
      isReimbursed: false,
    };
    return NextResponse.json({ success: true, transaction: mapped, data: mapped });
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
