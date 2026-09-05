import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface AgingBillDetail {
  id: string;
  invoiceNumber: string;
  purchaseOrderNumber?: string | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  balance: number;
  daysPastDue: number;
  bucket: "CURRENT" | "DAYS_1_30" | "DAYS_31_60" | "DAYS_61_90" | "DAYS_OVER_90";
  paymentStatus: string;
}

export interface VendorAgingRow {
  vendorId: string;
  vendorName: string;
  macolaCode?: string | null;
  vendorEmail?: string | null;
  vendorPhone?: string | null;
  totalBalance: number;
  current: number;       // Al día / corriente (días <= 0)
  days1to30: number;     // 1 - 30 días
  days31to60: number;    // 31 - 60 días
  days61to90: number;    // 61 - 90 días
  daysOver90: number;    // > 90 días
  oldestDueDate?: string;
  maxDaysPastDue: number;
  billsCount: number;
  bills: AgingBillDetail[];
}

function parseDateToUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function calculateDueDate(issueDate: string, dueDate?: string | null): string {
  if (dueDate && dueDate.trim()) return dueDate.trim();
  const baseDate = parseDateToUTC(issueDate);
  const result = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  return result.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDateStr = searchParams.get("asOfDate") || new Date().toISOString().split("T")[0];
    const vendorId = searchParams.get("vendorId");
    const currency = searchParams.get("currency");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const asOfDateUTC = parseDateToUTC(asOfDateStr);

    // 1. Fetch purchase invoices that are not fully paid
    const whereInvoice: Record<string, unknown> = {
      paymentStatus: {
        notIn: ["Pagada", "PAGADA", "PAGADO", "Cancelada", "CANCELADA"],
      },
    };

    if (currency && currency !== "ALL") {
      whereInvoice.currency = currency;
    }

    if (vendorId) {
      whereInvoice.vendorId = vendorId;
    }

    const invoices = await prisma.purchaseInvoice.findMany({
      where: whereInvoice,
      orderBy: { issueDate: "asc" },
    });

    // 2. Fetch vendor credits (Credit notes + completed returns)
    const creditNotes = await prisma.creditDebitNote.findMany({
      where: {
        type: "CREDIT",
        entityType: "VENDOR",
        status: { in: ["APLICADA", "Emitida", "EMITIDA"] },
      },
    });

    const vendorReturns = await prisma.vendorReturn.findMany({
      where: {
        status: { in: ["APROBADA", "ENVIADA", "COMPLETADA"] },
      },
    });

    // 2b. Fetch active tax retentions
    const taxRetentions = await prisma.taxRetention.findMany({
      where: {
        status: "ISSUED",
      },
    });

    // 2c. Fetch active vendor payments
    const db = prisma as any;
    const vendorPaymentLines = await db.vendorPaymentLine.findMany({
      where: {
        vendorPayment: {
          status: "APLICADO",
        },
      },
    });

    // Map credit, retention, and payment amounts by invoice number
    const creditsByInvoice = new Map<string, number>();
    for (const cn of creditNotes) {
      if (cn.targetDocNum) {
        const prev = creditsByInvoice.get(cn.targetDocNum) || 0;
        creditsByInvoice.set(cn.targetDocNum, prev + cn.total);
      }
    }
    for (const vr of vendorReturns) {
      if (vr.purchaseInvoiceNumber) {
        const prev = creditsByInvoice.get(vr.purchaseInvoiceNumber) || 0;
        creditsByInvoice.set(vr.purchaseInvoiceNumber, prev + vr.total);
      }
    }
    for (const tr of taxRetentions) {
      if (tr.purchaseInvoiceId) {
        // Will be matched by id or target invoice below if needed
      }
    }
    const retentionsByInvoice = new Map<string, number>();
    for (const tr of taxRetentions) {
      if (tr.purchaseInvoiceId) {
        const prev = retentionsByInvoice.get(tr.purchaseInvoiceId) || 0;
        retentionsByInvoice.set(tr.purchaseInvoiceId, prev + tr.retentionAmount);
      }
    }
    const paymentsByInvoice = new Map<string, number>();
    for (const pl of vendorPaymentLines) {
      const key = pl.purchaseInvoiceId || pl.invoiceNumber;
      if (key) {
        const prev = paymentsByInvoice.get(key) || 0;
        paymentsByInvoice.set(key, prev + (Number(pl.amountPaid) || 0));
      }
    }

    // 3. Process each purchase invoice into aging buckets
    const vendorMap = new Map<string, VendorAgingRow>();

    for (const inv of invoices) {
      const creditAmount = creditsByInvoice.get(inv.invoiceNumber) || 0;
      const retentionAmount = retentionsByInvoice.get(inv.id) || 0;
      const paymentAmount = (paymentsByInvoice.get(inv.id) || 0) + (paymentsByInvoice.get(inv.invoiceNumber) || 0);

      const netBalance = Math.max(0, Math.round((inv.total - creditAmount - retentionAmount - paymentAmount) * 100) / 100);

      if (netBalance <= 0) continue; // Invoice already covered

      const effectiveDueDateStr = calculateDueDate(inv.issueDate, inv.dueDate);
      const dueDateUTC = parseDateToUTC(effectiveDueDateStr);

      // Days past due relative to asOfDate
      const diffTime = asOfDateUTC.getTime() - dueDateUTC.getTime();
      const daysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let bucket: "CURRENT" | "DAYS_1_30" | "DAYS_31_60" | "DAYS_61_90" | "DAYS_OVER_90";
      if (daysPastDue <= 0) {
        bucket = "CURRENT";
      } else if (daysPastDue <= 30) {
        bucket = "DAYS_1_30";
      } else if (daysPastDue <= 60) {
        bucket = "DAYS_31_60";
      } else if (daysPastDue <= 90) {
        bucket = "DAYS_61_90";
      } else {
        bucket = "DAYS_OVER_90";
      }

      const billDetail: AgingBillDetail = {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        purchaseOrderNumber: inv.purchaseOrderNumber,
        issueDate: inv.issueDate,
        dueDate: effectiveDueDateStr,
        currency: inv.currency,
        total: inv.total,
        balance: netBalance,
        daysPastDue,
        bucket,
        paymentStatus: inv.paymentStatus,
      };

      const key = inv.vendorName.trim();
      if (!vendorMap.has(key)) {
        vendorMap.set(key, {
          vendorId: inv.vendorId || `VEN-${key.replace(/\s+/g, "_")}`,
          vendorName: key,
          macolaCode: null,
          vendorEmail: null,
          vendorPhone: null,
          totalBalance: 0,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          daysOver90: 0,
          oldestDueDate: effectiveDueDateStr,
          maxDaysPastDue: daysPastDue,
          billsCount: 0,
          bills: [],
        });
      }

      const row = vendorMap.get(key)!;
      row.bills.push(billDetail);
      row.billsCount += 1;
      row.totalBalance = Math.round((row.totalBalance + netBalance) * 100) / 100;

      if (bucket === "CURRENT") {
        row.current = Math.round((row.current + netBalance) * 100) / 100;
      } else if (bucket === "DAYS_1_30") {
        row.days1to30 = Math.round((row.days1to30 + netBalance) * 100) / 100;
      } else if (bucket === "DAYS_31_60") {
        row.days31to60 = Math.round((row.days31to60 + netBalance) * 100) / 100;
      } else if (bucket === "DAYS_61_90") {
        row.days61to90 = Math.round((row.days61to90 + netBalance) * 100) / 100;
      } else {
        row.daysOver90 = Math.round((row.daysOver90 + netBalance) * 100) / 100;
      }

      if (daysPastDue > row.maxDaysPastDue) {
        row.maxDaysPastDue = daysPastDue;
      }
      if (!row.oldestDueDate || effectiveDueDateStr < row.oldestDueDate) {
        row.oldestDueDate = effectiveDueDateStr;
      }
    }

    // 4. Enrich vendor info from Vendor catalog
    const allVendors = await prisma.vendor.findMany();
    const vendorLookup = new Map<string, { macolaCode?: string | null; email?: string | null; phone?: string | null; id?: string }>();
    for (const v of allVendors) {
      vendorLookup.set(v.name.toLowerCase().trim(), {
        macolaCode: v.macolaCode,
        email: v.email,
        phone: v.phone,
        id: v.id,
      });
    }

    const rows: VendorAgingRow[] = Array.from(vendorMap.values()).map((row) => {
      const match = vendorLookup.get(row.vendorName.toLowerCase().trim());
      if (match) {
        if (match.macolaCode) row.macolaCode = match.macolaCode;
        if (match.email) row.vendorEmail = match.email;
        if (match.phone) row.vendorPhone = match.phone;
        if (match.id) row.vendorId = match.id;
      }
      return row;
    });

    // Sort by largest balance first
    rows.sort((a, b) => b.totalBalance - a.totalBalance);

    // Filter by search term if provided
    let filteredRows = rows;
    if (search) {
      filteredRows = rows.filter((r) => {
        const matchesName = r.vendorName.toLowerCase().includes(search);
        const matchesCode = r.macolaCode?.toLowerCase().includes(search);
        const matchesInvoice = r.bills.some(
          (b) =>
            b.invoiceNumber.toLowerCase().includes(search) ||
            (b.purchaseOrderNumber && b.purchaseOrderNumber.toLowerCase().includes(search))
        );
        return matchesName || matchesCode || matchesInvoice;
      });
    }

    // 5. Calculate Executive Portfolio Totals
    let totalPayables = 0;
    let current = 0;
    let days1to30 = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let daysOver90 = 0;
    let totalBills = 0;

    for (const r of filteredRows) {
      totalPayables += r.totalBalance;
      current += r.current;
      days1to30 += r.days1to30;
      days31to60 += r.days31to60;
      days61to90 += r.days61to90;
      daysOver90 += r.daysOver90;
      totalBills += r.billsCount;
    }

    totalPayables = Math.round(totalPayables * 100) / 100;
    current = Math.round(current * 100) / 100;
    days1to30 = Math.round(days1to30 * 100) / 100;
    days31to60 = Math.round(days31to60 * 100) / 100;
    days61to90 = Math.round(days61to90 * 100) / 100;
    daysOver90 = Math.round(daysOver90 * 100) / 100;

    const overdueTotal = Math.round((days1to30 + days31to60 + days61to90 + daysOver90) * 100) / 100;

    const summary = {
      totalPayables,
      current,
      days1to30,
      days31to60,
      days61to90,
      daysOver90,
      overdueTotal,
      totalBills,
      totalVendors: filteredRows.length,
      currentPct: totalPayables > 0 ? Math.round((current / totalPayables) * 1000) / 10 : 0,
      days1to30Pct: totalPayables > 0 ? Math.round((days1to30 / totalPayables) * 1000) / 10 : 0,
      days31to60Pct: totalPayables > 0 ? Math.round((days31to60 / totalPayables) * 1000) / 10 : 0,
      days61to90Pct: totalPayables > 0 ? Math.round((days61to90 / totalPayables) * 1000) / 10 : 0,
      daysOver90Pct: totalPayables > 0 ? Math.round((daysOver90 / totalPayables) * 1000) / 10 : 0,
      overduePct: totalPayables > 0 ? Math.round((overdueTotal / totalPayables) * 1000) / 10 : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        asOfDate: asOfDateStr,
        currency: currency || "ALL",
        summary,
        vendors: filteredRows,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/reports/vendor-aging error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
