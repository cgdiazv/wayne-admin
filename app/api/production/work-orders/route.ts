import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Listar todas las Órdenes de Trabajo con sus componentes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const workOrders = await (prisma as any).workOrder.findMany({
      where,
      include: {
        items: true,
        bom: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: workOrders });
  } catch (error: any) {
    console.error("Error al obtener Work Orders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener órdenes de trabajo" },
      { status: 500 }
    );
  }
}

// POST: Crear una nueva Orden de Trabajo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderNumber,
      bomId,
      productId,
      productSku,
      productName,
      targetQuantity = 1,
      unitOfMeasure = "UND",
      startDate = new Date().toISOString().split("T")[0],
      completionDate,
      supervisor = "Supervisor de Planta",
      productionLine = "Línea Flexografía 1",
      notes = "",
      assignedLotNumber,
      totalLaborCost = 0,
      totalOverheadCost = 0,
      items = [],
    } = body;

    if (!orderNumber || !productSku) {
      return NextResponse.json(
        { success: false, error: "El número de orden y producto terminado son requeridos." },
        { status: 400 }
      );
    }

    // Comprobar orden existente
    const existing = await (prisma as any).workOrder.findUnique({
      where: { orderNumber },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Ya existe la orden de trabajo número ${orderNumber}.` },
        { status: 400 }
      );
    }

    // Calcular costos estimados
    const totalRawCost = (items || []).reduce(
      (sum: number, it: any) => sum + (Number(it.plannedQuantity) || 0) * (Number(it.unitCost) || 0),
      0
    );
    const totalCost = totalRawCost + Number(totalLaborCost || 0) + Number(totalOverheadCost || 0);

    const generatedLot = assignedLotNumber || `LOT-PRD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const newWO = await (prisma as any).workOrder.create({
      data: {
        orderNumber,
        bomId: bomId || null,
        productId: productId || null,
        productSku,
        productName: productName || productSku,
        targetQuantity: Number(targetQuantity) || 1,
        producedQuantity: 0,
        unitOfMeasure: unitOfMeasure || "UND",
        status: "BORRADOR",
        startDate,
        completionDate: completionDate || null,
        supervisor,
        productionLine,
        notes,
        assignedLotNumber: generatedLot,
        totalRawCost,
        totalLaborCost: Number(totalLaborCost) || 0,
        totalOverheadCost: Number(totalOverheadCost) || 0,
        totalCost,
        unitCostFinal: Number(targetQuantity) > 0 ? totalCost / Number(targetQuantity) : 0,
        items: {
          create: (items || []).map((it: any) => ({
            rawMaterialId: it.rawMaterialId || null,
            rawMaterialSku: it.rawMaterialSku || "",
            description: it.description || "",
            plannedQuantity: Number(it.plannedQuantity) || 1,
            consumedQuantity: Number(it.consumedQuantity ?? it.plannedQuantity) || 1,
            unitCost: Number(it.unitCost) || 0,
            totalCost: (Number(it.plannedQuantity) || 1) * (Number(it.unitCost) || 0),
            lotNumber: it.lotNumber || null,
          })),
        },
      },
      include: {
        items: true,
        bom: true,
      },
    });

    return NextResponse.json({ success: true, data: newWO });
  } catch (error: any) {
    console.error("Error al crear Work Order:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la orden de trabajo" },
      { status: 500 }
    );
  }
}
