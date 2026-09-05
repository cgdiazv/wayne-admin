import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postSalesInvoiceEntry } from "@/lib/accounting";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Obtener el pedido de venta con sus líneas
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: true,
        salesInvoice: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pedido de venta no encontrado." },
        { status: 404 }
      );
    }

    if (order.status === "FACTURADO" && order.salesInvoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: `Este pedido ya fue facturado previamente con la Factura N.º ${order.invoiceNumber}.`,
          invoiceNumber: order.invoiceNumber,
          salesInvoiceId: order.salesInvoiceId,
        },
        { status: 400 }
      );
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "El pedido no contiene ítems para facturar." },
        { status: 400 }
      );
    }

    // 2. Determinar el siguiente correlativo de factura
    const existingInvoices = await prisma.salesInvoice.findMany({
      select: { invoiceNumber: true },
      orderBy: { createdAt: "desc" },
    });

    let nextInvoiceNumber = "1001";
    if (existingInvoices.length > 0) {
      let maxNum = 0;
      let isSarFormat = false;
      let sarPrefix = "";

      for (const inv of existingInvoices) {
        const sarMatch = inv.invoiceNumber.match(/^(\d{3}-\d{3}-\d{2}-)(\d+)$/);
        if (sarMatch) {
          isSarFormat = true;
          sarPrefix = sarMatch[1];
          const seq = parseInt(sarMatch[2], 10);
          if (seq > maxNum) maxNum = seq;
        } else {
          const numOnly = parseInt(inv.invoiceNumber.replace(/\D/g, ""), 10);
          if (!isNaN(numOnly) && numOnly > maxNum) {
            maxNum = numOnly;
          }
        }
      }

      if (isSarFormat && sarPrefix) {
        nextInvoiceNumber = `${sarPrefix}${String(maxNum + 1).padStart(8, "0")}`;
      } else if (maxNum > 0) {
        nextInvoiceNumber = (maxNum + 1).toString();
      } else {
        nextInvoiceNumber = `FAC-${new Date().getFullYear()}-${String(existingInvoices.length + 1).padStart(4, "0")}`;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    let daysToAdd = 30;
    if (order.paymentTerms?.includes("15")) daysToAdd = 15;
    else if (order.paymentTerms?.includes("45")) daysToAdd = 45;
    else if (order.paymentTerms?.includes("60")) daysToAdd = 60;
    else if (order.paymentTerms?.toLowerCase().includes("contado")) daysToAdd = 0;

    const dueDate = new Date(Date.now() + daysToAdd * 86400000).toISOString().split("T")[0];
    const companySettings = await prisma.companySettings.findFirst();

    // 3. Crear la Factura de Ventas (SalesInvoice)
    const newInvoice = await prisma.salesInvoice.create({
      data: {
        invoiceNumber: nextInvoiceNumber,
        customerId: order.customerId || null,
        customerName: order.customerName,
        customerRtn: order.customerRtn || null,
        customerAddress: order.customerAddress || null,
        customerEmail: order.customerEmail || null,
        invoiceDate: today,
        dueDate: dueDate,
        paymentTerms: order.paymentTerms || "Neto 30 días",
        currency: order.currency || "USD",
        cai: companySettings?.cai !== "Ninguno indicado" ? companySettings?.cai : null,
        discount: order.discount || 0,
        importeExento: 0,
        importeExonerado: 0,
        impGravado15: order.subtotal - (order.discount || 0),
        impGravado18: 0,
        subtotal: order.subtotal,
        isv15: order.tax || 0,
        isv18: 0,
        total: order.total,
        status: "Emitida",
        lines: {
          create: order.items.map((it) => ({
            productName: it.productName,
            sku: it.sku || null,
            description: it.description || null,
            quantity: it.quantityOrdered,
            rate: it.rate,
            amount: it.amount,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    // 4. Asiento Contable automático
    let journalEntry = null;
    try {
      journalEntry = await postSalesInvoiceEntry({
        id: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        customerName: newInvoice.customerName,
        invoiceDate: newInvoice.invoiceDate,
        subtotal: newInvoice.subtotal,
        total: newInvoice.total,
        isv15: newInvoice.isv15,
        isv18: newInvoice.isv18,
        discount: newInvoice.discount,
        currency: newInvoice.currency,
      });

      if (journalEntry?.id) {
        await prisma.salesInvoice.update({
          where: { id: newInvoice.id },
          data: { journalEntryId: journalEntry.id },
        });
      }
    } catch (acctErr) {
      console.warn("No se pudo generar el asiento automático para la factura:", acctErr);
    }

    // 5. Actualizar el pedido a FACTURADO y marcar cantidades facturadas
    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id },
        data: {
          status: "FACTURADO",
          salesInvoiceId: newInvoice.id,
          invoiceNumber: newInvoice.invoiceNumber,
        },
      });

      for (const it of order.items) {
        await tx.salesOrderItem.update({
          where: { id: it.id },
          data: {
            quantityInvoiced: it.quantityOrdered,
            quantityShipped: it.quantityShipped || it.quantityOrdered,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `¡Pedido ${order.orderNumber} facturado con éxito! Se emitió la Factura N.º ${newInvoice.invoiceNumber}.`,
      data: {
        invoice: newInvoice,
        journalEntryId: journalEntry?.id || null,
        invoiceNumber: newInvoice.invoiceNumber,
      },
    });
  } catch (error: any) {
    console.error("POST /api/sales-orders/[id]/convert-to-invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al facturar pedido de venta" },
      { status: 500 }
    );
  }
}
