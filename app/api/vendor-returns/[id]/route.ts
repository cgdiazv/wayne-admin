import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const vendorReturn = await (prisma as any).vendorReturn.findUnique({ where: { id }, include: { items: true } });
    if (!vendorReturn) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(vendorReturn);
  } catch (error) { return NextResponse.json({ error: "Error" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const current = await (prisma as any).vendorReturn.findUnique({ where: { id }, include: { items: true } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const wasNotCompleted = current.status !== "COMPLETADA";
    const willBeCompleted = body.status === "COMPLETADA";
    const updated = await (prisma as any).vendorReturn.update({ where: { id }, data: body, include: { items: true } });
    if (wasNotCompleted && willBeCompleted) {
      for (const item of current.items) {
        if (!item.sku) continue;
        const inv = await (prisma as any).inventoryItem.findFirst({ where: { sku: item.sku } });
        if (inv) await (prisma as any).inventoryItem.update({ where: { id: inv.id }, data: { quantity: Math.max(0, (inv.quantity ?? 0) - (item.quantity ?? 0)) } });
      }
    }
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: "Error updating" }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const current = await (prisma as any).vendorReturn.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (current.status !== "BORRADOR") return NextResponse.json({ error: "Solo se pueden eliminar devoluciones en estado BORRADOR." }, { status: 400 });
    await (prisma as any).vendorReturn.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Error deleting" }, { status: 500 }); }
}