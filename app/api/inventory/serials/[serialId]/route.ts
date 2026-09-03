import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ serialId: string }>;
};

// PATCH /api/inventory/serials/[serialId] - Edit a serial (status, notes, serialNumber)
export async function PATCH(request: NextRequest, { params }: RouteProps) {
  try {
    const { serialId } = await params;
    const body = await request.json();
    const { serialNumber, status, notes } = body;

    const existingSerial = await prisma.itemSerial.findUnique({
      where: { id: serialId },
    });

    if (!existingSerial) {
      return NextResponse.json(
        { success: false, error: "Serial number not found" },
        { status: 404 }
      );
    }

    if (serialNumber && serialNumber !== existingSerial.serialNumber) {
      const conflict = await prisma.itemSerial.findUnique({
        where: { serialNumber },
      });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: `Serial number '${serialNumber}' already exists` },
          { status: 409 }
        );
      }
    }

    const updatedSerial = await prisma.itemSerial.update({
      where: { id: serialId },
      data: {
        ...(serialNumber !== undefined && { serialNumber: serialNumber.trim() }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Recalculate item available count if trackingType is SERIAL
    const availableCount = await prisma.itemSerial.count({
      where: {
        inventoryItemId: existingSerial.inventoryItemId,
        status: "DISPONIBLE",
      },
    });

    await prisma.inventoryItem.update({
      where: { id: existingSerial.inventoryItemId },
      data: { quantity: availableCount },
    });

    return NextResponse.json({ success: true, data: updatedSerial });
  } catch (error: unknown) {
    console.error("PATCH /api/inventory/serials/[serialId] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/inventory/serials/[serialId] - Delete a serial
export async function DELETE(request: NextRequest, { params }: RouteProps) {
  try {
    const { serialId } = await params;

    const existingSerial = await prisma.itemSerial.findUnique({
      where: { id: serialId },
    });

    if (!existingSerial) {
      return NextResponse.json(
        { success: false, error: "Serial number not found" },
        { status: 404 }
      );
    }

    await prisma.itemSerial.delete({
      where: { id: serialId },
    });

    // Recalculate item available count
    const availableCount = await prisma.itemSerial.count({
      where: {
        inventoryItemId: existingSerial.inventoryItemId,
        status: "DISPONIBLE",
      },
    });

    await prisma.inventoryItem.update({
      where: { id: existingSerial.inventoryItemId },
      data: { quantity: availableCount },
    });

    return NextResponse.json({ success: true, message: "Serial number deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/inventory/serials/[serialId] error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
