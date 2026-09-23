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

    const computeBalance = (acc: any) => {
      const totalDebit = acc.journalLines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
      const totalCredit = acc.journalLines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);
      const manualBalance = Number(acc.balance) || 0;

      const t = (acc.type || "").toLowerCase();
      if (t.includes("asset") || t.includes("activo") || acc.code.startsWith("1")) {
        const net = totalDebit - totalCredit;
        return net !== 0 ? net : manualBalance;
      } else if (
        t.includes("liability") ||
        t.includes("pasivo") ||
        t.includes("equity") ||
        t.includes("patrimonio") ||
        acc.code.startsWith("2") ||
        acc.code.startsWith("3")
      ) {
        const net = totalCredit - totalDebit;
        return net !== 0 ? net : manualBalance;
      }
      return manualBalance;
    };

    const activoCorriente: any[] = [];
    const activoNoCorriente: any[] = [];
    const pasivoCorriente: any[] = [];
    const pasivoNoCorriente: any[] = [];
    const patrimonioList: any[] = [];

    let totalIngresos = 0;
    let totalCostosGastos = 0;

    for (const acc of accounts) {
      const code = acc.code || "";
      const type = (acc.type || "").toLowerCase();
      const bal = computeBalance(acc);

      // Income calculation for current year retained earnings
      if (code.startsWith("4") || type.includes("income") || type.includes("ingreso")) {
        totalIngresos += bal;
        continue;
      }
      if (code.startsWith("5") || code.startsWith("6") || type.includes("expense") || type.includes("gasto") || type.includes("cost")) {
        totalCostosGastos += bal;
        continue;
      }

      // Assets (1xxx)
      if (code.startsWith("1") || type.includes("asset") || type.includes("activo")) {
        if (code.startsWith("15") || code.startsWith("16") || code.startsWith("17") || type.includes("non-current") || type.includes("fijo")) {
          activoNoCorriente.push({ id: acc.id, code: acc.code, name: acc.name, amount: bal });
        } else {
          activoCorriente.push({ id: acc.id, code: acc.code, name: acc.name, amount: bal });
        }
        continue;
      }

      // Liabilities (2xxx)
      if (code.startsWith("2") || type.includes("liability") || type.includes("pasivo")) {
        if (code.startsWith("25") || code.startsWith("26") || type.includes("long-term")) {
          pasivoNoCorriente.push({ id: acc.id, code: acc.code, name: acc.name, amount: bal });
        } else {
          pasivoCorriente.push({ id: acc.id, code: acc.code, name: acc.name, amount: bal });
        }
        continue;
      }

      // Equity (3xxx)
      if (code.startsWith("3") || type.includes("equity") || type.includes("patrimonio") || type.includes("capital")) {
        patrimonioList.push({ id: acc.id, code: acc.code, name: acc.name, amount: bal });
      }
    }

    const utilidadEjercicioActual = totalIngresos - totalCostosGastos;

    const totalActivoCorriente = activoCorriente.reduce((sum, item) => sum + item.amount, 0);
    const totalActivoNoCorriente = activoNoCorriente.reduce((sum, item) => sum + item.amount, 0);
    const totalActivos = totalActivoCorriente + totalActivoNoCorriente;

    const totalPasivoCorriente = pasivoCorriente.reduce((sum, item) => sum + item.amount, 0);
    const totalPasivoNoCorriente = pasivoNoCorriente.reduce((sum, item) => sum + item.amount, 0);
    const totalPasivos = totalPasivoCorriente + totalPasivoNoCorriente;

    const totalPatrimonioCuentas = patrimonioList.reduce((sum, item) => sum + item.amount, 0);
    const totalPatrimonio = totalPatrimonioCuentas + utilidadEjercicioActual;

    const totalPasivoYPatrimonio = totalPasivos + totalPatrimonio;
    const diferenciaCuadre = Math.abs(totalActivos - totalPasivoYPatrimonio);
    const estaCuadrado = diferenciaCuadre < 0.05;

    return NextResponse.json({
      success: true,
      data: {
        periodo: "Al 31 de Diciembre 2026 (Corte Mensual Acumulado)",
        fechaCorte: new Date().toISOString().split("T")[0],
        moneda: companySettings?.monedaPrincipal || "USD ($) Dólar estadounidense",
        empresa: {
          nombreLegal: companySettings?.nombreLegal || "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
          taxId: companySettings?.taxId || "05019008183490",
          domicilioLegal: companySettings?.domicilioLegal || "Zip Búfalo Edificio 1B, Villanueva, Cortés 21101",
        },
        estaCuadrado,
        diferenciaCuadre,
        resumen: {
          totalActivoCorriente,
          totalActivoNoCorriente,
          totalActivos,
          totalPasivoCorriente,
          totalPasivoNoCorriente,
          totalPasivos,
          totalPatrimonioCuentas,
          utilidadEjercicioActual,
          totalPatrimonio,
          totalPasivoYPatrimonio,
        },
        activos: {
          corriente: activoCorriente,
          noCorriente: activoNoCorriente,
          totalCorriente: totalActivoCorriente,
          totalNoCorriente: totalActivoNoCorriente,
          total: totalActivos,
        },
        pasivos: {
          corriente: pasivoCorriente,
          noCorriente: pasivoNoCorriente,
          totalCorriente: totalPasivoCorriente,
          totalNoCorriente: totalPasivoNoCorriente,
          total: totalPasivos,
        },
        patrimonio: {
          cuentas: patrimonioList,
          utilidadEjercicio: utilidadEjercicioActual,
          total: totalPatrimonio,
        },
      },
    });
  } catch (error: any) {
    console.error("Error generating Balance Sheet report:", error);
    return NextResponse.json(
      { success: false, error: "Error al generar el Balance de Situación" },
      { status: 500 }
    );
  }
}
