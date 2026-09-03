import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bank-accounts - List all connected bank accounts with linked GL account
export async function GET() {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      include: {
        account: true,
        _count: {
          select: {
            transactions: {
              where: { status: "porRevisar" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = bankAccounts.map((b) => ({
      ...b,
      pendingCount: b._count.transactions,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    console.error("GET /api/bank-accounts error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/bank-accounts - Connect a new bank account & automatically create GL Account in Chart of Accounts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, accountNumber, type, currency, bankBalance, bookBalance, color, tenantId } = body;

    if (!name || !accountNumber) {
      return NextResponse.json(
        { success: false, error: "name and accountNumber are required" },
        { status: 400 }
      );
    }

    const maskedNumber = accountNumber.startsWith("••••") ? accountNumber : `•••• ${accountNumber.slice(-4)}`;
    const curr = currency || "USD";
    const balanceVal = Number(bankBalance) || 0;

    // 1. Generate unique GL Account code for Chart of Accounts (e.g., 1101, 1102, etc.)
    const existingBankAccountsCount = await prisma.bankAccount.count();
    const glCode = `11${(0 + existingBankAccountsCount + 1).toString().padStart(2, "0")}`;
    const glName = `${name} (${maskedNumber}) ${curr}`;

    // 2. Create GL Account in Chart of Accounts automatically
    const createdGlAccount = await prisma.account.create({
      data: {
        code: glCode,
        name: glName,
        type: "Efectivo y equivalentes de efectivo",
        currency: curr,
        balance: balanceVal,
        isActive: true,
      },
    });

    // 3. Create BankAccount linked to GL Account
    const createdBank = await prisma.bankAccount.create({
      data: {
        tenantId: tenantId || null,
        name,
        accountNumber: maskedNumber,
        type: type || "Cuenta de cheques empresarial",
        currency: curr,
        bankBalance: balanceVal,
        bookBalance: Number(bookBalance) || balanceVal,
        color: color || (name.includes("BAC") ? "#dc2626" : name.includes("Atlántida") ? "#f59e0b" : "#0284c7"),
        status: "Conectado",
        lastUpdated: "Justo ahora",
        accountId: createdGlAccount.id,
      },
      include: {
        account: true,
      },
    });

    return NextResponse.json({ success: true, data: createdBank }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/bank-accounts error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
