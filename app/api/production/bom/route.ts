import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Listar todas las recetas (BOMs) con sus materias primas
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    const where: any = {};
    if (activeOnly) {
      where.active = true;
    }

    const boms = await (prisma as any).billOfMaterials.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: boms });
  } catch (error: any) {
    console.error("Error al obtener BOMs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener recetas de fabricación" },
      { status: 500 }
    );
  }
}

// POST: Crear una nueva receta / BOM
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      name,
      productId,
      productSku,
      productName,
      outputQuantity = 1,
      unitOfMeasure = "UND",
      laborCost = 0,
      overheadCost = 0,
      notes = "",
      items = [],
    } = body;

    if (!code || !name || !productSku) {
      return NextResponse.json(
        { success: false, error: "El código, nombre y producto terminado son obligatorios." },
        { status: 400 }
      );
    }

    // Verificar si el código ya existe
    const existing = await (prisma as any).billOfMaterials.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Ya existe una receta con el código ${code}.` },
        { status: 400 }
      );
    }

    const newBom = await (prisma as any).billOfMaterials.create({
      data: {
        code,
        name,
        productId: productId || null,
        productSku,
        productName: productName || productSku,
        outputQuantity: Number(outputQuantity) || 1,
        unitOfMeasure: unitOfMeasure || "UND",
        laborCost: Number(laborCost) || 0,
        overheadCost: Number(overheadCost) || 0,
        notes,
        items: {
          create: (items || []).map((it: any) => ({
            rawMaterialId: it.rawMaterialId || null,
            rawMaterialSku: it.rawMaterialSku || "",
            description: it.description || "",
            quantity: Number(it.quantity) || 1,
            unitCost: Number(it.unitCost) || 0,
            totalCost: (Number(it.quantity) || 1) * (Number(it.unitCost) || 0),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ success: true, data: newBom });
  } catch (error: any) {
    console.error("Error al crear BOM:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear receta de fabricación" },
      { status: 500 }
    );
  }
}
