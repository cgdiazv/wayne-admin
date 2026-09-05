import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const order = await db.purchaseOrder.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
        vendor: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Orden de compra no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error("GET /api/purchase-orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener la orden de compra." },
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

    // Verify existence
    const existing = await db.purchaseOrder.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Orden de compra no encontrada." },
        { status: 404 }
      );
    }

    const targetId = existing.id;

    // Handle full update with items if provided
    if (Array.isArray(body.items)) {
      let subtotal = 0;
      const mappedItems = body.items.map((it: any) => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.unitCost ?? it.rate) || 0;
        const totalCost = qty * rate;
        subtotal += totalCost;
        return {
          productName: it.productName || "Insumo o Material",
          sku: it.sku || null,
          description: it.description || null,
          quantity: qty,
          unitCost: rate,
          totalCost,
        };
      });

      const tax = body.tax !== undefined ? Number(body.tax) : Math.round(subtotal * 0.15 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      // Transaction: delete old items and create new ones
      const updated = await db.$transaction(async (tx: any) => {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: targetId },
        });

        return await tx.purchaseOrder.update({
          where: { id: targetId },
          data: {
            ...(body.vendorId !== undefined && { vendorId: body.vendorId || null }),
            ...(body.vendorName && { vendorName: body.vendorName.trim() }),
            ...(body.vendorEmail !== undefined && { vendorEmail: body.vendorEmail || null }),
            ...(body.vendorAddress !== undefined && { vendorAddress: body.vendorAddress || null }),
            ...(body.category && { category: body.category }),
            ...(body.issueDate && { issueDate: body.issueDate }),
            ...(body.expectedDate !== undefined && { expectedDate: body.expectedDate || null }),
            ...(body.paymentTerms && { paymentTerms: body.paymentTerms }),
            ...(body.currency && { currency: body.currency }),
            ...(body.status && { status: body.status }),
            ...(body.notes !== undefined && { notes: body.notes || null }),
            subtotal,
            tax,
            total,
            items: {
              create: mappedItems,
            },
          },
          include: {
            items: true,
            vendor: true,
          },
        });
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: "Orden de compra actualizada con éxito.",
      });
    }

    // Partial update (e.g. status change, notes, expectedDate)
    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.expectedDate !== undefined) updateData.expectedDate = body.expectedDate;
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.vendorName !== undefined) updateData.vendorName = body.vendorName;

    const updated = await db.purchaseOrder.update({
      where: { id: targetId },
      data: updateData,
      include: {
        items: true,
        vendor: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Orden de compra actualizada (${body.status || "guardada"}).`,
    });
  } catch (error: any) {
    console.error("PATCH /api/purchase-orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar la orden de compra." },
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

    const existing = await db.purchaseOrder.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Orden de compra no encontrada." },
        { status: 404 }
      );
    }

    await db.purchaseOrder.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Orden de compra ${existing.orderNumber} eliminada correctamente.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/purchase-orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar la orden de compra." },
      { status: 500 }
    );
  }
}
