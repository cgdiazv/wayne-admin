import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/bank-rules/[id] - Toggle active status or update rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { active, autoConfirm, name, condition, targetAccount } = body;

    const existing = await prisma.bankRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Rule not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.bankRule.update({
      where: { id },
      data: {
        ...(active !== undefined && { active: Boolean(active) }),
        ...(autoConfirm !== undefined && { autoConfirm: Boolean(autoConfirm) }),
        ...(name !== undefined && { name }),
        ...(condition !== undefined && { condition }),
        ...(targetAccount !== undefined && { targetAccount }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("PATCH /api/bank-rules/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/bank-rules/[id] - Delete an automation rule
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.bankRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Rule deleted" });
  } catch (error: unknown) {
    console.error("DELETE /api/bank-rules/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
