import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: true,
        quote: true,
        salesInvoice: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pedido de venta no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error("GET /api/sales-orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener pedido" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pedido de venta no encontrado" },
        { status: 404 }
      );
    }

    const {
      customerPoNumber,
      customerId,
      customerName,
      customerRtn,
      customerAddress,
      customerEmail,
      customerPhone,
      orderDate,
      expectedDeliveryDate,
      paymentTerms,
      currency,
      salesRepId,
      salesRepName,
      warehouse,
      notes,
      shippingNotes,
      discount,
      subtotal,
      taxRate,
      tax,
      total,
      status,
      items,
    } = body;

    // Actualizar campos del pedido y reemplazar ítems si se suministraron
    const updated = await prisma.$transaction(async (tx) => {
      if (items && Array.isArray(items)) {
        await tx.salesOrderItem.deleteMany({
          where: { salesOrderId: id },
        });

        await tx.salesOrderItem.createMany({
          data: items.map((it: any) => ({
            salesOrderId: id,
            productName: it.productName?.trim() || "Producto",
            sku: it.sku?.trim() || null,
            description: it.description?.trim() || null,
            quantityOrdered: Number(it.quantityOrdered || it.quantity) || 1,
            quantityCommitted: Number(it.quantityCommitted || it.quantityOrdered || it.quantity) || 1,
            quantityShipped: Number(it.quantityShipped) || 0,
            quantityInvoiced: Number(it.quantityInvoiced) || 0,
            rate: Number(it.rate) || 0,
            amount: Number(it.amount) || 0,
            notes: it.notes || null,
          })),
        });
      }

      return await tx.salesOrder.update({
        where: { id },
        data: {
          customerPoNumber: customerPoNumber !== undefined ? (customerPoNumber?.trim() || null) : existing.customerPoNumber,
          customerId: customerId !== undefined ? customerId : existing.customerId,
          customerName: customerName ? customerName.trim() : existing.customerName,
          customerRtn: customerRtn !== undefined ? (customerRtn?.trim() || null) : existing.customerRtn,
          customerAddress: customerAddress !== undefined ? (customerAddress?.trim() || null) : existing.customerAddress,
          customerEmail: customerEmail !== undefined ? (customerEmail?.trim() || null) : existing.customerEmail,
          customerPhone: customerPhone !== undefined ? (customerPhone?.trim() || null) : existing.customerPhone,
          orderDate: orderDate || existing.orderDate,
          expectedDeliveryDate: expectedDeliveryDate !== undefined ? expectedDeliveryDate : existing.expectedDeliveryDate,
          paymentTerms: paymentTerms || existing.paymentTerms,
          currency: currency || existing.currency,
          salesRepId: salesRepId !== undefined ? salesRepId : existing.salesRepId,
          salesRepName: salesRepName !== undefined ? (salesRepName?.trim() || null) : existing.salesRepName,
          warehouse: warehouse || existing.warehouse,
          notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
          shippingNotes: shippingNotes !== undefined ? (shippingNotes?.trim() || null) : existing.shippingNotes,
          discount: discount !== undefined ? Number(discount) : existing.discount,
          subtotal: subtotal !== undefined ? Number(subtotal) : existing.subtotal,
          taxRate: taxRate !== undefined ? Number(taxRate) : existing.taxRate,
          tax: tax !== undefined ? Number(tax) : existing.tax,
          total: total !== undefined ? Number(total) : existing.total,
          status: status || existing.status,
        },
        include: {
          items: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Pedido ${updated.orderNumber} actualizado correctamente.`,
    });
  } catch (error: any) {
    console.error("PUT /api/sales-orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar pedido" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.salesOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    if (existing.status === "FACTURADO") {
      return NextResponse.json(
        { success: false, error: "No se puede eliminar un pedido que ya ha sido facturado." },
        { status: 400 }
      );
    }

    await prisma.salesOrder.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Pedido ${existing.orderNumber} eliminado correctamente.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/sales-orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar pedido" },
      { status: 500 }
    );
  }
}
