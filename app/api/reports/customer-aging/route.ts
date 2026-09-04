import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface AgingInvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  currency: string;
  total: number;
  balance: number;
  daysPastDue: number;
  bucket: "CURRENT" | "DAYS_1_30" | "DAYS_31_60" | "DAYS_61_90" | "DAYS_OVER_90";
  status: string;
}

export interface CustomerAgingRow {
  customerId: string;
  customerName: string;
  customerRtn?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  totalBalance: number;
  current: number;       // Corriente (no vencido, <= 0 días)
  days1to30: number;     // 1 - 30 días
  days31to60: number;    // 31 - 60 días
  days61to90: number;    // 61 - 90 días
  daysOver90: number;    // > 90 días
  oldestDueDate?: string;
  maxDaysPastDue: number;
  invoicesCount: number;
  invoices: AgingInvoiceDetail[];
}

function parseDateToUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function calculateDueDate(invoiceDate: string, dueDate?: string | null, paymentTerms?: string): string {
  if (dueDate && dueDate.trim()) return dueDate.trim();
  const baseDate = parseDateToUTC(invoiceDate);
  let daysToAdd = 30; // default Neto 30 días

  if (paymentTerms) {
    const terms = paymentTerms.toLowerCase();
    if (terms.includes("contado") || terms.includes("inmediato") || terms.includes("0 días")) {
      daysToAdd = 0;
    } else if (terms.includes("15")) {
      daysToAdd = 15;
    } else if (terms.includes("45")) {
      daysToAdd = 45;
    } else if (terms.includes("60")) {
      daysToAdd = 60;
    } else if (terms.includes("90")) {
      daysToAdd = 90;
    }
  }

  const result = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return result.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDateStr = searchParams.get("asOfDate") || new Date().toISOString().split("T")[0];
    const customerId = searchParams.get("customerId");
    const currency = searchParams.get("currency");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const asOfDateUTC = parseDateToUTC(asOfDateStr);

    // 1. Fetch sales invoices that are not cancelled or fully paid
    const whereInvoice: Record<string, unknown> = {
      status: {
        notIn: ["Anulada", "ANULADA", "Pagada", "PAGADA", "Cobrada", "COBRADA"],
      },
    };

    if (currency && currency !== "ALL") {
      whereInvoice.currency = currency;
    }

    if (customerId) {
      whereInvoice.customerId = customerId;
    }

    const invoices = await prisma.salesInvoice.findMany({
      where: whereInvoice,
      orderBy: { invoiceDate: "asc" },
    });

    // 2. Fetch applied credit notes
    const creditNotes = await prisma.creditDebitNote.findMany({
      where: {
        type: "CREDIT",
        entityType: "CUSTOMER",
        status: { in: ["APLICADA", "Emitida", "EMITIDA"] },
      },
    });

    // Map credit notes by targetDocNum or entityName
    const creditNotesByInvoice = new Map<string, number>();
    for (const cn of creditNotes) {
      if (cn.targetDocNum) {
        const prev = creditNotesByInvoice.get(cn.targetDocNum) || 0;
        creditNotesByInvoice.set(cn.targetDocNum, prev + cn.total);
      }
    }

    // 3. Process each invoice into aging buckets
    const customerMap = new Map<string, CustomerAgingRow>();

    for (const inv of invoices) {
      // Calculate net balance for invoice
      const creditNoteAmount = creditNotesByInvoice.get(inv.invoiceNumber) || 0;
      const netBalance = Math.max(0, Math.round((inv.total - creditNoteAmount) * 100) / 100);

      if (netBalance <= 0) continue; // Skip if already satisfied by credit note

      const effectiveDueDateStr = calculateDueDate(inv.invoiceDate, inv.dueDate, inv.paymentTerms);
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

      const invoiceDetail: AgingInvoiceDetail = {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: effectiveDueDateStr,
        paymentTerms: inv.paymentTerms,
        currency: inv.currency,
        total: inv.total,
        balance: netBalance,
        daysPastDue,
        bucket,
        status: inv.status,
      };

      const custKey = inv.customerId || inv.customerName;
      let row = customerMap.get(custKey);

      if (!row) {
        row = {
          customerId: inv.customerId || inv.customerName,
          customerName: inv.customerName,
          customerRtn: inv.customerRtn,
          customerEmail: inv.customerEmail,
          customerPhone: null,
          totalBalance: 0,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          daysOver90: 0,
          oldestDueDate: effectiveDueDateStr,
          maxDaysPastDue: daysPastDue,
          invoicesCount: 0,
          invoices: [],
        };
        customerMap.set(custKey, row);
      }

      row.totalBalance = Math.round((row.totalBalance + netBalance) * 100) / 100;
      row.invoicesCount += 1;
      row.invoices.push(invoiceDetail);

      if (daysPastDue > row.maxDaysPastDue) {
        row.maxDaysPastDue = daysPastDue;
      }
      if (!row.oldestDueDate || effectiveDueDateStr < row.oldestDueDate) {
        row.oldestDueDate = effectiveDueDateStr;
      }

      switch (bucket) {
        case "CURRENT":
          row.current = Math.round((row.current + netBalance) * 100) / 100;
          break;
        case "DAYS_1_30":
          row.days1to30 = Math.round((row.days1to30 + netBalance) * 100) / 100;
          break;
        case "DAYS_31_60":
          row.days31to60 = Math.round((row.days31to60 + netBalance) * 100) / 100;
          break;
        case "DAYS_61_90":
          row.days61to90 = Math.round((row.days61to90 + netBalance) * 100) / 100;
          break;
        case "DAYS_OVER_90":
          row.daysOver90 = Math.round((row.daysOver90 + netBalance) * 100) / 100;
          break;
      }
    }

    let customerRows = Array.from(customerMap.values());

    // Apply search filter if present
    if (search) {
      customerRows = customerRows.filter(
        (c) =>
          c.customerName.toLowerCase().includes(search) ||
          (c.customerRtn && c.customerRtn.toLowerCase().includes(search)) ||
          c.invoices.some((i) => i.invoiceNumber.toLowerCase().includes(search))
      );
    }

    // Sort by highest total balance
    customerRows.sort((a, b) => b.totalBalance - a.totalBalance);

    // 4. Calculate Portfolio Summary Totals
    const summary = customerRows.reduce(
      (acc, r) => {
        acc.totalReceivables += r.totalBalance;
        acc.current += r.current;
        acc.days1to30 += r.days1to30;
        acc.days31to60 += r.days31to60;
        acc.days61to90 += r.days61to90;
        acc.daysOver90 += r.daysOver90;
        acc.totalInvoices += r.invoicesCount;
        return acc;
      },
      {
        totalReceivables: 0,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        daysOver90: 0,
        totalInvoices: 0,
        totalCustomers: customerRows.length,
      }
    );

    // Round summary amounts
    summary.totalReceivables = Math.round(summary.totalReceivables * 100) / 100;
    summary.current = Math.round(summary.current * 100) / 100;
    summary.days1to30 = Math.round(summary.days1to30 * 100) / 100;
    summary.days31to60 = Math.round(summary.days31to60 * 100) / 100;
    summary.days61to90 = Math.round(summary.days61to90 * 100) / 100;
    summary.daysOver90 = Math.round(summary.daysOver90 * 100) / 100;

    const overdueTotal = Math.round((summary.days1to30 + summary.days31to60 + summary.days61to90 + summary.daysOver90) * 100) / 100;

    const calcPct = (val: number) =>
      summary.totalReceivables > 0 ? Math.round((val / summary.totalReceivables) * 10000) / 100 : 0;

    const enrichedSummary = {
      ...summary,
      overdueTotal,
      currentPct: calcPct(summary.current),
      days1to30Pct: calcPct(summary.days1to30),
      days31to60Pct: calcPct(summary.days31to60),
      days61to90Pct: calcPct(summary.days61to90),
      daysOver90Pct: calcPct(summary.daysOver90),
      overduePct: calcPct(overdueTotal),
    };

    return NextResponse.json({
      success: true,
      data: {
        asOfDate: asOfDateStr,
        summary: enrichedSummary,
        customers: customerRows,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/reports/customer-aging error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
