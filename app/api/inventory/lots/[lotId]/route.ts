import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ lotId: string }>;
};

// PATCH /api/inventory/lots/[lotId] - Edit a lot
export async function PATCH(request: NextRequest, { params }: RouteProps) {
  try {
    const { lotId } = await params;
    const body = await request.json();
    const { lotNumber, quantity, manufactureDate, expirationDate, notes } = body;

    const existingLot = await prisma.itemLot.findUnique({
      where: { id: lotId },
    });

    if (!existingLot) {
      return NextResponse.json(
        { success: false, error: "Lot not found" },
        { status: 404 }
      );
    }

    const updatedLot = await prisma.itemLot.update({
      where: { id: lotId },
      data: {
        ...(lotNumber !== undefined && { lotNumber: lotNumber.trim() }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(manufactureDate !== undefined && { manufactureDate: manufactureDate ? new Date(manufactureDate) : null }),
        ...(expirationDate !== undefined && { expirationDate: expirationDate ? new Date(expirationDate) : null }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Recalculate item quantity
    const lotsSum = await prisma.itemLot.aggregate({
      where: { inventoryItemId: existingLot.inventoryItemId },
      _sum: { quantity: true },
    });

    await prisma.inventoryItem.update({
      where: { id: existingLot.inventoryItemId },
      data: { quantity: lotsSum._sum.quantity || 0 },
    });

    return NextResponse.json({ success: true, data: updatedLot });
  } catch (error: unknown) {
    console.error("PATCH /api/inventory/lots/[lotId] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/inventory/lots/[lotId] - Delete a lot
export async function DELETE(request: NextRequest, { params }: RouteProps) {
  try {
    const { lotId } = await params;

    const existingLot = await prisma.itemLot.findUnique({
      where: { id: lotId },
    });

    if (!existingLot) {
      return NextResponse.json(
        { success: false, error: "Lot not found" },
        { status: 404 }
      );
    }

    await prisma.itemLot.delete({
      where: { id: lotId },
    });

    // Recalculate item quantity
    const lotsSum = await prisma.itemLot.aggregate({
      where: { inventoryItemId: existingLot.inventoryItemId },
      _sum: { quantity: true },
    });

    await prisma.inventoryItem.update({
      where: { id: existingLot.inventoryItemId },
      data: { quantity: lotsSum._sum.quantity || 0 },
    });

    return NextResponse.json({ success: true, message: "Lot deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/inventory/lots/[lotId] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
