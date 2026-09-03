import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ id: string }>;
};

// GET /api/customers/[id] - Fetch single customer by id or macolaCode
export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id }, { macolaCode: id }],
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error: unknown) {
    console.error("GET /api/customers/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PATCH /api/customers/[id] - Update customer
export async function PATCH(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const { macolaCode, name, email, phone, address, currency } = body;

    // Check macolaCode uniqueness if changing
    if (macolaCode && macolaCode !== existing.macolaCode) {
      const codeConflict = await prisma.customer.findUnique({
        where: { macolaCode },
      });
      if (codeConflict) {
        return NextResponse.json(
          { success: false, error: `Customer with Macola code '${macolaCode}' already exists` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(macolaCode !== undefined && { macolaCode: macolaCode || null }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(address !== undefined && { address: address || null }),
        ...(currency !== undefined && { currency }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("PATCH /api/customers/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;

    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Customer deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/customers/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
