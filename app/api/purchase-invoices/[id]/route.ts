import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const invoice = await db.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Factura de Compra no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    console.error("GET /api/purchase-invoices/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch purchase invoice" },
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

    const updated = await db.purchaseInvoice.update({
      where: { id },
      data: {
        ...(body.paymentStatus && { paymentStatus: body.paymentStatus }),
        ...(body.inventoryStatus && { inventoryStatus: body.inventoryStatus }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/purchase-invoices/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update purchase invoice" },
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

    await db.purchaseInvoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Factura de compra eliminada correctamente." });
  } catch (error: any) {
    console.error("DELETE /api/purchase-invoices/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete purchase invoice" },
      { status: 500 }
    );
  }
}
