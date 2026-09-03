import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const returns = await (prisma as any).vendorReturn.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(returns);
  } catch (error) {
    console.error("GET /api/vendor-returns error:", error);
    return NextResponse.json({ error: "Error fetching vendor returns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items = [], ...returnData } = body;

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (item.quantity ?? 0) * (item.unitCost ?? 0),
      0
    );

    const vendorReturn = await (prisma as any).vendorReturn.create({
      data: {
        ...returnData,
        subtotal,
        total: subtotal,
        items: {
          create: items.map((item: any) => ({
            sku: item.sku ?? "",
            description: item.description ?? "",
            quantity: item.quantity ?? 0,
            unitCost: item.unitCost ?? 0,
            totalCost: (item.quantity ?? 0) * (item.unitCost ?? 0),
            lotNumber: item.lotNumber ?? null,
            itemReason: item.itemReason ?? null,
          })),
        },
      },
      include: { items: true },
    });

    // If created directly as COMPLETADA, adjust inventory immediately
    if (returnData.status === "COMPLETADA") {
      for (const item of items) {
        if (!item.sku) continue;
        const invItem = await (prisma as any).inventoryItem.findFirst({
          where: { sku: item.sku },
        });
        if (invItem) {
          await (prisma as any).inventoryItem.update({
            where: { id: invItem.id },
            data: { quantity: Math.max(0, (invItem.quantity ?? 0) - (item.quantity ?? 0)) },
          });
        }
      }
    }

    return NextResponse.json(vendorReturn, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/vendor-returns error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una devolución con ese número." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Error creating vendor return" }, { status: 500 });
  }
}
