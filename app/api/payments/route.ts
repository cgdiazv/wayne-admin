import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: payments });
  } catch (error: unknown) {
    console.error("GET /api/payments error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerEmail,
      sendLater,
      paymentDate,
      paymentMethod,
      referenceNumber,
      depositAccount,
      amount,
      note,
    } = body;

    if (!customerName || !amount || !paymentDate || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: "Cliente, fecha, método e importe son requeridos." },
        { status: 400 }
      );
    }

    const newPayment = await prisma.payment.create({
      data: {
        customerId: customerId || null,
        customerName,
        customerEmail: customerEmail || null,
        sendLater: Boolean(sendLater),
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber || null,
        depositAccount: depositAccount || "Cash and cash equivalents",
        amount: parseFloat(amount) || 0,
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, data: newPayment });
  } catch (error: unknown) {
    console.error("POST /api/payments error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
