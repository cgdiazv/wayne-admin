import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ id: string }>;
};

// GET /api/accounts/[id] - Get account by ID or code
export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;

    const account = await prisma.account.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: account });
  } catch (error: unknown) {
    console.error("GET /api/accounts/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PATCH /api/accounts/[id] - Update account
export async function PATCH(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.account.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const { code, name, type, currency, isActive } = body;

    // Check if new code conflicts with another account
    if (code && code !== existing.code) {
      const codeConflict = await prisma.account.findUnique({
        where: { code },
      });
      if (codeConflict) {
        return NextResponse.json(
          { success: false, error: `Account with code '${code}' already exists` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(currency !== undefined && { currency }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("PATCH /api/accounts/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;

    const existing = await prisma.account.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    await prisma.account.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/accounts/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
