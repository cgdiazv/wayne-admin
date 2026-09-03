import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/accounts - List all accounts with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ success: true, data: accounts });
  } catch (error: unknown) {
    console.error("GET /api/accounts error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, type, currency, balance, isActive } = body;

    if (!code || !name || !type) {
      return NextResponse.json(
        { success: false, error: "code, name, and type are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.account.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Account with code '${code}' already exists` },
        { status: 409 }
      );
    }

    const account = await prisma.account.create({
      data: {
        code,
        name,
        type,
        currency: currency || "USD",
        balance: balance !== undefined ? Number(balance) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/accounts error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
