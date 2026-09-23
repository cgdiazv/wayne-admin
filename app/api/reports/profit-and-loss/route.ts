import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      include: {
        journalLines: {
          select: {
            debit: true,
            credit: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const companySettings = await prisma.companySettings.findUnique({
      where: { id: "default" },
    });

    // Helper to compute net balance
    const computeBalance = (acc: any) => {
      const totalDebit = acc.journalLines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
      const totalCredit = acc.journalLines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);
      const manualBalance = Number(acc.balance) || 0;
      
      const t = (acc.type || "").toLowerCase();
      if (t.includes("income") || t.includes("ingreso") || acc.code.startsWith("4")) {
        const lineNet = totalCredit - totalDebit;
        return lineNet !== 0 ? lineNet : manualBalance;
      } else if (t.includes("expense") || t.includes("gasto") || acc.code.startsWith("5") || acc.code.startsWith("6")) {
        const lineNet = totalDebit - totalCredit;
        return lineNet !== 0 ? lineNet : manualBalance;
      }
      return manualBalance;
    };

    const ingresosList: any[] = [];
    const costoVentasList: any[] = [];
    const gastosOperativosList: any[] = [];
    const otrosGastosList: any[] = [];

    for (const acc of accounts) {
      const code = acc.code || "";
      const type = (acc.type || "").toLowerCase();
      const name = (acc.name || "").toLowerCase();
      const balance = computeBalance(acc);

      // Ingresos (4xxx or type Income)
      if (code.startsWith("4") || type.includes("income") || type.includes("ingreso") || name.includes("ventas") || name.includes("ingreso")) {
        if (!code.startsWith("5") && !code.startsWith("6")) {
          ingresosList.push({
            id: acc.id,
            code: acc.code,
            name: acc.name,
            amount: balance,
          });
          continue;
        }
      }

      // Costo de Ventas (5xxx or COGS)
      if (code.startsWith("5") || type.includes("cost") || name.includes("costo") || name.includes("cogs")) {
        costoVentasList.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: balance,
        });
        continue;
      }

      // Gastos Operativos (6xxx or Expense)
      if (code.startsWith("6") || type.includes("expense") || type.includes("gasto")) {
        gastosOperativosList.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: balance,
        });
        continue;
      }

      // Otros ingresos o gastos (7xxx)
      if (code.startsWith("7")) {
        otrosGastosList.push({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          amount: balance,
        });
      }
    }

    const totalIngresos = ingresosList.reduce((sum, item) => sum + item.amount, 0);
    const totalCostoVentas = costoVentasList.reduce((sum, item) => sum + item.amount, 0);
    const utilidadBruta = totalIngresos - totalCostoVentas;
    const margenBrutoPct = totalIngresos > 0 ? (utilidadBruta / totalIngresos) * 100 : 0;

    const totalGastosOperativos = gastosOperativosList.reduce((sum, item) => sum + item.amount, 0);
    const utilidadOperativa = utilidadBruta - totalGastosOperativos;

    const totalOtros = otrosGastosList.reduce((sum, item) => sum + item.amount, 0);
    const utilidadNeta = utilidadOperativa - totalOtros;
    const margenNetoPct = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        periodo: "Año 2026 (Ejercicio Fiscal Actual)",
        fechaCorte: new Date().toISOString().split("T")[0],
        moneda: companySettings?.monedaPrincipal || "USD ($) Dólar estadounidense",
        empresa: {
          nombreLegal: companySettings?.nombreLegal || "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
          taxId: companySettings?.taxId || "05019008183490",
          domicilioLegal: companySettings?.domicilioLegal || "Zip Búfalo Edificio 1B, Villanueva, Cortés 21101",
        },
        resumen: {
          totalIngresos,
          totalCostoVentas,
          utilidadBruta,
          margenBrutoPct,
          totalGastosOperativos,
          utilidadOperativa,
          totalOtros,
          utilidadNeta,
          margenNetoPct,
        },
        grupos: [
          {
            titulo: "Ingresos Operacionales (Ventas y Servicios)",
            categoria: "INGRESOS",
            total: totalIngresos,
            cuentas: ingresosList,
          },
          {
            titulo: "Costo de Ventas (COGS)",
            categoria: "COSTO_VENTAS",
            total: totalCostoVentas,
            cuentas: costoVentasList,
          },
          {
            titulo: "Gastos Operativos (Administración y Ventas)",
            categoria: "GASTOS_OPERATIVOS",
            total: totalGastosOperativos,
            cuentas: gastosOperativosList,
          },
          {
            titulo: "Otros Ingresos y Gastos Financieros",
            categoria: "OTROS",
            total: totalOtros,
            cuentas: otrosGastosList,
          },
        ],
      },
    });
  } catch (error: any) {
    console.error("Error generating Profit & Loss report:", error);
    return NextResponse.json(
      { success: false, error: "Error al generar el Estado de Pérdidas y Ganancias" },
      { status: 500 }
    );
  }
}
