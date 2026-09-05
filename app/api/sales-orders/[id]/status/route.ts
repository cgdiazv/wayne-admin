import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const validStatuses = [
      "BORRADOR",
      "CONFIRMADO",
      "EN_PREPARACION",
      "DESPACHADO_PARCIAL",
      "DESPACHADO",
      "FACTURADO",
      "CANCELADO",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Estado inválido. Opciones: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pedido de venta no encontrado" },
        { status: 404 }
      );
    }

    // Si el estado pasa a DESPACHADO, marcar los ítems como despachados si no lo estaban
    const updated = await prisma.$transaction(async (tx) => {
      if (status === "DESPACHADO") {
        for (const it of existing.items) {
          if (it.quantityShipped < it.quantityOrdered) {
            await tx.salesOrderItem.update({
              where: { id: it.id },
              data: { quantityShipped: it.quantityOrdered },
            });
          }
        }
      }

      const updateData: any = { status };
      if (notes) {
        updateData.notes = existing.notes ? `${existing.notes} | ${notes}` : notes;
      }

      return await tx.salesOrder.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Estado del pedido ${existing.orderNumber} actualizado a ${status}.`,
    });
  } catch (error: any) {
    console.error("PATCH /api/sales-orders/[id]/status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar estado" },
      { status: 500 }
    );
  }
}
