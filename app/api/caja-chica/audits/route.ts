import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fundId = searchParams.get("fundId");

    const where: any = {};
    if (fundId) where.fundId = fundId;

    const rawAudits = await prisma.pettyCashAudit.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const mapped = rawAudits.map((a: any) => ({
      ...a,
      physicalCashTotal: a.cashCounted,
      pendingReceiptsTotal: a.vouchersTotal,
      activeVouchersTotal: a.pendingLoansTotal,
      status: a.resultStatus,
    }));

    return NextResponse.json({ success: true, audits: mapped, data: mapped });
  } catch (error: any) {
    console.error("Error fetching audits:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fundId,
      auditDate,
      auditorName,
      custodianName,
      systemBalance,
      theoreticalBalance,
      cashCounted,
      physicalCashTotal,
      vouchersTotal,
      pendingReceiptsTotal,
      pendingLoansTotal,
      activeVouchersTotal,
      totalCounted,
      difference,
      resultStatus,
      status,
      denominations,
      observations,
    } = body;

    if (!fundId || !auditorName) {
      return NextResponse.json(
        { success: false, error: "Fondo y nombre del auditor son obligatorios." },
        { status: 400 }
      );
    }

    const count = await prisma.pettyCashAudit.count();
    const auditNumber = `ARQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const physicalCash = parseFloat(cashCounted || physicalCashTotal) || 0;
    const pendingReceipts = parseFloat(vouchersTotal || pendingReceiptsTotal) || 0;
    const activeLoans = parseFloat(pendingLoansTotal || activeVouchersTotal) || 0;
    const totalCalc = parseFloat(totalCounted) || (physicalCash + pendingReceipts + activeLoans);
    const diffCalc = parseFloat(difference) || 0;
    const statusVal = (resultStatus || status || (Math.abs(diffCalc) < 0.01 ? "EXACTO" : diffCalc > 0 ? "SOBRANTE" : "FALTANTE")).toUpperCase();

    const audit = await prisma.pettyCashAudit.create({
      data: {
        fundId,
        auditNumber,
        auditDate: auditDate || new Date().toLocaleString("es-HN"),
        auditorName,
        custodianName: custodianName || "Custodio Responsable",
        systemBalance: parseFloat(systemBalance || theoreticalBalance) || 0,
        cashCounted: physicalCash,
        vouchersTotal: pendingReceipts,
        pendingLoansTotal: activeLoans,
        totalCounted: totalCalc,
        difference: diffCalc,
        resultStatus: statusVal,
        denominations: denominations || {},
        observations: observations || null,
      },
    });

    const mapped = {
      ...audit,
      physicalCashTotal: audit.cashCounted,
      pendingReceiptsTotal: audit.vouchersTotal,
      activeVouchersTotal: audit.pendingLoansTotal,
      status: audit.resultStatus,
    };

    return NextResponse.json({ success: true, audit: mapped, data: mapped });
  } catch (error: any) {
    console.error("Error creating audit:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
