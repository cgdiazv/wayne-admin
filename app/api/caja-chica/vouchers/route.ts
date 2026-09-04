import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fundId = searchParams.get("fundId");

    const where: any = {};
    if (fundId) where.fundId = fundId;

    const rawVouchers = await prisma.pettyCashVoucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const mapped = rawVouchers.map((v: any) => ({
      ...v,
      beneficiary: v.employeeName,
      concept: v.purpose,
      expectedLiquidationDate: v.dueDate,
      status: v.status === "PENDIENTE" ? "ACTIVE" : v.status,
    }));

    return NextResponse.json({ success: true, vouchers: mapped, data: mapped });
  } catch (error: any) {
    console.error("Error fetching vouchers:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      id,
      voucherId,
      fundId,
      employeeName,
      beneficiary,
      amount,
      issueDate,
      dueDate,
      expectedLiquidationDate,
      purpose,
      concept,
      notes,
      actualExpense,
      returnedCash,
      receiptNumber,
    } = body;

    const isLiquidate = action?.toLowerCase() === "liquidate";
    const targetVoucherId = id || voucherId;

    // Handle Liquidate Action
    if (isLiquidate && targetVoucherId) {
      const existing = await prisma.pettyCashVoucher.findUnique({ where: { id: targetVoucherId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "Vale no encontrado" }, { status: 404 });
      }

      const noteText = notes || (receiptNumber ? `Liquidado con factura #${receiptNumber}` : "Liquidado conforme");

      const [updated] = await prisma.$transaction([
        prisma.pettyCashVoucher.update({
          where: { id: targetVoucherId },
          data: {
            status: "LIQUIDADO",
            notes: noteText,
          },
        }),
        ...(actualExpense && parseFloat(actualExpense) > 0
          ? [
              prisma.pettyCashTransaction.create({
                data: {
                  fundId: existing.fundId,
                  date: new Date().toISOString().split("T")[0],
                  type: "EGRESO",
                  concept: `Liquidación Vale ${existing.voucherNumber}: ${existing.purpose}`,
                  category: "Liquidación de Vales",
                  beneficiary: existing.employeeName,
                  voucherNumber: existing.voucherNumber,
                  amount: parseFloat(actualExpense),
                  taxDeductible: true,
                  status: "REGISTRADO",
                  notes: receiptNumber ? `Factura de respaldo: ${receiptNumber}` : null,
                },
              }),
            ]
          : []),
      ]);

      const mapped = {
        ...updated,
        beneficiary: updated.employeeName,
        concept: updated.purpose,
        expectedLiquidationDate: updated.dueDate,
        status: "LIQUIDADO",
      };
      return NextResponse.json({ success: true, voucher: mapped, data: mapped });
    }

    // Handle Create Voucher
    const recipient = employeeName || beneficiary;
    const desc = purpose || concept;
    if (!fundId || !recipient || !amount) {
      return NextResponse.json(
        { success: false, error: "Fondo, empleado/beneficiario y monto son requeridos." },
        { status: 400 }
      );
    }

    const count = await prisma.pettyCashVoucher.count();
    const voucherNumber = `VALE-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const voucher = await prisma.pettyCashVoucher.create({
      data: {
        fundId,
        voucherNumber,
        employeeName: recipient,
        amount: parseFloat(amount) || 0,
        issueDate: issueDate || new Date().toISOString().split("T")[0],
        dueDate: dueDate || expectedLiquidationDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        purpose: desc || "Anticipo de compra menor",
        status: "PENDIENTE",
        notes: notes || null,
      },
    });

    const mapped = {
      ...voucher,
      beneficiary: voucher.employeeName,
      concept: voucher.purpose,
      expectedLiquidationDate: voucher.dueDate,
      status: "ACTIVE",
    };

    return NextResponse.json({ success: true, voucher: mapped, data: mapped });
  } catch (error: any) {
    console.error("Error managing voucher:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
