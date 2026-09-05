import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const rec = await db.bankReconciliation.findFirst({
      where: {
        OR: [{ id }, { reconciliationNumber: id }],
      },
      include: {
        bankAccount: true,
        items: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!rec) {
      return NextResponse.json(
        { success: false, error: "Conciliación bancaria no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rec });
  } catch (error: any) {
    console.error("GET /api/bank-reconciliations/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener la conciliación." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;
    const body = await req.json();

    const existing = await db.bankReconciliation.findFirst({
      where: {
        OR: [{ id }, { reconciliationNumber: id }],
      },
      include: {
        items: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Conciliación bancaria no encontrada." },
        { status: 404 }
      );
    }

    if (existing.status === "CERRADA") {
      return NextResponse.json(
        { success: false, error: "Esta conciliación ya ha sido formalmente CERRADA y no permite modificaciones." },
        { status: 400 }
      );
    }

    const recId = existing.id;

    // 1. Toggle single item cleared state
    if (body.toggleItemId !== undefined && typeof body.isCleared === "boolean") {
      await db.bankReconciliationItem.update({
        where: { id: body.toggleItemId },
        data: {
          isCleared: body.isCleared,
          clearedAt: body.isCleared ? new Date() : null,
        },
      });
    }

    // 2. Batch toggle items cleared state
    if (Array.isArray(body.batchItemIds) && typeof body.isCleared === "boolean") {
      await db.bankReconciliationItem.updateMany({
        where: {
          id: { in: body.batchItemIds },
          reconciliationId: recId,
        },
        data: {
          isCleared: body.isCleared,
          clearedAt: body.isCleared ? new Date() : null,
        },
      });
    }

    // 3. Add manual adjustment item (e.g. Bank Fee or Interest from statement)
    if (body.newAdjustment) {
      const adj = body.newAdjustment;
      await db.bankReconciliationItem.create({
        data: {
          reconciliationId: recId,
          sourceType: "MANUAL_ADJUSTMENT",
          date: adj.date || existing.statementDate,
          reference: adj.reference || "AJUSTE-EST",
          description: adj.description || "Ajuste por diferencia de extracto",
          payee: adj.payee || (adj.type === "FEE" ? "Comisión Bancaria" : "Intereses Ganados"),
          type: adj.type || "FEE",
          amount: Math.abs(Number(adj.amount)) || 0,
          isCleared: true,
          clearedAt: new Date(),
          notes: adj.notes || "Ajuste directo introducido en conciliación",
        },
      });
    }

    // 4. Update statement balances if requested
    let begBal = existing.statementBeginningBalance;
    let endBal = existing.statementEndingBalance;
    let notesVal = existing.notes;

    if (body.statementBeginningBalance !== undefined) begBal = Number(body.statementBeginningBalance);
    if (body.statementEndingBalance !== undefined) endBal = Number(body.statementEndingBalance);
    if (body.notes !== undefined) notesVal = body.notes;

    // 5. Re-calculate totals from all items in this reconciliation
    const allItems = await db.bankReconciliationItem.findMany({
      where: { reconciliationId: recId },
    });

    let clearedDepAmt = 0;
    let clearedDepCnt = 0;
    let clearedChkAmt = 0;
    let clearedChkCnt = 0;

    allItems.forEach((it: any) => {
      if (it.isCleared) {
        if (it.type === "DEPOSIT" || it.type === "INTEREST") {
          clearedDepAmt += it.amount;
          clearedDepCnt += 1;
        } else {
          clearedChkAmt += it.amount;
          clearedChkCnt += 1;
        }
      }
    });

    const clearedBalance = Math.round((begBal + clearedDepAmt - clearedChkAmt) * 100) / 100;
    const difference = Math.round((endBal - clearedBalance) * 100) / 100;

    const updated = await db.bankReconciliation.update({
      where: { id: recId },
      data: {
        statementBeginningBalance: begBal,
        statementEndingBalance: endBal,
        clearedDepositsCount: clearedDepCnt,
        clearedDepositsAmount: clearedDepAmt,
        clearedChecksCount: clearedChkCnt,
        clearedChecksAmount: clearedChkAmt,
        clearedBalance,
        difference,
        status: difference === 0 ? "CONCILIADA_CUADRADA" : "EN_PROCESO",
        notes: notesVal,
      },
      include: {
        bankAccount: true,
        items: {
          orderBy: { date: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: difference === 0 ? "¡Conciliación cuadrada con diferencia de $0.00!" : "Cotejo actualizado.",
    });
  } catch (error: any) {
    console.error("PATCH /api/bank-reconciliations/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar la conciliación." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const existing = await db.bankReconciliation.findFirst({
      where: {
        OR: [{ id }, { reconciliationNumber: id }],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Conciliación no encontrada." },
        { status: 404 }
      );
    }

    if (existing.status === "CERRADA") {
      return NextResponse.json(
        { success: false, error: "No se puede eliminar una conciliación mensual que ya fue formalmente CERRADA." },
        { status: 400 }
      );
    }

    await db.bankReconciliation.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Conciliación ${existing.reconciliationNumber} eliminada correctamente.`,
    });
  } catch (error: any) {
    console.error("DELETE /api/bank-reconciliations/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar la conciliación." },
      { status: 500 }
    );
  }
}
