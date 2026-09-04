import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJournalEntry } from "@/lib/accounting";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceType = searchParams.get("referenceType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const where: any = {};

    if (referenceType && referenceType !== "ALL") {
      where.referenceType = referenceType;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: "insensitive" } },
        { concept: { contains: search, mode: "insensitive" } },
        { referenceId: { contains: search, mode: "insensitive" } },
      ];
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: true,
          },
          orderBy: { debit: "desc" },
        },
      },
      orderBy: [{ date: "desc" }, { entryNumber: "desc" }],
    });

    // Compute totals
    let grandTotalDebit = 0;
    let grandTotalCredit = 0;
    entries.forEach((e) => {
      e.lines.forEach((l) => {
        grandTotalDebit += l.debit;
        grandTotalCredit += l.credit;
      });
    });

    return NextResponse.json({
      success: true,
      data: entries,
      summary: {
        count: entries.length,
        totalDebit: Math.round(grandTotalDebit * 100) / 100,
        totalCredit: Math.round(grandTotalCredit * 100) / 100,
        isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/journal-entries error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, concept, referenceType = "MANUAL", referenceId, currency = "USD", lines } = body;

    if (!concept || !lines || lines.length < 2) {
      return NextResponse.json(
        { success: false, error: "Concepto y al menos 2 líneas de partida son requeridos." },
        { status: 400 }
      );
    }

    const entry = await createJournalEntry({
      date,
      concept,
      referenceType,
      referenceId,
      currency,
      lines,
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/journal-entries error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
