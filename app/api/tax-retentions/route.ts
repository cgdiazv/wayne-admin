import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postTaxRetentionEntry } from "@/lib/accounting";

export async function GET(req: Request) {
  try {
    const db = prisma as any;
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");
    const status = searchParams.get("status");
    const month = searchParams.get("month"); // e.g. "2026-09"

    const where: any = {};
    if (providerId) where.providerId = providerId;
    if (status && status !== "ALL") where.status = status;
    if (month) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      where.date = {
        gte: start,
        lte: end,
      };
    }

    let retentions = await db.taxRetention.findMany({
      where,
      include: {
        provider: true,
        purchaseInvoice: true,
      },
      orderBy: { date: "desc" },
    });

    // If database is completely empty of retentions, seed initial demonstration records
    if ((!retentions || retentions.length === 0) && !providerId && !month) {
      const vendors = await db.vendor.findMany({ take: 3 });
      const purchaseInvoices = await db.purchaseInvoice.findMany({ take: 2 });

      if (vendors.length > 0) {
        const seedData = [
          {
            retentionNumber: "RET-2026-0001",
            providerId: vendors[0].id,
            purchaseInvoiceId: purchaseInvoices[0]?.id || null,
            baseAmount: purchaseInvoices[0]?.subtotal || 850.0,
            retentionRate: 1.0, // 1% ISV Agente Retenedor SAR
            retentionAmount: Math.round(((purchaseInvoices[0]?.subtotal || 850.0) * 0.01) * 100) / 100,
            retentionType: "ISV_1",
            status: "ISSUED",
            cai: "2B8F44-96DF4A-3240BE-A33190-67B7A9-1E",
            notes: "Retención del 1% de ISV sobre compra gravada según Art. 11 Ley de ISV (Gran Contribuyente).",
            date: new Date("2026-09-02T14:30:00Z"),
          },
          ...(vendors.length > 1
            ? [
                {
                  retentionNumber: "RET-2026-0002",
                  providerId: vendors[1].id,
                  purchaseInvoiceId: purchaseInvoices[1]?.id || null,
                  baseAmount: 1200.0,
                  retentionRate: 12.5, // 12.5% ISR Honorarios Profesionales SAR
                  retentionAmount: 150.0,
                  retentionType: "ISR_12_5",
                  status: "ISSUED",
                  cai: "2B8F44-96DF4A-3240BE-A33190-67B7A9-1E",
                  notes: "Retención del 12.5% de Impuesto Sobre la Renta por Servicios Técnicos/Honorarios Profesionales.",
                  date: new Date("2026-09-03T11:00:00Z"),
                },
              ]
            : []),
        ];

        for (const item of seedData) {
          try {
            const created = await db.taxRetention.create({
              data: item,
            });

            // Post accounting journal entry for seed
            try {
              const vendor = vendors.find((v: any) => v.id === item.providerId);
              const journal = await postTaxRetentionEntry({
                retentionNumber: item.retentionNumber,
                providerName: vendor?.name || "Proveedor Comercial",
                date: item.date.toISOString().split("T")[0],
                retentionAmount: item.retentionAmount,
                retentionType: item.retentionType,
                invoiceNumber: purchaseInvoices[0]?.invoiceNumber,
              });

              if (journal?.id) {
                await db.taxRetention.update({
                  where: { id: created.id },
                  data: { journalEntryId: journal.id },
                });
              }
            } catch (accErr) {
              console.warn("Accounting seed error:", accErr);
            }
          } catch (seedErr) {
            console.warn("Could not insert seed retention:", seedErr);
          }
        }

        retentions = await db.taxRetention.findMany({
          where,
          include: {
            provider: true,
            purchaseInvoice: true,
          },
          orderBy: { date: "desc" },
        });
      }
    }

    return NextResponse.json({ success: true, data: retentions });
  } catch (error: any) {
    console.error("GET /api/tax-retentions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener retenciones",
        debugType: typeof (prisma as any).taxRetention,
        debugKeys: Object.keys(prisma as any).filter((k) => !k.startsWith("$") && !k.startsWith("_")),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const db = prisma as any;
    const body = await req.json();

    const {
      providerId,
      purchaseInvoiceId,
      baseAmount,
      retentionRate,
      retentionType = "ISV_1",
      cai,
      notes,
      date = new Date().toISOString(),
    } = body;

    if (!providerId) {
      return NextResponse.json(
        { success: false, error: "El proveedor es obligatorio para emitir la retención." },
        { status: 400 }
      );
    }

    const numBase = Number(baseAmount);
    const numRate = Number(retentionRate);

    if (isNaN(numBase) || numBase <= 0) {
      return NextResponse.json(
        { success: false, error: "El monto base debe ser un valor mayor a cero." },
        { status: 400 }
      );
    }

    if (isNaN(numRate) || numRate <= 0) {
      return NextResponse.json(
        { success: false, error: "El porcentaje de retención debe ser mayor a cero." },
        { status: 400 }
      );
    }

    // Calculate retention amount
    const retentionAmount =
      body.retentionAmount !== undefined
        ? Math.round(Number(body.retentionAmount) * 100) / 100
        : Math.round(((numBase * numRate) / 100) * 100) / 100;

    // Fetch provider info
    const provider = await db.vendor.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Proveedor no encontrado." },
        { status: 404 }
      );
    }

    // Optional invoice check
    let invoiceNumber: string | undefined = undefined;
    if (purchaseInvoiceId) {
      const inv = await db.purchaseInvoice.findUnique({
        where: { id: purchaseInvoiceId },
      });
      if (inv) {
        invoiceNumber = inv.invoiceNumber;
      }
    }

    // Generate or format correlative retention number
    let retentionNumber = body.retentionNumber?.trim();
    if (!retentionNumber) {
      const year = new Date(date).getFullYear() || new Date().getFullYear();
      const prefix = `RET-${year}-`;
      const lastRetention = await db.taxRetention.findFirst({
        where: { retentionNumber: { startsWith: prefix } },
        orderBy: { retentionNumber: "desc" },
      });

      let nextCorrelative = 1;
      if (lastRetention) {
        const parts = lastRetention.retentionNumber.split("-");
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextCorrelative = lastNum + 1;
        }
      }
      retentionNumber = `${prefix}${String(nextCorrelative).padStart(4, "0")}`;
    } else {
      // Check if custom correlative already exists
      const existing = await db.taxRetention.findUnique({
        where: { retentionNumber },
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `El correlativo de comprobante ${retentionNumber} ya fue emitido previamente.`,
          },
          { status: 400 }
        );
      }
    }

    // 1. Create TaxRetention record
    const retention = await db.taxRetention.create({
      data: {
        retentionNumber,
        providerId,
        purchaseInvoiceId: purchaseInvoiceId || null,
        baseAmount: numBase,
        retentionRate: numRate,
        retentionAmount,
        retentionType,
        status: "ISSUED",
        cai: cai || null,
        notes: notes || null,
        date: new Date(date),
      },
      include: {
        provider: true,
        purchaseInvoice: true,
      },
    });

    // 2. Automatically post Double-Entry Accounting Entry:
    // Débito: 2000 Cuentas por Pagar Proveedores (Disminuye pasivo con proveedor)
    // Crédito: 2160 Retenciones Fiscales por Pagar SAR (Registra pasivo con SAR)
    let journalEntry = null;
    try {
      journalEntry = await postTaxRetentionEntry({
        retentionNumber: retention.retentionNumber,
        providerName: provider.name,
        date: new Date(date).toISOString().split("T")[0],
        retentionAmount,
        retentionType,
        invoiceNumber,
        currency: provider.currency || "USD",
      });

      if (journalEntry?.id) {
        await db.taxRetention.update({
          where: { id: retention.id },
          data: { journalEntryId: journalEntry.id },
        });
        retention.journalEntryId = journalEntry.id;
      }
    } catch (accErr: any) {
      console.error("Error al registrar asiento contable de retención:", accErr);
    }

    return NextResponse.json({
      success: true,
      data: retention,
      journalEntry,
    });
  } catch (error: any) {
    console.error("POST /api/tax-retentions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al emitir comprobante de retención" },
      { status: 500 }
    );
  }
}
