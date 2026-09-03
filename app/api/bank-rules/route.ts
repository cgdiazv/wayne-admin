import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bank-rules - List all automation rules
export async function GET() {
  try {
    const rules = await prisma.bankRule.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error: unknown) {
    console.error("GET /api/bank-rules error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/bank-rules - Create an automation rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, condition, targetAccount, autoConfirm, active } = body;

    if (!name || !condition || !targetAccount) {
      return NextResponse.json(
        { success: false, error: "name, condition, and targetAccount are required" },
        { status: 400 }
      );
    }

    const created = await prisma.bankRule.create({
      data: {
        name,
        condition,
        targetAccount,
        autoConfirm: Boolean(autoConfirm),
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/bank-rules error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
