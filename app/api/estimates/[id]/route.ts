import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const estimate = await db.estimate.findFirst({
      where: {
        OR: [{ id }, { estimateNumber: id }],
      },
      include: {
        items: true,
      },
    });

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: "Estimación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: estimate });
  } catch (error: any) {
    console.error("GET /api/estimates/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener la estimación" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;
    const body = await req.json();

    const existing = await db.estimate.findFirst({
      where: {
        OR: [{ id }, { estimateNumber: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Estimación no encontrada" },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.workOrderId !== undefined) updateData.workOrderId = body.workOrderId;
    if (body.workOrderNumber !== undefined) updateData.workOrderNumber = body.workOrderNumber;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil;
    if (body.incomeAccountId !== undefined) updateData.incomeAccountId = body.incomeAccountId;
    if (body.incomeAccountCode !== undefined) updateData.incomeAccountCode = body.incomeAccountCode;
    if (body.incomeAccountName !== undefined) updateData.incomeAccountName = body.incomeAccountName;
    if (body.costAccountId !== undefined) updateData.costAccountId = body.costAccountId;
    if (body.costAccountCode !== undefined) updateData.costAccountCode = body.costAccountCode;
    if (body.costAccountName !== undefined) updateData.costAccountName = body.costAccountName;
    if (body.inventoryAccountId !== undefined) updateData.inventoryAccountId = body.inventoryAccountId;
    if (body.inventoryAccountCode !== undefined) updateData.inventoryAccountCode = body.inventoryAccountCode;
    if (body.inventoryAccountName !== undefined) updateData.inventoryAccountName = body.inventoryAccountName;

    // Si se actualizan items o costos
    if (Array.isArray(body.items)) {
      const materialCost = body.items.reduce(
        (sum: number, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0),
        0
      );
      const laborCost = Number(body.laborCost ?? existing.laborCost) || 0;
      const overheadCost = Number(body.overheadCost ?? existing.overheadCost) || 0;
      const totalEstimatedCost = materialCost + laborCost + overheadCost;
      const qty = Number(body.targetQuantity ?? existing.targetQuantity) || 1;
      const unitCost = qty > 0 ? totalEstimatedCost / qty : 0;
      const margin = Number(body.marginPercent ?? existing.marginPercent) || 0;
      const suggestedPrice = Math.round(totalEstimatedCost * (1 + margin / 100) * 100) / 100;
      const taxRate = Number(body.taxRate ?? existing.taxRate) || 15;
      const tax = Math.round(suggestedPrice * (taxRate / 100) * 100) / 100;
      const totalAmount = Math.round((suggestedPrice + tax) * 100) / 100;

      updateData.materialCost = materialCost;
      updateData.laborCost = laborCost;
      updateData.overheadCost = overheadCost;
      updateData.totalEstimatedCost = totalEstimatedCost;
      updateData.unitCost = unitCost;
      updateData.suggestedPrice = suggestedPrice;
      updateData.tax = tax;
      updateData.totalAmount = totalAmount;

      await db.estimateItem.deleteMany({
        where: { estimateId: existing.id },
      });

      updateData.items = {
        create: body.items.map((it: any) => ({
          rawMaterialId: it.rawMaterialId || null,
          rawMaterialSku: it.rawMaterialSku || "INS-001",
          description: it.description || "",
          quantity: Number(it.quantity) || 1,
          unitCost: Number(it.unitCost) || 0,
          totalCost: (Number(it.quantity) || 1) * (Number(it.unitCost) || 0),
        })),
      };
    }

    const updated = await db.estimate.update({
      where: { id: existing.id },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/estimates/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar la estimación" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const existing = await db.estimate.findFirst({
      where: {
        OR: [{ id }, { estimateNumber: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Estimación no encontrada" },
        { status: 404 }
      );
    }

    await db.estimate.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Estimación ${existing.estimateNumber} eliminada correctamente.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/estimates/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar la estimación" },
      { status: 500 }
    );
  }
}
