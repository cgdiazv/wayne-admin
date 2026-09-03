import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bank-accounts - List all connected bank accounts
export async function GET() {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      include: {
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

// POST /api/bank-accounts - Connect a new bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, accountNumber, type, currency, bankBalance, bookBalance, color } = body;

    if (!name || !accountNumber) {
      return NextResponse.json(
        { success: false, error: "name and accountNumber are required" },
        { status: 400 }
      );
    }

    const created = await prisma.bankAccount.create({
      data: {
        name,
        accountNumber: accountNumber.startsWith("••••") ? accountNumber : `•••• ${accountNumber.slice(-4)}`,
        type: type || "Cuenta de cheques empresarial USD",
        currency: currency || "USD",
        bankBalance: Number(bankBalance) || 0,
        bookBalance: Number(bookBalance) || 0,
        color: color || (name.includes("BAC") ? "#dc2626" : name.includes("Atlántida") ? "#f59e0b" : "#0284c7"),
        status: "Conectado",
        lastUpdated: "Justo ahora",
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/bank-accounts error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
