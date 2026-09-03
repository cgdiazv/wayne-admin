import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/vendors - List vendors with search & pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const currency = searchParams.get("currency");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (currency) {
      where.currency = currency;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { macolaCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, vendors] = await Promise.all([
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/vendors error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/vendors - Create a new vendor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { macolaCode, name, email, phone, address, currency } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    if (macolaCode) {
      const existing = await prisma.vendor.findUnique({
        where: { macolaCode },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Vendor with Macola code '${macolaCode}' already exists` },
          { status: 409 }
        );
      }
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        macolaCode: macolaCode || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        currency: currency || "USD",
      },
    });

    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/vendors error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
