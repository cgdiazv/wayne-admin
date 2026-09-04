import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postSalesInvoiceEntry } from "@/lib/accounting";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Obtener la cotización con sus líneas
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lines: true,
        salesInvoice: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "Cotización no encontrada." },
        { status: 404 }
      );
    }

    if (quote.status === "Facturada" && quote.salesInvoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: `Esta cotización ya fue convertida previamente a la Factura N.º ${quote.invoiceNumber}.`,
          invoiceNumber: quote.invoiceNumber,
          salesInvoiceId: quote.salesInvoiceId,
        },
        { status: 400 }
      );
    }

    if (quote.lines.length === 0) {
      return NextResponse.json(
        { success: false, error: "La cotización no contiene ítems para facturar." },
        { status: 400 }
      );
    }

    // 2. Determinar el siguiente número de factura
    const existingInvoices = await prisma.salesInvoice.findMany({
      select: { invoiceNumber: true },
      orderBy: { createdAt: "desc" },
    });

    let nextInvoiceNumber = "1001";
    if (existingInvoices.length > 0) {
      // Intentar extraer números correlativos simples o formato SAR
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

    // Calcular fecha de vencimiento según términos
    const today = new Date().toISOString().split("T")[0];
    let daysToAdd = 30;
    if (quote.paymentTerms?.includes("15")) daysToAdd = 15;
    else if (quote.paymentTerms?.includes("45")) daysToAdd = 45;
    else if (quote.paymentTerms?.includes("60")) daysToAdd = 60;
    else if (quote.paymentTerms?.toLowerCase().includes("contado")) daysToAdd = 0;

    const dueDate = new Date(Date.now() + daysToAdd * 86400000).toISOString().split("T")[0];

    // Obtener CAI de la empresa si existe
    const companySettings = await prisma.companySettings.findFirst();

    // 3. Crear la Factura de Ventas (SalesInvoice)
    const newInvoice = await prisma.salesInvoice.create({
      data: {
        invoiceNumber: nextInvoiceNumber,
        customerId: quote.customerId || null,
        customerName: quote.customerName,
        customerRtn: quote.customerRtn || null,
        customerAddress: quote.customerAddress || null,
        customerEmail: quote.customerEmail || null,
        invoiceDate: today,
        dueDate: dueDate,
        paymentTerms: quote.paymentTerms || "Neto 30 días",
        currency: quote.currency || "USD",
        cai: companySettings?.cai !== "Ninguno indicado" ? companySettings?.cai : null,
        discount: quote.discount || 0,
        importeExento: 0,
        importeExonerado: 0,
        impGravado15: quote.subtotal - (quote.discount || 0),
        impGravado18: 0,
        subtotal: quote.subtotal,
        isv15: quote.tax || 0,
        isv18: 0,
        total: quote.total,
        status: "Emitida",
        lines: {
          create: quote.lines.map((l) => ({
            productName: l.productName,
            sku: l.sku || null,
            description: l.description || null,
            quantity: l.quantity,
            rate: l.rate,
            amount: l.amount,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    // 4. GENERACIÓN AUTOMÁTICA DEL ASIENTO CONTABLE EN EL LIBRO DIARIO
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

      if (journalEntry) {
        await prisma.salesInvoice.update({
          where: { id: newInvoice.id },
          data: { journalEntryId: journalEntry.id },
        });
      }
    } catch (accountingErr) {
      console.error("Error al contabilizar la factura en el Libro Diario:", accountingErr);
    }

    // 5. Actualizar la cotización vinculándola a la factura y marcándola como Facturada
    const updatedQuote = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "Facturada",
        invoiceNumber: newInvoice.invoiceNumber,
        salesInvoiceId: newInvoice.id,
      },
      include: {
        lines: true,
        salesInvoice: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `¡Cotización ${quote.quoteNumber} convertida exitosamente a Factura N.º ${newInvoice.invoiceNumber}!`,
      accountingPosted: !!journalEntry,
      journalEntryNumber: journalEntry?.entryNumber || null,
      journalEntryId: journalEntry?.id || null,
      invoice: newInvoice,
      quote: updatedQuote,
    });
  } catch (error: unknown) {
    console.error("POST /api/quotes/[id]/convert-to-invoice error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
