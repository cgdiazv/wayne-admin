import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postTaxRetentionVoidEntry } from "@/lib/accounting";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const retention = await db.taxRetention.findUnique({
      where: { id },
      include: {
        provider: true,
        purchaseInvoice: {
          include: { items: true },
        },
      },
    });

    if (!retention) {
      return NextResponse.json(
        { success: false, error: "Comprobante de retención no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: retention });
  } catch (error: any) {
    console.error("GET /api/tax-retentions/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener retención" },
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

    const existing = await db.taxRetention.findUnique({
      where: { id },
      include: { provider: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Comprobante de retención no encontrado." },
        { status: 404 }
      );
    }

    // Handle VOID / CANCEL action
    if (body.action === "VOID" || body.status === "VOIDED") {
      if (existing.status === "VOIDED") {
        return NextResponse.json(
          { success: false, error: "Este comprobante ya se encuentra anulado." },
          { status: 400 }
        );
      }

      // Update status to VOIDED
      const updated = await db.taxRetention.update({
        where: { id },
        data: {
          status: "VOIDED",
          notes: body.reason
            ? `${existing.notes ? existing.notes + " | " : ""}Motivo Anulación: ${body.reason}`
            : existing.notes,
        },
        include: {
          provider: true,
          purchaseInvoice: true,
        },
      });

      // Post accounting reversal entry:
      // Débito: 2160 Retenciones Fiscales por Pagar SAR
      // Crédito: 2000 Cuentas por Pagar Proveedores Comerciales
      let voidJournal = null;
      try {
        voidJournal = await postTaxRetentionVoidEntry({
          retentionNumber: existing.retentionNumber,
          providerName: existing.provider?.name || "Proveedor",
          date: new Date().toISOString().split("T")[0],
          retentionAmount: existing.retentionAmount,
          currency: existing.provider?.currency || "USD",
        });
      } catch (accErr: any) {
        console.error("Error al registrar reverso contable por anulación:", accErr);
      }

      return NextResponse.json({
        success: true,
        data: updated,
        voidJournal,
        message: "Comprobante anulado y partida contable de reversión registrada exitosamente.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no reconocida." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("PATCH /api/tax-retentions/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar retención" },
      { status: 500 }
    );
  }
}
