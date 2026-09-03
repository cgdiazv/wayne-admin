import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const seedSalesReps = [
  {
    id: "vend-1",
    code: "VEND-001",
    name: "Carlos Roberto Mendoza",
    email: "cmendoza@waynetrademarkhn.com",
    phone: "+504 9988-1234",
    zone: "San Pedro Sula / Zona Norte",
    commissionRate: 5.0,
    commissionType: "PERCENTAGE",
    monthlyTarget: 55000.0,
    status: "ACTIVO",
    notes: "Atiende clientes clave de maquilas en Zip Búfalo y Zip San José.",
  },
  {
    id: "vend-2",
    code: "VEND-002",
    name: "María José Alvarado",
    email: "malvarado@waynetrademarkhn.com",
    phone: "+504 9876-5432",
    zone: "Tegucigalpa / Zona Central",
    commissionRate: 6.0,
    commissionType: "TIERED",
    monthlyTarget: 45000.0,
    status: "ACTIVO",
    notes: "Especialista en cuentas corporativas de empaque y etiquetas adhesivas.",
  },
  {
    id: "vend-3",
    code: "VEND-003",
    name: "Fernando José Rivera",
    email: "frivera@waynetrademarkhn.com",
    phone: "+504 9555-8899",
    zone: "La Ceiba / Zona Atlántica",
    commissionRate: 4.5,
    commissionType: "PERCENTAGE",
    monthlyTarget: 35000.0,
    status: "ACTIVO",
    notes: "Representante para clientes agroindustriales y empacadoras de mariscos.",
  },
];

export async function GET() {
  try {
    const db = prisma as any;
    let reps = await db.salesRep.findMany({
      include: { commissions: true },
      orderBy: { code: "asc" },
    });

    if (!reps || reps.length === 0) {
      // Seed default sample sales representatives
      for (const r of seedSalesReps) {
        await db.salesRep.create({
          data: {
            id: r.id,
            code: r.code,
            name: r.name,
            email: r.email,
            phone: r.phone,
            zone: r.zone,
            commissionRate: r.commissionRate,
            commissionType: r.commissionType,
            monthlyTarget: r.monthlyTarget,
            status: r.status,
            notes: r.notes,
          },
        });
      }
      reps = await db.salesRep.findMany({
        include: { commissions: true },
        orderBy: { code: "asc" },
      });
    }

    return NextResponse.json({ success: true, data: reps });
  } catch (error: any) {
    console.error("GET /api/sales-reps error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sales representatives" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const db = prisma as any;
    const body = await req.json();

    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, error: "Nombre y Código de Vendedor son obligatorios." },
        { status: 400 }
      );
    }

    const newRep = await db.salesRep.create({
      data: {
        code: body.code,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        zone: body.zone || "San Pedro Sula / Zona Norte",
        commissionRate: Number(body.commissionRate) || 5.0,
        commissionType: body.commissionType || "PERCENTAGE",
        monthlyTarget: Number(body.monthlyTarget) || 50000.0,
        status: body.status || "ACTIVO",
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: newRep });
  } catch (error: any) {
    console.error("POST /api/sales-reps error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create sales representative" },
      { status: 500 }
    );
  }
}
