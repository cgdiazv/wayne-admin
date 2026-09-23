import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const seedEstimates = [
  {
    estimateNumber: "EST-2026-0001",
    title: "Estimación Tiraje Cajas Corrugadas Cervecería 24pk",
    customerName: "Cervecería Hondureña S.A.",
    customerRtn: "05019001234567",
    customerEmail: "compras@cerveceria.hn",
    customerPhone: "+504 2550-1000",
    date: "2026-09-18",
    validUntil: "2026-10-18",
    currency: "USD",
    status: "APROBADA",
    productId: null,
    productSku: "BOX-MST-024",
    productName: "Cajas Corrugadas Master Box Cerveza 24pk",
    targetQuantity: 5000,
    unitOfMeasure: "MILLAR",
    materialCost: 4500.0,
    laborCost: 650.0,
    overheadCost: 350.0,
    totalEstimatedCost: 5500.0,
    unitCost: 1.10,
    marginPercent: 35.0,
    suggestedPrice: 7425.0,
    taxRate: 15.0,
    tax: 1113.75,
    totalAmount: 8538.75,
    incomeAccountCode: "4100",
    incomeAccountName: "Ventas / Ingresos de Manufactura",
    costAccountCode: "5100",
    costAccountName: "Costo de Ventas y Fabricación",
    inventoryAccountCode: "1105",
    inventoryAccountName: "Inventario en Proceso / Terminado",
    notes: "Estimación técnica basada en corrida de 5,000 unidades con cartón corrugado flauta B y 4 tintas flexo.",
    items: [
      {
        rawMaterialSku: "MAT-FLX-01",
        description: "Lámina Cartón Corrugado Doble Corrugado 350g",
        quantity: 5200,
        unitCost: 0.65,
        totalCost: 3380.0,
      },
      {
        rawMaterialSku: "TIN-FLEX-001",
        description: "Tinta Flexográfica Cyan Pro Alta Viscosidad",
        quantity: 4,
        unitCost: 180.0,
        totalCost: 720.0,
      },
      {
        rawMaterialSku: "SOLV-ANX-50G",
        description: "Solvente y Barniz de Secado UV",
        quantity: 2,
        unitCost: 200.0,
        totalCost: 400.0,
      },
    ],
  },
  {
    estimateNumber: "EST-2026-0002",
    title: "Estimación Bobinas Adhesivas BOPP Pepsi 2L",
    customerName: "Embotelladora de Sula S.A. (Pepsi)",
    customerRtn: "05019002345678",
    customerEmail: "pagos@emsula.hn",
    customerPhone: "+504 2545-2000",
    date: "2026-09-20",
    validUntil: "2026-10-20",
    currency: "USD",
    status: "BORRADOR",
    productId: null,
    productSku: "LBL-BOPP-2L",
    productName: "Etiquetas Adhesivas BOPP Pepsi 2L",
    targetQuantity: 100,
    unitOfMeasure: "BOBINA",
    materialCost: 2800.0,
    laborCost: 450.0,
    overheadCost: 250.0,
    totalEstimatedCost: 3500.0,
    unitCost: 35.0,
    marginPercent: 30.0,
    suggestedPrice: 4550.0,
    taxRate: 15.0,
    tax: 682.5,
    totalAmount: 5232.5,
    incomeAccountCode: "4100",
    incomeAccountName: "Ventas / Ingresos de Manufactura",
    costAccountCode: "5100",
    costAccountName: "Costo de Ventas y Fabricación",
    inventoryAccountCode: "1105",
    inventoryAccountName: "Inventario en Proceso / Terminado",
    notes: "Estimación en evaluación preliminar. Rendimiento estimado: 1,500 etiquetas por bobina.",
    items: [
      {
        rawMaterialSku: "LAM-POL-050",
        description: "Bobina Polietileno 50um Transparente",
        quantity: 12,
        unitCost: 180.0,
        totalCost: 2160.0,
      },
      {
        rawMaterialSku: "TIN-FLEX-001",
        description: "Tinta Azul Royal y Rojo Pro Flexo",
        quantity: 3,
        unitCost: 213.33,
        totalCost: 640.0,
      },
    ],
  },
];

export async function GET(req: NextRequest) {
  try {
    const db = prisma as any;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase().trim();

    // Check count and seed if empty
    const count = await db.estimate.count();
    if (count === 0) {
      for (const est of seedEstimates) {
        const { items, ...estData } = est;
        await db.estimate.create({
          data: {
            ...estData,
            items: {
              create: items,
            },
          },
        });
      }
    }

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const estimates = await db.estimate.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let filtered = estimates;
    if (search) {
      filtered = estimates.filter((e: any) =>
        e.estimateNumber.toLowerCase().includes(search) ||
        e.title.toLowerCase().includes(search) ||
        e.customerName.toLowerCase().includes(search) ||
        e.productSku.toLowerCase().includes(search) ||
        e.productName.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error("GET /api/estimates error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener estimaciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = prisma as any;
    const body = await req.json();

    const {
      estimateNumber: inputNumber,
      title,
      customerId,
      customerName,
      customerRtn,
      customerEmail,
      customerPhone,
      date = new Date().toISOString().split("T")[0],
      validUntil,
      currency = "USD",
      status = "BORRADOR",
      productId,
      productSku,
      productName,
      targetQuantity = 1,
      unitOfMeasure = "UND",
      laborCost = 0,
      overheadCost = 0,
      marginPercent = 30,
      taxRate = 15,
      incomeAccountId,
      incomeAccountCode = "4100",
      incomeAccountName = "Ventas / Ingresos de Manufactura",
      costAccountId,
      costAccountCode = "5100",
      costAccountName = "Costo de Ventas y Fabricación",
      inventoryAccountId,
      inventoryAccountCode = "1105",
      inventoryAccountName = "Inventario en Proceso / Terminado",
      notes,
      items = [],
    } = body;

    if (!productSku || !productName) {
      return NextResponse.json(
        { success: false, error: "El SKU y nombre del producto a estimar son requeridos." },
        { status: 400 }
      );
    }

    // Auto-generate estimate number if missing
    let finalNumber = inputNumber?.trim();
    if (!finalNumber) {
      const year = new Date().getFullYear();
      const count = await db.estimate.count();
      finalNumber = `EST-${year}-${String(count + 1).padStart(4, "0")}`;
    }

    // Calculate material cost from items
    const materialCost = (items || []).reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0),
      0
    );

    const numLabor = Number(laborCost) || 0;
    const numOverhead = Number(overheadCost) || 0;
    const totalEstimatedCost = materialCost + numLabor + numOverhead;
    const qty = Number(targetQuantity) || 1;
    const unitCost = qty > 0 ? totalEstimatedCost / qty : 0;

    const numMargin = Number(marginPercent) || 0;
    // Suggested price = cost / (1 - margin%) or cost * (1 + margin%)
    const suggestedPrice = Math.round(totalEstimatedCost * (1 + numMargin / 100) * 100) / 100;
    const numTaxRate = Number(taxRate) || 15;
    const tax = Math.round(suggestedPrice * (numTaxRate / 100) * 100) / 100;
    const totalAmount = Math.round((suggestedPrice + tax) * 100) / 100;

    const newEstimate = await db.estimate.create({
      data: {
        estimateNumber: finalNumber,
        title: title || `Estimación de Costos para ${productName}`,
        customerId: customerId || null,
        customerName: customerName || "Cliente General",
        customerRtn: customerRtn || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        date,
        validUntil: validUntil || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
        currency,
        status,
        productId: productId || null,
        productSku,
        productName,
        targetQuantity: qty,
        unitOfMeasure,
        materialCost,
        laborCost: numLabor,
        overheadCost: numOverhead,
        totalEstimatedCost,
        unitCost,
        marginPercent: numMargin,
        suggestedPrice,
        taxRate: numTaxRate,
        tax,
        totalAmount,
        incomeAccountId: incomeAccountId || null,
        incomeAccountCode,
        incomeAccountName,
        costAccountId: costAccountId || null,
        costAccountCode,
        costAccountName,
        inventoryAccountId: inventoryAccountId || null,
        inventoryAccountCode,
        inventoryAccountName,
        notes: notes || null,
        items: {
          create: (items || []).map((it: any) => ({
            rawMaterialId: it.rawMaterialId || null,
            rawMaterialSku: it.rawMaterialSku || "INS-001",
            description: it.description || "",
            quantity: Number(it.quantity) || 1,
            unitCost: Number(it.unitCost) || 0,
            totalCost: (Number(it.quantity) || 1) * (Number(it.unitCost) || 0),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ success: true, data: newEstimate });
  } catch (error: any) {
    console.error("POST /api/estimates error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la estimación" },
      { status: 500 }
    );
  }
}
