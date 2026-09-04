import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountCode = searchParams.get("accountCode");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const accountsWhere: any = { isActive: true };
    if (accountCode) {
      accountsWhere.code = accountCode;
    }

    const accounts = await prisma.account.findMany({
      where: accountsWhere,
      orderBy: { code: "asc" },
    });

    const linesWhere: any = {};
    if (startDate || endDate) {
      linesWhere.journalEntry = { date: {} };
      if (startDate) linesWhere.journalEntry.date.gte = startDate;
      if (endDate) linesWhere.journalEntry.date.lte = endDate;
    }

    // Fetch ledger details for each account
    const ledger = await Promise.all(
      accounts.map(async (acc) => {
        const lines = await prisma.journalEntryLine.findMany({
          where: {
            accountId: acc.id,
            ...linesWhere,
          },
          include: {
            journalEntry: {
              select: {
                id: true,
                entryNumber: true,
                date: true,
                concept: true,
                referenceType: true,
                referenceId: true,
                status: true,
              },
            },
          },
          orderBy: [
            { journalEntry: { date: "asc" } },
            { journalEntry: { entryNumber: "asc" } },
            { createdAt: "asc" },
          ],
        });

        let runningBalance = 0;
        let totalDebit = 0;
        let totalCredit = 0;

        const movements = lines.map((l) => {
          totalDebit += l.debit;
          totalCredit += l.credit;

          // Asset & Expense increase with Debit
          // Liabilities, Equity & Income increase with Credit
          if (acc.type === "Asset" || acc.type === "Expense") {
            runningBalance += l.debit - l.credit;
          } else {
            runningBalance += l.credit - l.debit;
          }

          return {
            id: l.id,
            date: l.journalEntry.date,
            entryNumber: l.journalEntry.entryNumber,
            concept: l.description || l.journalEntry.concept,
            referenceType: l.journalEntry.referenceType,
            referenceId: l.journalEntry.referenceId,
            debit: l.debit,
            credit: l.credit,
            balanceAfter: Math.round(runningBalance * 100) / 100,
          };
        });

        return {
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          currency: acc.currency,
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          finalBalance: Math.round(runningBalance * 100) / 100,
          movementsCount: movements.length,
          movements,
        };
      })
    );

    // Only return accounts that have movements or a non-zero balance if no specific account was requested
    const filteredLedger = accountCode ? ledger : ledger.filter((l) => l.movementsCount > 0 || l.finalBalance !== 0);

    return NextResponse.json({
      success: true,
      data: filteredLedger,
      totalAccounts: accounts.length,
      activeWithMovements: filteredLedger.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/reports/general-ledger error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
