import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.bankReconciliation.findFirst({
      where: {
        OR: [{ id }, { reconciliationNumber: id }],
      },
      include: {
        bankAccount: true,
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
        { success: false, error: "Esta conciliación mensual ya se encuentra CERRADA." },
        { status: 400 }
      );
    }

    // Require zero difference unless forced by supervisor with explicit justification
    if (Math.abs(existing.difference) > 0.01 && !body.allowDifference) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede cerrar la conciliación con una diferencia pendiente de $${existing.difference.toFixed(2)} ${existing.bankAccount?.currency || "USD"}. Registre los ajustes necesarios o verifique las partidas cotejadas hasta que la diferencia sea $0.00.`,
        },
        { status: 400 }
      );
    }

    let closedByUser = body.closedBy?.trim();
    if (!closedByUser) {
      const comp = await db.companySettings.findUnique({ where: { id: "default" } }).catch(() => null);
      closedByUser = comp?.contadorNombre?.trim()
        ? `${comp.contadorNombre} (${comp.contadorTitulo || "Contador General"})`
        : "Contador General / Auditor";
    }

    // Update in transaction: lock reconciliation, update bank balances, and mark transactions as reconciled
    const closed = await db.$transaction(async (tx: any) => {
      // 1. Mark cleared transactions in BankTransaction table
      const clearedTxIds = existing.items
        .filter((it: any) => it.isCleared && it.transactionId)
        .map((it: any) => it.transactionId);

      if (clearedTxIds.length > 0) {
        await tx.bankTransaction.updateMany({
          where: { id: { in: clearedTxIds } },
          data: { status: "categorizadas" },
        });
      }

      // 2. Update bank balance to reflect reconciled statement ending balance
      await tx.bankAccount.update({
        where: { id: existing.bankAccountId },
        data: {
          bankBalance: existing.statementEndingBalance,
          lastUpdated: `Conciliado ${existing.period}`,
        },
      });

      // 3. Mark reconciliation as formally closed
      return await tx.bankReconciliation.update({
        where: { id: existing.id },
        data: {
          status: "CERRADA",
          closedAt: new Date(),
          closedBy: closedByUser,
          notes: body.notes ? `${existing.notes || ""}\n${body.notes}`.trim() : existing.notes,
        },
        include: {
          bankAccount: true,
          items: {
            orderBy: { date: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: closed,
      message: `¡Cierre formal de extracto mensual para ${existing.period} ejecutado exitosamente! Registrado por ${closedByUser}.`,
    });
  } catch (error: any) {
    console.error("POST /api/bank-reconciliations/[id]/close error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al ejecutar el cierre formal de la conciliación." },
      { status: 500 }
    );
  }
}
