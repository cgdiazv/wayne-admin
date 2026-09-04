import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const rawFunds = await prisma.pettyCashFund.findMany({
      include: {
        transactions: { orderBy: { createdAt: "desc" } },
        audits: { orderBy: { createdAt: "desc" } },
        vouchers: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    const mapped = rawFunds.map((f: any) => ({
      ...f,
      fixedAmount: f.initialAmount,
      transactions: f.transactions.map((t: any) => ({
        ...t,
        type: t.type === "EGRESO" ? "EXPENSE" : t.type === "INGRESO" || t.type === "REPOSICION" ? "REIMBURSEMENT" : t.type,
        isReimbursed: t.status === "REEMBOLSADO",
      })),
      vouchers: f.vouchers.map((v: any) => ({
        ...v,
        beneficiary: v.employeeName,
        concept: v.purpose,
        expectedLiquidationDate: v.dueDate,
        status: v.status === "PENDIENTE" ? "ACTIVE" : v.status,
      })),
      audits: f.audits.map((a: any) => ({
        ...a,
        physicalCashTotal: a.cashCounted,
        pendingReceiptsTotal: a.vouchersTotal,
        activeVouchersTotal: a.pendingLoansTotal,
        status: a.resultStatus,
      })),
    }));

    return NextResponse.json({ success: true, funds: mapped, data: mapped });
  } catch (error: any) {
    console.error("Error fetching petty cash funds:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      code,
      custodianName,
      custodianEmail,
      custodianTitle,
      currency,
      fixedAmount,
      initialAmount,
      minThreshold,
      location,
      notes,
    } = body;

    if (!name || !custodianName) {
      return NextResponse.json(
        { success: false, error: "Nombre y custodio son obligatorios." },
        { status: 400 }
      );
    }

    const assignedCode = code || `CC-${String((await prisma.pettyCashFund.count()) + 1).padStart(3, "0")}`;
    const amountVal = parseFloat(fixedAmount || initialAmount) || 10000;
    const thresholdVal = parseFloat(minThreshold) || amountVal * 0.25;

    const fund = await prisma.pettyCashFund.create({
      data: {
        name,
        code: assignedCode,
        custodianName,
        custodianEmail: custodianEmail || null,
        currency: currency || "HNL",
        initialAmount: amountVal,
        currentBalance: amountVal,
        minThreshold: thresholdVal,
        notes: notes || (location ? `Ubicación: ${location}` : null),
      },
    });

    const mapped = { ...fund, fixedAmount: fund.initialAmount, transactions: [], audits: [], vouchers: [] };
    return NextResponse.json({ success: true, fund: mapped, data: mapped });
  } catch (error: any) {
    console.error("Error creating petty cash fund:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
