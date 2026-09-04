import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Semilla inicial si la base de datos no tiene cotizaciones aún
const initialSeedQuotes = [
  {
    quoteNumber: "COT-2026-0001",
    customerName: "Cervecería Hondureña S.A.",
    customerRtn: "05019001234567",
    customerEmail: "compras@cerveceria.hn",
    customerPhone: "+504 2550-1000",
    customerAddress: "Blvd. del Norte, San Pedro Sula, Cortés",
    quoteDate: "2026-09-01",
    validUntil: "2026-09-30",
    paymentTerms: "Neto 30 días",
    currency: "USD",
    salesRepName: "Carlos Menjívar",
    notes: "Precios especiales por volumen de corrida flexográfica a 6 tintas.",
    termsConditions: "Tiempo de entrega estimado: 10 días hábiles posterior a la aprobación de arte.",
    subtotal: 14200.0,
    discount: 0,
    taxRate: 15,
    tax: 2130.0,
    total: 16330.0,
    status: "Aprobada",
    lines: [
      {
        productName: "Etiquetas Termoencogibles Corona 355ml",
        sku: "LBL-SLV-355",
        description: "Rollos de película PETG termoencogible con impresión flexográfica alta definición",
        quantity: 50,
        rate: 200.0,
        amount: 10000.0,
      },
      {
        productName: "Cajas Corrugadas Master Box Cerveza 24pk",
        sku: "BOX-MST-024",
        description: "Empaque corrugado flauta B con barniz antihumedad",
        quantity: 2000,
        rate: 2.10,
        amount: 4200.0,
      },
    ],
  },
  {
    quoteNumber: "COT-2026-0002",
    customerName: "Embotelladora de Sula S.A. (Pepsi)",
    customerRtn: "05019002345678",
    customerEmail: "pagos@emsula.hn",
    customerPhone: "+504 2545-2000",
    customerAddress: "Carretera a Puerto Cortés, Choloma, Cortés",
    quoteDate: "2026-09-03",
    validUntil: "2026-10-03",
    paymentTerms: "Neto 45 días",
    currency: "USD",
    salesRepName: "Ana Lucía Rivera",
    notes: "Propuesta comercial para suministro trimestral Q4-2026.",
    termsConditions: "Precios CIF planta Choloma. Sujeto a disponibilidad de bobina base.",
    subtotal: 8750.0,
    discount: 250.0,
    taxRate: 15,
    tax: 1275.0,
    total: 9775.0,
    status: "Enviada",
    lines: [
      {
        productName: "Etiquetas Adhesivas BOPP Pepsi 2L",
        sku: "LBL-BOPP-2L",
        description: "Bobinas continuas para etiquetadora automática Krones",
        quantity: 35,
        rate: 250.0,
        amount: 8750.0,
      },
    ],
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    let quotes = await prisma.quote.findMany({
      include: {
        lines: true,
        salesInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            total: true,
            status: true,
            journalEntryId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Sembrar datos iniciales si no hay ninguna cotización
    if (quotes.length === 0) {
      for (const seed of initialSeedQuotes) {
        await prisma.quote.create({
          data: {
            quoteNumber: seed.quoteNumber,
            customerName: seed.customerName,
            customerRtn: seed.customerRtn,
            customerEmail: seed.customerEmail,
            customerPhone: seed.customerPhone,
            customerAddress: seed.customerAddress,
            quoteDate: seed.quoteDate,
            validUntil: seed.validUntil,
            paymentTerms: seed.paymentTerms,
            currency: seed.currency,
            salesRepName: seed.salesRepName,
            notes: seed.notes,
            termsConditions: seed.termsConditions,
            subtotal: seed.subtotal,
            discount: seed.discount,
            taxRate: seed.taxRate,
            tax: seed.tax,
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
        });
      }

      quotes = await prisma.quote.findMany({
        include: {
          lines: true,
          salesInvoice: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Filtrar si se proporcionó búsqueda o estado
    let filtered = quotes;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.quoteNumber.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          (c.salesRepName && c.salesRepName.toLowerCase().includes(q)) ||
          c.lines.some((l) => l.productName.toLowerCase().includes(q))
      );
    }

    if (status && status !== "ALL") {
      filtered = filtered.filter((c) => c.status.toLowerCase() === status.toLowerCase());
    }

    // Calcular KPIs
    const totalQuoted = quotes.reduce((acc, q) => acc + (q.total || 0), 0);
    const totalApproved = quotes
      .filter((q) => q.status === "Aprobada" || q.status === "Facturada")
      .reduce((acc, q) => acc + (q.total || 0), 0);
    const countBorrador = quotes.filter((q) => q.status === "Borrador").length;
    const countEnviada = quotes.filter((q) => q.status === "Enviada").length;
    const countAprobada = quotes.filter((q) => q.status === "Aprobada").length;
    const countFacturada = quotes.filter((q) => q.status === "Facturada").length;
    const countRechazada = quotes.filter((q) => q.status === "Rechazada").length;

    // Próximo correlativo sugerido
    const numbers = quotes
      .map((q) => {
        const match = q.quoteNumber.match(/COT-(\d+)-(\d+)/) || q.quoteNumber.match(/(\d+)/);
        return match ? parseInt(match[match.length - 1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextSeq = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
    const year = new Date().getFullYear();
    const nextQuoteNumber = `COT-${year}-${String(nextSeq).padStart(4, "0")}`;

    return NextResponse.json({
      success: true,
      data: filtered,
      nextQuoteNumber,
      metrics: {
        totalQuotes: quotes.length,
        totalQuoted,
        totalApproved,
        countBorrador,
        countEnviada,
        countAprobada,
        countFacturada,
        countRechazada,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/quotes error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      quoteNumber,
      customerId,
      customerName,
      customerRtn,
      customerAddress,
      customerEmail,
      customerPhone,
      quoteDate = new Date().toISOString().split("T")[0],
      validUntil,
      paymentTerms = "Neto 30 días",
      currency = "USD",
      salesRepId,
      salesRepName,
      notes,
      termsConditions,
      discount = 0,
      taxRate = 15,
      status = "Borrador",
      lines = [],
    } = body;

    if (!quoteNumber || !customerName || lines.length === 0) {
      return NextResponse.json(
        { success: false, error: "N.º de cotización, cliente y al menos un ítem son obligatorios." },
        { status: 400 }
      );
    }

    // Calcular montos de forma precisa
    const calculatedLines = lines.map((l: any) => {
      const qty = Number(l.quantity) || 1;
      const rate = Number(l.rate) || 0;
      const amount = Math.round(qty * rate * 100) / 100;
      return {
        productName: l.productName || "Artículo o Servicio",
        sku: l.sku || null,
        description: l.description || null,
        quantity: qty,
        rate: rate,
        amount: amount,
      };
    });

    const subtotal = calculatedLines.reduce((acc: number, l: any) => acc + l.amount, 0);
    const discNum = Math.max(0, Number(discount) || 0);
    const taxableBase = Math.max(0, subtotal - discNum);
    const taxNum = Math.round(((taxableBase * (Number(taxRate) || 0)) / 100) * 100) / 100;
    const total = Math.round((taxableBase + taxNum) * 100) / 100;

    // Fecha de validez por defecto (30 días)
    const defValidUntil =
      validUntil ||
      new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    // Comprobar si ya existe el número de cotización
    const existing = await prisma.quote.findUnique({
      where: { quoteNumber },
    });

    let savedQuote;
    if (existing) {
      // Si existe y ya fue facturada, no permitir sobreescritura total
      if (existing.status === "Facturada") {
        return NextResponse.json(
          { success: false, error: "Esta cotización ya fue convertida a Factura y no puede ser modificada." },
          { status: 400 }
        );
      }

      await prisma.quoteLine.deleteMany({
        where: { quoteId: existing.id },
      });

      savedQuote = await prisma.quote.update({
        where: { id: existing.id },
        data: {
          customerId: customerId || null,
          customerName,
          customerRtn: customerRtn || null,
          customerAddress: customerAddress || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          quoteDate,
          validUntil: defValidUntil,
          paymentTerms,
          currency,
          salesRepId: salesRepId || null,
          salesRepName: salesRepName || null,
          notes: notes || null,
          termsConditions: termsConditions || null,
          discount: discNum,
          subtotal,
          taxRate: Number(taxRate) || 15,
          tax: taxNum,
          total,
          status,
          lines: {
            create: calculatedLines,
          },
        },
        include: { lines: true, salesInvoice: true },
      });
    } else {
      savedQuote = await prisma.quote.create({
        data: {
          quoteNumber,
          customerId: customerId || null,
          customerName,
          customerRtn: customerRtn || null,
          customerAddress: customerAddress || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          quoteDate,
          validUntil: defValidUntil,
          paymentTerms,
          currency,
          salesRepId: salesRepId || null,
          salesRepName: salesRepName || null,
          notes: notes || null,
          termsConditions: termsConditions || null,
          discount: discNum,
          subtotal,
          taxRate: Number(taxRate) || 15,
          tax: taxNum,
          total,
          status,
          lines: {
            create: calculatedLines,
          },
        },
        include: { lines: true, salesInvoice: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: savedQuote,
      message: "Cotización guardada exitosamente.",
    });
  } catch (error: unknown) {
    console.error("POST /api/quotes error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes, termsConditions } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de cotización requerido." }, { status: 400 });
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(termsConditions !== undefined ? { termsConditions } : {}),
      },
      include: { lines: true, salesInvoice: true },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Estado de cotización actualizado a "${updated.status}".`,
    });
  } catch (error: unknown) {
    console.error("PUT /api/quotes error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
