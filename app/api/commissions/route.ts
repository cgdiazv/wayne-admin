import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const seedCommissions = [
  {
    id: "comm-1",
    salesRepId: "vend-1",
    salesRepName: "Carlos Roberto Mendoza",
    period: "2026-08",
    invoiceNumber: "FAC-2026-004",
    customerName: "Embotelladora de Sula S.A.",
    saleAmount: 18500.0,
    commissionRate: 5.0,
    commissionAmount: 925.0,
    status: "APROBADO",
    paidDate: "2026-08-31",
    notes: "Comisión por venta de cajas corrugadas Búfalo zip.",
  },
  {
    id: "comm-2",
    salesRepId: "vend-1",
    salesRepName: "Carlos Roberto Mendoza",
    period: "2026-09",
    invoiceNumber: "FAC-2026-008",
    customerName: "Gildan Activewear Honduras",
    saleAmount: 24200.0,
    commissionRate: 5.0,
    commissionAmount: 1210.0,
    status: "PENDIENTE",
    paidDate: null,
    notes: "Etiquetas térmicas Zebra e insumos de empaque.",
  },
  {
    id: "comm-3",
    salesRepId: "vend-2",
    salesRepName: "María José Alvarado",
    period: "2026-08",
    invoiceNumber: "FAC-2026-003",
    customerName: "Fruit of the Loom Honduras",
    saleAmount: 31000.0,
    commissionRate: 6.0,
    commissionAmount: 1860.0,
    status: "PAGADO",
    paidDate: "2026-08-25",
    notes: "Comisión escalonada nivel 2 alcanzada.",
  },
  {
    id: "comm-4",
    salesRepId: "vend-3",
    salesRepName: "Fernando José Rivera",
    period: "2026-09",
    invoiceNumber: "FAC-2026-011",
    customerName: "Grupo Jaremar Honduras",
    saleAmount: 12800.0,
    commissionRate: 4.5,
    commissionAmount: 576.0,
    status: "PENDIENTE",
    paidDate: null,
    notes: "Empaque flexible agrícola en La Ceiba.",
  },
];

export async function GET() {
  try {
    const db = prisma as any;
    let comms = await db.commissionRecord.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (!comms || comms.length === 0) {
      // Ensure seed sales reps exist first
      const reps = await db.salesRep.findMany();
      if (reps.length > 0) {
        for (const c of seedCommissions) {
          const matchingRep = reps.find((r: any) => r.code === "VEND-001") || reps[0];
          await db.commissionRecord.create({
            data: {
              id: c.id,
              salesRepId: matchingRep.id,
              salesRepName: matchingRep.name,
              period: c.period,
              invoiceNumber: c.invoiceNumber,
              customerName: c.customerName,
              saleAmount: c.saleAmount,
              commissionRate: c.commissionRate,
              commissionAmount: c.commissionAmount,
              status: c.status,
              paidDate: c.paidDate,
              notes: c.notes,
            },
          });
        }
        comms = await db.commissionRecord.findMany({
          orderBy: { createdAt: "desc" },
        });
      }
    }

    return NextResponse.json({ success: true, data: comms });
  } catch (error: any) {
    console.error("GET /api/commissions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch commission records" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const db = prisma as any;
    const body = await req.json();

    if (!body.salesRepId || !body.saleAmount) {
      return NextResponse.json(
        { success: false, error: "Vendedor y Monto de Venta son obligatorios." },
        { status: 400 }
      );
    }

    const salesRep = await db.salesRep.findUnique({
      where: { id: body.salesRepId },
    });

    if (!salesRep) {
      return NextResponse.json(
        { success: false, error: "Vendedor no encontrado." },
        { status: 404 }
      );
    }

    const rate = Number(body.commissionRate) || salesRep.commissionRate || 5.0;
    const saleAmount = Number(body.saleAmount) || 0;
    const commissionAmount = Number(body.commissionAmount) || (saleAmount * rate) / 100;

    const newComm = await db.commissionRecord.create({
      data: {
        salesRepId: salesRep.id,
        salesRepName: salesRep.name,
        period: body.period || new Date().toISOString().slice(0, 7),
        invoiceNumber: body.invoiceNumber || null,
        customerName: body.customerName || null,
        saleAmount: saleAmount,
        commissionRate: rate,
        commissionAmount: commissionAmount,
        status: body.status || "PENDIENTE",
        paidDate: body.paidDate || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: newComm });
  } catch (error: any) {
    console.error("POST /api/commissions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create commission record" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const db = prisma as any;
    const body = await req.json();

    if (!body.id || !body.status) {
      return NextResponse.json(
        { success: false, error: "ID de comisión y Nuevo Estado son obligatorios." },
        { status: 400 }
      );
    }

    const updated = await db.commissionRecord.update({
      where: { id: body.id },
      data: {
        status: body.status,
        ...(body.status === "PAGADO" && !body.paidDate && { paidDate: new Date().toISOString().split("T")[0] }),
        ...(body.paidDate && { paidDate: body.paidDate }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/commissions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update commission record" },
      { status: 500 }
    );
  }
}
