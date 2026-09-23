import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_REPORT_SETTINGS = {
  id: "default",
  // Encabezado
  headerLogo: false,
  headerPeriod: true,
  headerLegalName: true,
  headerAlignment: "Centro",
  // Pie de página
  footerDate: true,
  footerTime: false,
  footerMethod: true,
  footerAlignment: "Centro",
  // Número y Divisa
  divideBy1000: false,
  hideZeroAmounts: false,
  hideCurrencySymbol: false,
  negativeNumberFormat: "-100",
  negativeInRed: false,
  decimalMode: "decimals",
  decimalPlaces: 2,
  // Formato y Cuadrícula
  gridBorderSetting: "Predeterminado",
  emptyCellFormat: "hyphen",
  expandSubaccounts: true,
  showGroupTotals: true,
  compactView: true,
  wrapText: true,
};

// GET /api/reports/settings - Retrieve saved report customization settings
export async function GET() {
  try {
    let settings = await prisma.reportSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.reportSettings.create({
        data: DEFAULT_REPORT_SETTINGS,
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("Error fetching report settings:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener la configuración de reportes" },
      { status: 500 }
    );
  }
}

// PUT /api/reports/settings - Upsert report customization settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const allowedFields = [
      "headerLogo",
      "headerPeriod",
      "headerLegalName",
      "headerAlignment",
      "footerDate",
      "footerTime",
      "footerMethod",
      "footerAlignment",
      "divideBy1000",
      "hideZeroAmounts",
      "hideCurrencySymbol",
      "negativeNumberFormat",
      "negativeInRed",
      "decimalMode",
      "decimalPlaces",
      "gridBorderSetting",
      "emptyCellFormat",
      "expandSubaccounts",
      "showGroupTotals",
      "compactView",
      "wrapText",
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const settings = await prisma.reportSettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        ...DEFAULT_REPORT_SETTINGS,
        ...updateData,
      },
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("Error updating report settings:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar la configuración de reportes" },
      { status: 500 }
    );
  }
}
