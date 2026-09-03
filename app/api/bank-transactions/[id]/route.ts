import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/bank-transactions/[id] - Update transaction status (categorize, exclude, restore)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, suggestedAccount, ruleApplied } = body;

    const existing = await prisma.bankTransaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.bankTransaction.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(suggestedAccount !== undefined && { suggestedAccount }),
        ...(ruleApplied !== undefined && { ruleApplied }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("PATCH /api/bank-transactions/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/bank-transactions/[id] - Delete a transaction
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.bankTransaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Transaction deleted" });
  } catch (error: unknown) {
    console.error("DELETE /api/bank-transactions/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
