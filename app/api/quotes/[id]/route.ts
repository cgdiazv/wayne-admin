import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lines: true,
        salesInvoice: {
          include: {
            lines: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "Cotización no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: quote });
  } catch (error: unknown) {
    console.error("GET /api/quotes/[id] error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "Cotización no encontrada." },
        { status: 404 }
      );
    }

    if (quote.status === "Facturada") {
      return NextResponse.json(
        {
          success: false,
          error: "No se puede eliminar una cotización que ya fue convertida a Factura.",
        },
        { status: 400 }
      );
    }

    await prisma.quote.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Cotización ${quote.quoteNumber} eliminada correctamente.`,
    });
  } catch (error: unknown) {
    console.error("DELETE /api/quotes/[id] error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
