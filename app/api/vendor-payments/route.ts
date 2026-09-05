import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postVendorPaymentEntry } from "@/lib/accounting";

export async function GET(request: NextRequest) {
  try {
    const db = prisma as any;
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase().trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const whereClause: Record<string, unknown> = {};

    if (vendorId && vendorId !== "ALL") {
      whereClause.vendorId = vendorId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (from || to) {
      whereClause.paymentDate = {};
      if (from) (whereClause.paymentDate as any).gte = from;
      if (to) (whereClause.paymentDate as any).lte = to;
    }

    const payments = await db.vendorPayment.findMany({
      where: whereClause,
      include: {
        lines: {
          include: {
            purchaseInvoice: true,
          },
        },
        vendor: true,
        bankAccount: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let filtered = payments;
    if (search) {
      filtered = payments.filter((p: any) =>
        p.paymentNumber.toLowerCase().includes(search) ||
        p.vendorName.toLowerCase().includes(search) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(search)) ||
        p.lines.some((l: any) => l.invoiceNumber.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error("GET /api/vendor-payments error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener pagos a proveedores" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = prisma as any;
    const body = await request.json();

    const {
      vendorId,
      vendorName,
      paymentDate,
      paymentMethod,
      referenceNumber,
      bankAccountId,
      paidAccount,
      currency = "USD",
      amount,
      notes,
      lines,
    } = body;

    // 1. Basic Validations
    if (!vendorName || !vendorName.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre del proveedor es obligatorio." },
        { status: 400 }
      );
    }

    const totalAmount = Number(amount);
    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "El monto del pago debe ser mayor a 0." },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      return NextResponse.json(
        { success: false, error: "La fecha del pago es obligatoria." },
        { status: 400 }
      );
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debe incluir al menos una factura para aplicar el pago." },
        { status: 400 }
      );
    }

    // Filter valid lines with positive amount paid
    const validLines = lines.filter((l: any) => Number(l.amountPaid) > 0);
    if (validLines.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debe abonar un monto mayor a cero en al menos una factura." },
        { status: 400 }
      );
    }

    // 2. Generate unique payment correlative PAG-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await db.vendorPayment.count();
    const nextCorrelative = String(countThisYear + 1).padStart(4, "0");
    const paymentNumber = `PAG-${currentYear}-${nextCorrelative}`;

    // 3. Look up Bank Account details if provided
    let bankAccountInfo: any = null;
    if (bankAccountId) {
      bankAccountInfo = await db.bankAccount.findUnique({
        where: { id: bankAccountId },
        include: { account: true },
      });
    }

    // 4. Create VendorPayment and Lines in a transaction or sequential operations
    const newPayment = await db.vendorPayment.create({
      data: {
        paymentNumber,
        vendorId: vendorId || null,
        vendorName: vendorName.trim(),
        paymentDate,
        paymentMethod: paymentMethod || "Transferencia Bancaria",
        referenceNumber: referenceNumber || null,
        bankAccountId: bankAccountId || null,
        paidAccount: paidAccount || (bankAccountInfo ? bankAccountInfo.name : "1100 - Bancos Nacionales"),
        currency: currency || "USD",
        amount: totalAmount,
        notes: notes || null,
        status: "APLICADO",
        lines: {
          create: validLines.map((l: any) => ({
            purchaseInvoiceId: l.purchaseInvoiceId || null,
            invoiceNumber: l.invoiceNumber,
            originalAmount: Number(l.originalAmount) || 0,
            balanceBefore: Number(l.balanceBefore) || 0,
            amountPaid: Number(l.amountPaid) || 0,
            balanceRemaining: Math.max(0, (Number(l.balanceBefore) || 0) - (Number(l.amountPaid) || 0)),
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    // 5. Update PurchaseInvoice paymentStatus for each invoice paid
    for (const line of validLines) {
      if (line.purchaseInvoiceId || line.invoiceNumber) {
        const inv = line.purchaseInvoiceId
          ? await db.purchaseInvoice.findUnique({ where: { id: line.purchaseInvoiceId } })
          : await db.purchaseInvoice.findUnique({ where: { invoiceNumber: line.invoiceNumber } });

        if (inv) {
          // Calculate all active payments applied to this invoice
          const allPaymentLines = await db.vendorPaymentLine.findMany({
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

          const totalPaidSoFar = allPaymentLines.reduce(
            (acc: number, item: any) => acc + (Number(item.amountPaid) || 0),
            0
          );

          // Check retentions applied
          const retentions = await db.taxRetention.findMany({
            where: {
              OR: [
                { purchaseInvoiceId: inv.id },
              ],
              status: "ISSUED",
            },
          });
          const totalRetention = retentions.reduce(
            (acc: number, r: any) => acc + (Number(r.retentionAmount) || 0),
            0
          );

          const netDue = (Number(inv.total) || 0) - totalRetention;
          const remainingDue = netDue - totalPaidSoFar;

          let newStatus = "PENDIENTE";
          if (remainingDue <= 0.01) {
            newStatus = "PAGADA";
          } else if (totalPaidSoFar > 0) {
            newStatus = "PARCIAL";
          }

          await db.purchaseInvoice.update({
            where: { id: inv.id },
            data: { paymentStatus: newStatus },
          });
        }
      }
    }

    // 6. Deduct from BankAccount book balance if linked
    if (bankAccountId && bankAccountInfo) {
      await db.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          bookBalance: {
            decrement: totalAmount,
          },
        },
      });
    }

    // 7. Automatic Accounting Entry
    let journalEntry = null;
    try {
      journalEntry = await postVendorPaymentEntry({
        date: paymentDate,
        vendorName,
        amount: totalAmount,
        paymentNumber,
        referenceNumber,
        currency,
        bankAccountCode: bankAccountInfo?.account?.code || "1100",
        bankAccountName: bankAccountInfo?.name || "Bancos Nacionales (Cuenta de Cheques)",
      });

      if (journalEntry?.id) {
        await db.vendorPayment.update({
          where: { id: newPayment.id },
          data: { journalEntryId: journalEntry.id },
        });
      }
    } catch (accErr: any) {
      console.warn("Accounting entry posting error (non-fatal):", accErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newPayment,
        journalEntryId: journalEntry?.id || null,
      },
      message: `Pago ${paymentNumber} registrado con éxito.`,
    });
  } catch (error: any) {
    console.error("POST /api/vendor-payments error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar el pago a proveedor." },
      { status: 500 }
    );
  }
}
