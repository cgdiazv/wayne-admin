import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ id: string }>;
};

// GET /api/inventory/[id]/serials - List serial numbers for item
export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;

    const serials = await prisma.itemSerial.findMany({
      where: { inventoryItemId: id },
      orderBy: { serialNumber: "asc" },
    });

    return NextResponse.json({ success: true, data: serials });
  } catch (error: unknown) {
    console.error("GET /api/inventory/[id]/serials error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/inventory/[id]/serials - Add serial(s) to item
export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { serialNumber, serialNumbers, status, notes } = body;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Inventory item not found" },
        { status: 404 }
      );
    }

    let serialsToAdd: string[] = [];

    if (Array.isArray(serialNumbers) && serialNumbers.length > 0) {
      serialsToAdd = serialNumbers.map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof serialNumber === "string" && serialNumber.trim()) {
      serialsToAdd = serialNumber
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (serialsToAdd.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one valid serial number is required" },
        { status: 400 }
      );
    }

    // Check existing serials to avoid duplicates
    const existingSerials = await prisma.itemSerial.findMany({
      where: { serialNumber: { in: serialsToAdd } },
      select: { serialNumber: true },
    });

    const existingSet = new Set(existingSerials.map((s) => s.serialNumber));
    const newSerials = serialsToAdd.filter((sn) => !existingSet.has(sn));

    if (newSerials.length === 0) {
      return NextResponse.json(
        { success: false, error: "All provided serial numbers already exist" },
        { status: 409 }
      );
    }

    await prisma.itemSerial.createMany({
      data: newSerials.map((sn) => ({
        inventoryItemId: id,
        serialNumber: sn,
        status: status || "DISPONIBLE",
        notes: notes || null,
      })),
    });

    // Recalculate item total quantity based on available serials
    const availableCount = await prisma.itemSerial.count({
      where: {
        inventoryItemId: id,
        status: "DISPONIBLE",
      },
    });

    await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: availableCount, trackingType: "SERIAL" },
    });

    const createdSerials = await prisma.itemSerial.findMany({
      where: { inventoryItemId: id, serialNumber: { in: newSerials } },
    });

    return NextResponse.json(
      {
        success: true,
        data: createdSerials,
        addedCount: newSerials.length,
        skippedCount: serialsToAdd.length - newSerials.length,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/inventory/[id]/serials error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
