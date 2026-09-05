import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;

    const payment = await db.vendorPayment.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            purchaseInvoice: true,
          },
        },
        vendor: true,
        bankAccount: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Pago no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    console.error("GET /api/vendor-payments/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener el pago" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = prisma as any;
    const { id } = await params;
    const body = await request.json();

    const payment = await db.vendorPayment.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Pago no encontrado." },
        { status: 404 }
      );
    }

    // Handle Anulación / Voiding
    if (body.action === "ANULAR" || body.status === "ANULADO") {
      if (payment.status === "ANULADO") {
        return NextResponse.json(
          { success: false, error: "Este pago ya se encuentra anulado." },
          { status: 400 }
        );
      }

      // 1. Mark as ANULADO
      const updatedPayment = await db.vendorPayment.update({
        where: { id },
        data: {
          status: "ANULADO",
          notes: body.reason ? `${payment.notes || ""} [Anulado: ${body.reason}]`.trim() : payment.notes,
        },
      });

      // 2. Re-increment bankAccount book balance if it was deducted
      if (payment.bankAccountId) {
        await db.bankAccount.update({
          where: { id: payment.bankAccountId },
          data: {
            bookBalance: {
              increment: Number(payment.amount) || 0,
            },
          },
        });
      }

      // 3. Mark Journal Entry as ANULADA
      if (payment.journalEntryId) {
        try {
          await db.journalEntry.update({
            where: { id: payment.journalEntryId },
            data: { status: "ANULADA" },
          });
        } catch (jErr) {
          console.warn("Could not void journal entry:", jErr);
        }
      }

      // 4. Recalculate affected purchase invoices
      for (const line of payment.lines) {
        const inv = line.purchaseInvoiceId
          ? await db.purchaseInvoice.findUnique({ where: { id: line.purchaseInvoiceId } })
          : await db.purchaseInvoice.findUnique({ where: { invoiceNumber: line.invoiceNumber } });

        if (inv) {
          // Recalculate active payments excluding this voided one
          const activeLines = await db.vendorPaymentLine.findMany({
            where: {
              OR: [
                { purchaseInvoiceId: inv.id },
                { invoiceNumber: inv.invoiceNumber },
              ],
              vendorPayment: {
                status: "APLICADO",
              },
            },
          });

          const totalPaidRemaining = activeLines.reduce(
            (acc: number, item: any) => acc + (Number(item.amountPaid) || 0),
            0
          );

          const retentions = await db.taxRetention.findMany({
            where: {
              OR: [{ purchaseInvoiceId: inv.id }],
              status: "ISSUED",
            },
          });
          const totalRetention = retentions.reduce(
            (acc: number, r: any) => acc + (Number(r.retentionAmount) || 0),
            0
          );

          const netDue = (Number(inv.total) || 0) - totalRetention;
          const remainingDue = netDue - totalPaidRemaining;

          let newStatus = "PENDIENTE";
          if (remainingDue <= 0.01) {
            newStatus = "PAGADA";
          } else if (totalPaidRemaining > 0) {
            newStatus = "PARCIAL";
          }

          await db.purchaseInvoice.update({
            where: { id: inv.id },
            data: { paymentStatus: newStatus },
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: updatedPayment,
        message: `Pago ${payment.paymentNumber} anulado correctamente. Facturas y saldos bancarios restablecidos.`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no reconocida." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("PATCH /api/vendor-payments/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar el pago" },
      { status: 500 }
    );
  }
}
