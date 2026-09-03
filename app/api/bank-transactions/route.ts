import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bank-transactions - List bank feed transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get("bankAccountId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (bankAccountId && bankAccountId !== "all") {
      where.bankAccountId = bankAccountId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { payee: { contains: search, mode: "insensitive" } },
      ];
    }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: {
        bankAccount: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: unknown) {
    console.error("GET /api/bank-transactions error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/bank-transactions - Create a bank transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankAccountId, date, description, payee, type, amount, suggestedAccount, ruleApplied, status } = body;

    if (!bankAccountId || !description || amount === undefined) {
      return NextResponse.json(
        { success: false, error: "bankAccountId, description, and amount are required" },
        { status: 400 }
      );
    }

    const created = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        date: date || new Date().toLocaleDateString("es-HN"),
        description,
        payee: payee || "Beneficiario No Indicado",
        type: type || "expense",
        amount: Number(amount),
        suggestedAccount: suggestedAccount || "5000 - Cost of Goods Sold",
        ruleApplied: ruleApplied || null,
        status: status || "porRevisar",
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/bank-transactions error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
