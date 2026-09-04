import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export interface StatementMovement {
  id: string;
  date: string;
  type: "FACTURA" | "PAGO" | "NOTA_CREDITO" | "NOTA_DEBITO";
  typeLabel: string;
  docNumber: string;
  concept: string;
  reference?: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface CustomerStatementResponse {
  customer: {
    id: string;
    name: string;
    macolaCode?: string | null;
    rtn?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    currency: string;
  };
  asOfDate: string;
  period: {
    startDate?: string | null;
    endDate: string;
  };
  summary: {
    saldoInicial: number;
    totalCargos: number;
    totalAbonos: number;
    saldoFinal: number;
  };
  aging: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    daysOver90: number;
    totalPending: number;
  };
  movements: StatementMovement[];
}

function parseDateToUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function calculateDueDate(invoiceDate: string, dueDate?: string | null, paymentTerms?: string): string {
  if (dueDate && dueDate.trim()) return dueDate.trim();
  const baseDate = parseDateToUTC(invoiceDate);
  let daysToAdd = 30;

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

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const rawId = decodeURIComponent(id);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate"); // YYYY-MM-DD
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const currency = searchParams.get("currency") || "USD";

    // 1. Locate Customer
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { id: rawId },
          { macolaCode: rawId },
          { name: { equals: rawId, mode: "insensitive" } },
        ],
      },
    });

    // 2. Fetch invoices for this customer
    const invoiceWhere: Record<string, unknown> = {
      status: { notIn: ["Anulada", "ANULADA"] },
      OR: [
        ...(customer?.id ? [{ customerId: customer.id }] : []),
        { customerName: { equals: customer ? customer.name : rawId, mode: "insensitive" } },
      ],
    };

    const invoices = await prisma.salesInvoice.findMany({
      where: invoiceWhere,
      orderBy: { invoiceDate: "asc" },
    });

    // If customer wasn't in Customer table, create a lightweight customer object from invoices
    if (!customer) {
      const sampleInv = invoices[0];
      customer = {
        id: sampleInv?.customerId || rawId,
        macolaCode: null,
        name: sampleInv?.customerName || rawId,
        email: sampleInv?.customerEmail || null,
        phone: null,
        address: sampleInv?.customerAddress || null,
        currency,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const customerName = customer.name;
    const customerRtn = invoices.find((i) => i.customerRtn)?.customerRtn || null;

    // 3. Fetch payments
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          ...(customer?.id ? [{ customerId: customer.id }] : []),
          { customerName: { equals: customerName, mode: "insensitive" } },
        ],
      },
      orderBy: { paymentDate: "asc" },
    });

    // 4. Fetch credit/debit notes
    const notes = await prisma.creditDebitNote.findMany({
      where: {
        entityType: "CUSTOMER",
        status: { notIn: ["ANULADA", "Anulada", "BORRADOR"] },
        OR: [
          ...(customer?.id ? [{ entityId: customer.id }] : []),
          { entityName: { equals: customerName, mode: "insensitive" } },
        ],
      },
      orderBy: { issueDate: "asc" },
    });

    // 5. Calculate Initial Balance (before startDate)
    let saldoInicial = 0;

    if (startDate) {
      for (const inv of invoices) {
        if (inv.invoiceDate < startDate) {
          saldoInicial += inv.total;
        }
      }
      for (const pay of payments) {
        if (pay.paymentDate < startDate) {
          saldoInicial -= pay.amount;
        }
      }
      for (const n of notes) {
        if (n.issueDate < startDate) {
          if (n.type === "CREDIT") saldoInicial -= n.total;
          else if (n.type === "DEBIT") saldoInicial += n.total;
        }
      }
      saldoInicial = Math.round(saldoInicial * 100) / 100;
    }

    // 6. Collect all transactions in the active period [startDate, endDate]
    interface RawTx {
      id: string;
      date: string;
      createdAt: Date;
      type: "FACTURA" | "PAGO" | "NOTA_CREDITO" | "NOTA_DEBITO";
      typeLabel: string;
      docNumber: string;
      concept: string;
      reference?: string | null;
      debit: number;
      credit: number;
    }

    const rawTxs: RawTx[] = [];

    // Add Invoices
    for (const inv of invoices) {
      if ((!startDate || inv.invoiceDate >= startDate) && inv.invoiceDate <= endDate) {
        rawTxs.push({
          id: inv.id,
          date: inv.invoiceDate,
          createdAt: inv.createdAt,
          type: "FACTURA",
          typeLabel: "Factura Comercial",
          docNumber: inv.invoiceNumber,
          concept: `Factura ${inv.invoiceNumber} (${inv.paymentTerms || "Crédito"})`,
          reference: inv.cai || undefined,
          debit: inv.total,
          credit: 0,
        });
      }
    }

    // Add Payments
    for (const pay of payments) {
      if ((!startDate || pay.paymentDate >= startDate) && pay.paymentDate <= endDate) {
        rawTxs.push({
          id: pay.id,
          date: pay.paymentDate,
          createdAt: pay.createdAt,
          type: "PAGO",
          typeLabel: "Cobro / Abono",
          docNumber: pay.referenceNumber || `PAG-${pay.id.slice(-6)}`,
          concept: `Pago Recibido (${pay.paymentMethod})${pay.note ? ` - ${pay.note}` : ""}`,
          reference: pay.referenceNumber,
          debit: 0,
          credit: pay.amount,
        });
      }
    }

    // Add Credit/Debit Notes
    for (const n of notes) {
      if ((!startDate || n.issueDate >= startDate) && n.issueDate <= endDate) {
        if (n.type === "CREDIT") {
          rawTxs.push({
            id: n.id,
            date: n.issueDate,
            createdAt: n.createdAt,
            type: "NOTA_CREDITO",
            typeLabel: "Nota de Crédito",
            docNumber: n.noteNumber,
            concept: `Nota de Crédito (${n.reason})${n.targetDocNum ? ` aplicable a Fac ${n.targetDocNum}` : ""}`,
            reference: n.targetDocNum,
            debit: 0,
            credit: n.total,
          });
        } else {
          rawTxs.push({
            id: n.id,
            date: n.issueDate,
            createdAt: n.createdAt,
            type: "NOTA_DEBITO",
            typeLabel: "Nota de Débito",
            docNumber: n.noteNumber,
            concept: `Nota de Débito (${n.reason})${n.targetDocNum ? ` aplicable a Fac ${n.targetDocNum}` : ""}`,
            reference: n.targetDocNum,
            debit: n.total,
            credit: 0,
          });
        }
      }
    }

    // Sort chronologically: Date asc, then createdAt asc
    rawTxs.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // 7. Calculate Running Balance
    let runningBalance = saldoInicial;
    let totalCargos = 0;
    let totalAbonos = 0;

    const movements: StatementMovement[] = rawTxs.map((tx) => {
      totalCargos += tx.debit;
      totalAbonos += tx.credit;
      runningBalance = Math.round((runningBalance + tx.debit - tx.credit) * 100) / 100;

      return {
        id: tx.id,
        date: tx.date,
        type: tx.type,
        typeLabel: tx.typeLabel,
        docNumber: tx.docNumber,
        concept: tx.concept,
        reference: tx.reference,
        debit: Math.round(tx.debit * 100) / 100,
        credit: Math.round(tx.credit * 100) / 100,
        runningBalance,
      };
    });

    totalCargos = Math.round(totalCargos * 100) / 100;
    totalAbonos = Math.round(totalAbonos * 100) / 100;
    const saldoFinal = runningBalance;

    // 8. Calculate Current Aging for this Customer as of endDate
    const endDateUTC = parseDateToUTC(endDate);
    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      daysOver90: 0,
      totalPending: 0,
    };

    const openInvoices = invoices.filter(
      (inv) => inv.status !== "Pagada" && inv.status !== "Cobrada" && inv.status !== "Anulada"
    );

    for (const inv of openInvoices) {
      const effectiveDueDateStr = calculateDueDate(inv.invoiceDate, inv.dueDate, inv.paymentTerms);
      const dueDateUTC = parseDateToUTC(effectiveDueDateStr);
      const diffTime = endDateUTC.getTime() - dueDateUTC.getTime();
      const daysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      aging.totalPending = Math.round((aging.totalPending + inv.total) * 100) / 100;

      if (daysPastDue <= 0) {
        aging.current = Math.round((aging.current + inv.total) * 100) / 100;
      } else if (daysPastDue <= 30) {
        aging.days1to30 = Math.round((aging.days1to30 + inv.total) * 100) / 100;
      } else if (daysPastDue <= 60) {
        aging.days31to60 = Math.round((aging.days31to60 + inv.total) * 100) / 100;
      } else if (daysPastDue <= 90) {
        aging.days61to90 = Math.round((aging.days61to90 + inv.total) * 100) / 100;
      } else {
        aging.daysOver90 = Math.round((aging.daysOver90 + inv.total) * 100) / 100;
      }
    }

    const responseData: CustomerStatementResponse = {
      customer: {
        id: customer.id,
        name: customer.name,
        macolaCode: customer.macolaCode,
        rtn: customerRtn,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        currency: customer.currency || currency,
      },
      asOfDate: new Date().toISOString().split("T")[0],
      period: {
        startDate: startDate || null,
        endDate,
      },
      summary: {
        saldoInicial,
        totalCargos,
        totalAbonos,
        saldoFinal,
      },
      aging,
      movements,
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: unknown) {
    console.error("GET /api/customers/[id]/statement error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
