import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postSalesInvoiceEntry } from "@/lib/accounting";

// Initial seed data if database has no sales invoices yet
const initialSeedInvoices = [
  {
    invoiceNumber: "000-001-01-00036801",
    customerName: "Cervecería Hondureña S.A.",
    customerRtn: "05019001234567",
    customerAddress: "Blvd. del Norte, San Pedro Sula",
    customerEmail: "compras@cerveceria.hn",
    invoiceDate: "2026-08-15",
    dueDate: "2026-09-15",
    paymentTerms: "Neto 30 días",
    currency: "USD",
    subtotal: 10869.57,
    impGravado15: 10869.57,
    isv15: 1630.43,
    total: 12500.0,
    status: "Emitida",
    lines: [
      {
        productName: "Etiquetas Flexográficas Corona 355ml",
        sku: "LBL-CRN-355",
        description: "Rollos de 5,000 etiquetas metalizadas con barniz UV brillante",
        quantity: 20,
        rate: 543.48,
        amount: 10869.57,
      },
    ],
  },
  {
    invoiceNumber: "000-001-01-00036802",
    customerName: "Embotelladora de Sula S.A. (Pepsi)",
    customerRtn: "05019002345678",
    customerAddress: "Carretera a Puerto Cortés, Choloma",
    customerEmail: "pagos@emsula.hn",
    invoiceDate: "2026-08-20",
    dueDate: "2026-09-20",
    paymentTerms: "Neto 30 días",
    currency: "USD",
    subtotal: 4521.74,
    impGravado15: 4521.74,
    isv15: 678.26,
    total: 5200.0,
    status: "Emitida",
    lines: [
      {
        productName: "Cajas Corrugadas Master Box 24pk",
        sku: "BOX-MST-024",
        description: "Empaque corrugado impreso a 4 tintas con alta resistencia al apilamiento",
        quantity: 1000,
        rate: 4.52,
        amount: 4521.74,
      },
    ],
  },
];

export async function GET() {
  try {
    let invoices = await prisma.salesInvoice.findMany({
      include: {
        lines: true,
      },
      orderBy: { invoiceDate: "desc" },
    });

    // Seed if empty so the user has immediate data
    if (invoices.length === 0) {
      for (const seed of initialSeedInvoices) {
        const created = await prisma.salesInvoice.create({
          data: {
            invoiceNumber: seed.invoiceNumber,
            customerName: seed.customerName,
            customerRtn: seed.customerRtn,
            customerAddress: seed.customerAddress,
            customerEmail: seed.customerEmail,
            invoiceDate: seed.invoiceDate,
            dueDate: seed.dueDate,
            paymentTerms: seed.paymentTerms,
            currency: seed.currency,
            subtotal: seed.subtotal,
            impGravado15: seed.impGravado15,
            isv15: seed.isv15,
            total: seed.total,
            status: seed.status,
            lines: {
              create: seed.lines.map((l) => ({
                productName: l.productName,
                sku: l.sku,
                description: l.description,
                quantity: l.quantity,
                rate: l.rate,
                amount: l.amount,
              })),
            },
          },
          include: { lines: true },
        });

        // Automatically create journal entry for seeded invoices
        try {
          const entry = await postSalesInvoiceEntry({
            id: created.id,
            invoiceNumber: created.invoiceNumber,
            customerName: created.customerName,
            invoiceDate: created.invoiceDate,
            subtotal: created.subtotal,
            total: created.total,
            isv15: created.isv15,
            isv18: created.isv18,
            currency: created.currency,
          });
          if (entry) {
            await prisma.salesInvoice.update({
              where: { id: created.id },
              data: { journalEntryId: entry.id },
            });
          }
        } catch (e) {
          console.error("Error posting seed journal entry:", e);
        }
      }

      invoices = await prisma.salesInvoice.findMany({
        include: { lines: true },
        orderBy: { invoiceDate: "desc" },
      });
    }

    return NextResponse.json({ success: true, data: invoices });
  } catch (error: unknown) {
    console.error("GET /api/invoices error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      invoiceNumber,
      customerId,
      customerName,
      customerRtn,
      customerAddress,
      customerEmail,
      invoiceDate = new Date().toISOString().split("T")[0],
      dueDate,
      paymentTerms = "Neto 30 días",
      currency = "USD",
      cai,
      discount = 0,
      importeExento = 0,
      importeExonerado = 0,
      impGravado15 = 0,
      impGravado18 = 0,
      subtotal = 0,
      isv15 = 0,
      isv18 = 0,
      total = 0,
      status = "Emitida",
      lines = [],
    } = body;

    if (!invoiceNumber || !customerName || total <= 0) {
      return NextResponse.json(
        { success: false, error: "Número de factura, cliente y total válido son requeridos." },
        { status: 400 }
      );
    }

    // Upsert SalesInvoice in DB
    const existing = await prisma.salesInvoice.findUnique({
      where: { invoiceNumber },
    });

    let savedInvoice;
    if (existing) {
      // Delete old lines and replace with new
      await prisma.salesInvoiceLine.deleteMany({
        where: { salesInvoiceId: existing.id },
      });

      savedInvoice = await prisma.salesInvoice.update({
        where: { id: existing.id },
        data: {
          customerId: customerId || null,
          customerName,
          customerRtn: customerRtn || null,
          customerAddress: customerAddress || null,
          customerEmail: customerEmail || null,
          invoiceDate,
          dueDate: dueDate || null,
          paymentTerms,
          currency,
          cai: cai || null,
          discount: Number(discount) || 0,
          importeExento: Number(importeExento) || 0,
          importeExonerado: Number(importeExonerado) || 0,
          impGravado15: Number(impGravado15) || 0,
          impGravado18: Number(impGravado18) || 0,
          subtotal: Number(subtotal) || 0,
          isv15: Number(isv15) || 0,
          isv18: Number(isv18) || 0,
          total: Number(total) || 0,
          status,
          lines: {
            create: lines.map((l: any) => ({
              productName: l.productName || "Artículo",
              sku: l.sku || null,
              description: l.description || null,
              quantity: Number(l.quantity) || 1,
              rate: Number(l.rate) || 0,
              amount: Number(l.amount) || 0,
            })),
          },
        },
        include: { lines: true },
      });
    } else {
      savedInvoice = await prisma.salesInvoice.create({
        data: {
          invoiceNumber,
          customerId: customerId || null,
          customerName,
          customerRtn: customerRtn || null,
          customerAddress: customerAddress || null,
          customerEmail: customerEmail || null,
          invoiceDate,
          dueDate: dueDate || null,
          paymentTerms,
          currency,
          cai: cai || null,
          discount: Number(discount) || 0,
          importeExento: Number(importeExento) || 0,
          importeExonerado: Number(importeExonerado) || 0,
          impGravado15: Number(impGravado15) || 0,
          impGravado18: Number(impGravado18) || 0,
          subtotal: Number(subtotal) || 0,
          isv15: Number(isv15) || 0,
          isv18: Number(isv18) || 0,
          total: Number(total) || 0,
          status,
          lines: {
            create: lines.map((l: any) => ({
              productName: l.productName || "Artículo",
              sku: l.sku || null,
              description: l.description || null,
              quantity: Number(l.quantity) || 1,
              rate: Number(l.rate) || 0,
              amount: Number(l.amount) || 0,
            })),
          },
        },
        include: { lines: true },
      });
    }

    // AUTOMATIC DOUBLE-ENTRY ACCOUNTING POSTING
    let journalEntry = null;
    try {
      journalEntry = await postSalesInvoiceEntry({
        id: savedInvoice.id,
        invoiceNumber: savedInvoice.invoiceNumber,
        customerName: savedInvoice.customerName,
        invoiceDate: savedInvoice.invoiceDate,
        subtotal: savedInvoice.subtotal,
        total: savedInvoice.total,
        isv15: savedInvoice.isv15,
        isv18: savedInvoice.isv18,
        discount: savedInvoice.discount,
        currency: savedInvoice.currency,
      });

      if (journalEntry) {
        await prisma.salesInvoice.update({
          where: { id: savedInvoice.id },
          data: { journalEntryId: journalEntry.id },
        });
      }
    } catch (accountingErr: any) {
      console.error("Error creating accounting entry for invoice:", accountingErr);
    }

    return NextResponse.json({
      success: true,
      data: savedInvoice,
      journalEntry,
      message: "Factura guardada y contabilizada automáticamente en el Libro Diario.",
    });
  } catch (error: unknown) {
    console.error("POST /api/invoices error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
