import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const rep = await db.salesRep.findUnique({
      where: { id },
      include: { commissions: true },
    });

    if (!rep) {
      return NextResponse.json(
        { success: false, error: "Vendedor no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rep });
  } catch (error: any) {
    console.error("GET /api/sales-reps/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sales representative" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;
    const body = await req.json();

    const updatedRep = await db.salesRep.update({
      where: { id },
      data: {
        ...(body.code && { code: body.code }),
        ...(body.name && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.zone !== undefined && { zone: body.zone }),
        ...(body.commissionRate !== undefined && { commissionRate: Number(body.commissionRate) }),
        ...(body.commissionType && { commissionType: body.commissionType }),
        ...(body.monthlyTarget !== undefined && { monthlyTarget: Number(body.monthlyTarget) }),
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ success: true, data: updatedRep });
  } catch (error: any) {
    console.error("PATCH /api/sales-reps/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update sales representative" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    await db.salesRep.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Vendedor eliminado correctamente." });
  } catch (error: any) {
    console.error("DELETE /api/sales-reps/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete sales representative" },
      { status: 500 }
    );
  }
}
