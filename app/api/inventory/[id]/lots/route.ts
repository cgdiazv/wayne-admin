import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ id: string }>;
};

// GET /api/inventory/[id]/lots - List lots for item
export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;

    const lots = await prisma.itemLot.findMany({
      where: { inventoryItemId: id },
      orderBy: { expirationDate: "asc" },
    });

    return NextResponse.json({ success: true, data: lots });
  } catch (error: unknown) {
    console.error("GET /api/inventory/[id]/lots error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/inventory/[id]/lots - Add a lot to item
export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { lotNumber, quantity, manufactureDate, expirationDate, notes } = body;

    if (!lotNumber) {
      return NextResponse.json(
        { success: false, error: "lotNumber is required" },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const lot = await prisma.itemLot.create({
      data: {
        inventoryItemId: id,
        lotNumber: lotNumber.trim(),
        quantity: quantity !== undefined ? Number(quantity) : 0,
        manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        notes: notes || null,
      },
    });

    // Recalculate item total quantity from lots
    const lotsSum = await prisma.itemLot.aggregate({
      where: { inventoryItemId: id },
      _sum: { quantity: true },
    });

    const newQuantity = lotsSum._sum.quantity || 0;
    await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: newQuantity, trackingType: "LOT" },
    });

    return NextResponse.json({ success: true, data: lot }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/inventory/[id]/lots error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
