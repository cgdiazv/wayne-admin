import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_COMPANY_DATA = {
  id: "default",
  nombre: "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
  direccion: "ZIP Búfalo, Villanueva, Cortés 21100",
  email: "R.mondragon@waynetrademarkhn.com",
  telefono: "+50494522666",
  sitioWeb: "Ninguno indicado",
  sector: "Manufactura y Producción Industrial (Manufacturing)",
  nombreLegal: "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
  taxId: "05019008183490",
  tipoEmpresa: "Sociedad anónima (pequeña empresa) con dos o más propietarios",
  domicilioLegal: "Zip Búfalo Edificio 1B, Villanueva, Cortés 21101",
  emailCliente: "R.mondragon@waynetrademarkhn.com",
  direccionCliente: "Ninguno indicado",
};

// GET /api/company - Retrieve official company settings
export async function GET() {
  try {
    let settings = await prisma.companySettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: DEFAULT_COMPANY_DATA,
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("Error fetching company settings:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener la configuración de la empresa" },
      { status: 500 }
    );
  }
}

// PUT /api/company - Update official company settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const allowedFields = [
      "nombre",
      "direccion",
      "email",
      "telefono",
      "sitioWeb",
      "sector",
      "nombreLegal",
      "taxId",
      "tipoEmpresa",
      "domicilioLegal",
      "emailCliente",
      "direccionCliente",
      "logoUrl",
    ];

    const updateData: Record<string, string | null> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const settings = await prisma.companySettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        ...DEFAULT_COMPANY_DATA,
        ...updateData,
      },
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("Error updating company settings:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar la configuración de la empresa" },
      { status: 500 }
    );
  }
}
