import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const seedPurchaseInvoices = [
  {
    id: "pi-1",
    invoiceNumber: "FPROV-2026-089",
    purchaseOrderNumber: "OC-2026-012",
    vendorName: "Sun Chemical Ink Corporation",
    issueDate: "2026-09-01",
    dueDate: "2026-10-01",
    currency: "USD",
    subtotal: 850.0,
    tax: 127.5,
    total: 977.5,
    paymentStatus: "PENDIENTE",
    inventoryStatus: "INGRESADO",
    notes: "Tinta flexográfica de alta viscosidad para impresión de cajas corrugadas.",
    items: [
      {
        sku: "TIN-FLEX-001",
        description: "Tinta Flexográfica Cyan Pro (Tambo 200L)",
        quantity: 2,
        unitCost: 425.0,
        totalCost: 850.0,
        lotNumber: "LOT-TIN-2026-09",
      },
    ],
  },
  {
    id: "pi-2",
    invoiceNumber: "FPROV-2026-104",
    purchaseOrderNumber: "OC-2026-008",
    vendorName: "Empaques Industriales de Honduras",
    issueDate: "2026-08-25",
    dueDate: "2026-09-25",
    currency: "USD",
    subtotal: 3200.0,
    tax: 480.0,
    total: 3680.0,
    paymentStatus: "PAGADA",
    inventoryStatus: "INGRESADO",
    notes: "Laminado de polietileno agrícola 50 micras en rollos.",
    items: [
      {
        sku: "LAM-POL-050",
        description: "Bobina Polietileno 50um Transparente",
        quantity: 10,
        unitCost: 320.0,
        totalCost: 3200.0,
        lotNumber: "LOT-POL-2026-88",
      },
    ],
  },
];

export async function GET() {
  try {
    const db = prisma as any;
    let invoices = await db.purchaseInvoice.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    if (!invoices || invoices.length === 0) {
      for (const inv of seedPurchaseInvoices) {
        await db.purchaseInvoice.create({
          data: {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            purchaseOrderNumber: inv.purchaseOrderNumber,
            vendorName: inv.vendorName,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            currency: inv.currency,
            subtotal: inv.subtotal,
            tax: inv.tax,
            total: inv.total,
            paymentStatus: inv.paymentStatus,
            inventoryStatus: inv.inventoryStatus,
            notes: inv.notes,
            items: {
              create: inv.items.map((it) => ({
                sku: it.sku,
                description: it.description,
                quantity: it.quantity,
                unitCost: it.unitCost,
                totalCost: it.totalCost,
                lotNumber: it.lotNumber,
              })),
            },
          },
        });
      }

      invoices = await db.purchaseInvoice.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error("GET /api/purchase-invoices error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch purchase invoices" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const db = prisma as any;
    const body = await req.json();

    if (!body.invoiceNumber || !body.vendorName) {
      return NextResponse.json(
        { success: false, error: "N° de Factura de Proveedor y Nombre del Proveedor son obligatorios." },
        { status: 400 }
      );
    }

    const items = body.items || [];
    let subtotal = 0;

    items.forEach((it: any) => {
      const qty = Number(it.quantity) || 0;
      const cost = Number(it.unitCost) || 0;
      subtotal += qty * cost;
    });

    const tax = body.tax !== undefined ? Number(body.tax) : subtotal * 0.15;
    const total = subtotal + tax;

    // 1. Create Purchase Invoice
    const newInvoice = await db.purchaseInvoice.create({
      data: {
        invoiceNumber: body.invoiceNumber,
        purchaseOrderNumber: body.purchaseOrderNumber || null,
        vendorId: body.vendorId || null,
        vendorName: body.vendorName,
        issueDate: body.issueDate || new Date().toISOString().split("T")[0],
        dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
        currency: body.currency || "USD",
        subtotal,
        tax,
        total,
        paymentStatus: body.paymentStatus || "PENDIENTE",
        inventoryStatus: "INGRESADO",
        notes: body.notes || null,
        items: {
          create: items.map((it: any) => ({
            sku: it.sku,
            description: it.description || "",
            quantity: Number(it.quantity) || 0,
            unitCost: Number(it.unitCost) || 0,
            totalCost: (Number(it.quantity) || 0) * (Number(it.unitCost) || 0),
            lotNumber: it.lotNumber || null,
          })),
        },
      },
      include: { items: true },
    });

    // 2. AUTOMATICALLY INCREASE INVENTORY STOCK & RECORD LOTS
    for (const item of items) {
      if (!item.sku) continue;
      const qtyToAdd = Number(item.quantity) || 0;
      if (qtyToAdd <= 0) continue;

      // Find inventory item by SKU
      const existingInvItem = await db.inventoryItem.findUnique({
        where: { sku: item.sku },
      });

      if (existingInvItem) {
        // Increase stock quantity & update average cost
        await db.inventoryItem.update({
          where: { id: existingInvItem.id },
          data: {
            quantity: existingInvItem.quantity + qtyToAdd,
            ...(Number(item.unitCost) > 0 && { cost: Number(item.unitCost) }),
          },
        });

        // Create ItemLot record if lotNumber is specified
        if (item.lotNumber && item.lotNumber.trim()) {
          await db.itemLot.create({
            data: {
              inventoryItemId: existingInvItem.id,
              lotNumber: item.lotNumber.trim(),
              quantity: qtyToAdd,
              notes: `Ingreso automático por Factura de Compra ${body.invoiceNumber}`,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: newInvoice });
  } catch (error: any) {
    console.error("POST /api/purchase-invoices error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create purchase invoice" },
      { status: 500 }
    );
  }
}
