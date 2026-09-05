import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INITIAL_PURCHASE_ORDERS = [
  {
    orderNumber: "OC-2026-084",
    vendorName: "Insumos Flexográficos S.A.",
    vendorEmail: "compras@insumosflexo.hn",
    vendorAddress: "Zona Industrial San José, San Pedro Sula",
    category: "Tintas Flexo",
    issueDate: "2026-09-02",
    expectedDate: "2026-09-18",
    paymentTerms: "Crédito 30 días",
    currency: "USD",
    subtotal: 5608.70,
    tax: 841.30,
    total: 6450.00,
    status: "Aprobada",
    notes: "Entregar en almacén central de materias primas con certificado de análisis de pigmento.",
    items: [
      {
        productName: "Tinta Flexográfica Cyan Pro - Tambor 200L",
        sku: "TINT-FLX-CYN-200",
        description: "Tinta base agua para impresión en corrugado",
        quantity: 2,
        unitCost: 1850.00,
        totalCost: 3700.00,
      },
      {
        productName: "Tinta Flexográfica Amarillo Real - Tambor 200L",
        sku: "TINT-FLX-YEL-200",
        description: "Tinta de alta resistencia lumínica",
        quantity: 1,
        unitCost: 1908.70,
        totalCost: 1908.70,
      },
    ],
  },
  {
    orderNumber: "OC-2026-083",
    vendorName: "Papelera Hondureña",
    vendorEmail: "ventas@papelerahondurena.hn",
    vendorAddress: "Villanueva, Cortés",
    category: "Cartón Corrugado",
    issueDate: "2026-08-30",
    expectedDate: "2026-09-10",
    paymentTerms: "Crédito 30 días",
    currency: "USD",
    subtotal: 12347.83,
    tax: 1852.17,
    total: 14200.00,
    status: "Recibida",
    notes: "Recepción en planta Búfalo, lote verificado en control de calidad.",
    items: [
      {
        productName: "Bobina Papel Kraft Liner 150g - 1.80m",
        sku: "PAP-KRF-150-180",
        description: "Materia prima principal para fabricación de lámina",
        quantity: 10,
        unitCost: 1234.78,
        totalCost: 12347.80,
      },
    ],
  },
  {
    orderNumber: "OC-2026-082",
    vendorName: "Químicos Industriales S.A.",
    vendorEmail: "pedidos@quimicosindustriales.hn",
    vendorAddress: "Choloma, Cortés",
    category: "Solventes",
    issueDate: "2026-08-25",
    expectedDate: "2026-09-08",
    paymentTerms: "Crédito 15 días",
    currency: "USD",
    subtotal: 2765.22,
    tax: 414.78,
    total: 3180.00,
    status: "Pendiente",
    notes: "Solventes de limpieza para anilox y cilindros de impresión.",
    items: [
      {
        productName: "Solvente Lavador de Anilox Grado Industrial",
        sku: "SOLV-ANX-50G",
        description: "Desincrustante para resinas flexo",
        quantity: 4,
        unitCost: 691.30,
        totalCost: 2765.20,
      },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    const db = prisma as any;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const status = searchParams.get("status");
    const vendorId = searchParams.get("vendorId");
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Check count and seed initial standard data if empty
    const count = await db.purchaseOrder.count();
    if (count === 0) {
      for (const po of INITIAL_PURCHASE_ORDERS) {
        const { items, ...orderData } = po;
        await db.purchaseOrder.create({
          data: {
            ...orderData,
            items: {
              create: items,
            },
          },
        });
      }
    }

    const whereClause: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (vendorId && vendorId !== "ALL") {
      whereClause.vendorId = vendorId;
    }

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    if (from || to) {
      whereClause.issueDate = {};
      if (from) (whereClause.issueDate as any).gte = from;
      if (to) (whereClause.issueDate as any).lte = to;
    }

    const orders = await db.purchaseOrder.findMany({
      where: whereClause,
      include: {
        items: true,
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let filtered = orders;
    if (search) {
      filtered = orders.filter((o: any) =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.vendorName.toLowerCase().includes(search) ||
        (o.category && o.category.toLowerCase().includes(search)) ||
        o.items.some((it: any) =>
          it.productName.toLowerCase().includes(search) ||
          (it.sku && it.sku.toLowerCase().includes(search))
        )
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error("GET /api/purchase-orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener órdenes de compra" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = prisma as any;
    const body = await request.json();

    const {
      orderNumber: inputOrderNumber,
      vendorId,
      vendorName,
      vendorEmail,
      vendorAddress,
      category = "General",
      issueDate = new Date().toISOString().split("T")[0],
      expectedDate,
      paymentTerms = "Crédito 30 días",
      currency = "USD",
      status = "Pendiente",
      notes,
      items = [],
    } = body;

    if (!vendorName || !vendorName.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre del proveedor es obligatorio." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debe incluir al menos un ítem o producto en la orden de compra." },
        { status: 400 }
      );
    }

    // Generate unique order number if not provided or format correctly
    let finalOrderNumber = inputOrderNumber?.trim();
    if (!finalOrderNumber) {
      const currentYear = new Date().getFullYear();
      const countThisYear = await db.purchaseOrder.count();
      const nextNum = String(countThisYear + 1).padStart(4, "0");
      finalOrderNumber = `OC-${currentYear}-${nextNum}`;
    }

    // Check uniqueness
    const existing = await db.purchaseOrder.findUnique({
      where: { orderNumber: finalOrderNumber },
    });
    if (existing) {
      // If already exists, append random suffix
      finalOrderNumber = `${finalOrderNumber}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Calculate totals
    let subtotal = 0;
    const mappedItems = items.map((it: any) => {
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

    const newOrder = await db.purchaseOrder.create({
      data: {
        orderNumber: finalOrderNumber,
        vendorId: vendorId || null,
        vendorName: vendorName.trim(),
        vendorEmail: vendorEmail || null,
        vendorAddress: vendorAddress || null,
        category,
        issueDate,
        expectedDate: expectedDate || null,
        paymentTerms,
        currency,
        subtotal,
        tax,
        total,
        status,
        notes: notes || null,
        items: {
          create: mappedItems,
        },
      },
      include: {
        items: true,
        vendor: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: newOrder,
      message: `Orden de compra ${finalOrderNumber} creada exitosamente.`,
    });
  } catch (error: any) {
    console.error("POST /api/purchase-orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la orden de compra" },
      { status: 500 }
    );
  }
}
