import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      include: {
        journalLines: {
          select: {
            debit: true,
            credit: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });

    let grandTotalDebit = 0;
    let grandTotalCredit = 0;
    let grandDebitBalance = 0;
    let grandCreditBalance = 0;

    const rows = accounts.map((acc) => {
      const totalDebit = Math.round(acc.journalLines.reduce((sum, l) => sum + l.debit, 0) * 100) / 100;
      const totalCredit = Math.round(acc.journalLines.reduce((sum, l) => sum + l.credit, 0) * 100) / 100;

      grandTotalDebit += totalDebit;
      grandTotalCredit += totalCredit;

      // Net balance
      let debitBalance = 0;
      let creditBalance = 0;

      if (acc.type === "Asset" || acc.type === "Expense") {
        const net = totalDebit - totalCredit;
        if (net >= 0) {
          debitBalance = net;
        } else {
          creditBalance = Math.abs(net);
        }
      } else {
        const net = totalCredit - totalDebit;
        if (net >= 0) {
          creditBalance = net;
        } else {
          debitBalance = Math.abs(net);
        }
      }

      grandDebitBalance += debitBalance;
      grandCreditBalance += creditBalance;

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        totalDebit,
        totalCredit,
        debitBalance: Math.round(debitBalance * 100) / 100,
        creditBalance: Math.round(creditBalance * 100) / 100,
      };
    });

    return NextResponse.json({
      success: true,
      data: rows,
      summary: {
        totalDebits: Math.round(grandTotalDebit * 100) / 100,
        totalCredits: Math.round(grandTotalCredit * 100) / 100,
        totalDebitBalance: Math.round(grandDebitBalance * 100) / 100,
        totalCreditBalance: Math.round(grandCreditBalance * 100) / 100,
        isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/reports/trial-balance error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
