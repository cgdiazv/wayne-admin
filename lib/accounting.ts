import { prisma } from "@/lib/prisma";

export interface JournalLineInput {
  accountCode: string;
  accountName?: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface CreateJournalEntryInput {
  date?: string;
  concept: string;
  referenceType: "INVOICE" | "PURCHASE_INVOICE" | "PAYMENT_CUSTOMER" | "PAYMENT_VENDOR" | "BANK_TX" | "PETTY_CASH" | "MANUAL";
  referenceId?: string;
  currency?: string;
  lines: JournalLineInput[];
}

// Standard chart of accounts mapping
const STANDARD_ACCOUNTS: Record<string, { name: string; type: string }> = {
  "1000": { name: "Cash on Hand (Caja General)", type: "Asset" },
  "1100": { name: "Operating Checking Account (Banco Ficohsa)", type: "Asset" },
  "1120": { name: "Accounts Receivable (Cuentas por Cobrar)", type: "Asset" },
  "1200": { name: "Accounts Receivable (Cuentas por Cobrar Clientes)", type: "Asset" },
  "1150": { name: "Crédito Fiscal — Impuesto Sobre Ventas (ISV 15%)", type: "Asset" },
  "1300": { name: "Inventory Asset (Inventario de Mercancías)", type: "Asset" },
  "2000": { name: "Accounts Payable (Cuentas por Pagar Proveedores)", type: "Liability" },
  "2150": { name: "Débito Fiscal — Impuesto Sobre Ventas (ISV 15%)", type: "Liability" },
  "3000": { name: "Owner Equity (Capital Social)", type: "Equity" },
  "4000": { name: "Sales Revenue (Ventas de Mercancías)", type: "Income" },
  "4100": { name: "Design & Custom Services (Servicios de Impresión)", type: "Income" },
  "4200": { name: "Sales Discounts (Descuentos sobre Ventas)", type: "Income" },
  "5000": { name: "Cost of Goods Sold (Costo de Ventas)", type: "Expense" },
  "6000": { name: "General & Administrative (Gastos Administrativos)", type: "Expense" },
  "6100": { name: "Transport & Freight (Transporte y Envíos)", type: "Expense" },
  "6200": { name: "Office Supplies (Papelería y Suministros)", type: "Expense" },
};

/**
 * Finds an account by code or creates it with standard metadata if not present.
 */
export async function getOrCreateAccount(code: string, preferredName?: string, preferredType?: string) {
  const existing = await prisma.account.findUnique({
    where: { code },
  });
  if (existing) return existing;

  const std = STANDARD_ACCOUNTS[code];
  const name = preferredName || std?.name || `Cuenta Contable ${code}`;
  const type = preferredType || std?.type || "Asset";

  return await prisma.account.create({
    data: {
      code,
      name,
      type,
      currency: "USD",
      balance: 0,
      isActive: true,
    },
  });
}

/**
 * Creates an atomic double-entry Journal Entry (Partida de Diario)
 * Verifies that sum(Debits) === sum(Credits), logs lines, and updates account balances.
 */
export async function createJournalEntry(input: CreateJournalEntryInput) {
  const {
    date = new Date().toISOString().split("T")[0],
    concept,
    referenceType,
    referenceId,
    currency = "USD",
    lines,
  } = input;

  if (!lines || lines.length === 0) {
    throw new Error("El asiento contable debe tener al menos dos líneas de partida.");
  }

  // Filter out any zeroed noise lines and clean numbers
  const sanitizedLines = lines
    .map((l) => ({
      accountCode: l.accountCode.trim(),
      accountName: l.accountName?.trim(),
      description: l.description?.trim(),
      debit: Math.round((Number(l.debit) || 0) * 100) / 100,
      credit: Math.round((Number(l.credit) || 0) * 100) / 100,
    }))
    .filter((l) => l.debit > 0 || l.credit > 0);

  const totalDebit = Math.round(sanitizedLines.reduce((sum, l) => sum + l.debit, 0) * 100) / 100;
  const totalCredit = Math.round(sanitizedLines.reduce((sum, l) => sum + l.credit, 0) * 100) / 100;

  // Double-entry validation
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    throw new Error(
      `Partida contable descuadrada: Débitos ($${totalDebit.toFixed(2)}) no coinciden con Créditos ($${totalCredit.toFixed(2)}).`
    );
  }

  // Generate next entry number: AS-YYYY-XXXX
  const currentYear = new Date(date).getFullYear() || new Date().getFullYear();
  const yearPrefix = `AS-${currentYear}-`;
  const latestEntry = await prisma.journalEntry.findFirst({
    where: { entryNumber: { startsWith: yearPrefix } },
    orderBy: { entryNumber: "desc" },
  });

  let nextCorrelative = 1;
  if (latestEntry) {
    const parts = latestEntry.entryNumber.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextCorrelative = lastNum + 1;
    }
  }
  const entryNumber = `${yearPrefix}${String(nextCorrelative).padStart(4, "0")}`;

  // Execute in an atomic transaction
  return await prisma.$transaction(async (tx) => {
    // 1. Create the Journal Entry
    const entry = await tx.journalEntry.create({
      data: {
        entryNumber,
        date,
        concept,
        referenceType,
        referenceId: referenceId || null,
        currency,
        status: "POSTED",
      },
    });

    // 2. Process each line and update Account balances
    for (const line of sanitizedLines) {
      // Find or create account
      let account = await tx.account.findUnique({
        where: { code: line.accountCode },
      });

      if (!account) {
        const std = STANDARD_ACCOUNTS[line.accountCode];
        account = await tx.account.create({
          data: {
            code: line.accountCode,
            name: line.accountName || std?.name || `Cuenta ${line.accountCode}`,
            type: std?.type || "Asset",
            currency,
            balance: 0,
            isActive: true,
          },
        });
      }

      // Create JournalEntryLine
      await tx.journalEntryLine.create({
        data: {
          journalEntryId: entry.id,
          accountId: account.id,
          accountCode: account.code,
          accountName: line.accountName || account.name,
          description: line.description || concept,
          debit: line.debit,
          credit: line.credit,
        },
      });

      // Update Account balance based on accounting nature:
      // - Assets & Expenses increase with Debit (+debit -credit)
      // - Liabilities, Equity & Income increase with Credit (+credit -debit)
      let balanceChange = 0;
      if (account.type === "Asset" || account.type === "Expense") {
        balanceChange = line.debit - line.credit;
      } else {
        balanceChange = line.credit - line.debit;
      }

      await tx.account.update({
        where: { id: account.id },
        data: {
          balance: { increment: Math.round(balanceChange * 100) / 100 },
        },
      });
    }

    return await tx.journalEntry.findUnique({
      where: { id: entry.id },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  });
}

/**
 * Triggers automatic accounting entry for a Sales Invoice
 * Débito: 1200 Cuentas por Cobrar Clientes (Total a Pagar)
 * Crédito: 4000 Ingresos por Ventas (Subtotal gravado + exento)
 * Crédito: 2150 Débito Fiscal I.S.V. (ISV 15% + 18%)
 */
export async function postSalesInvoiceEntry(invoice: {
  id?: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  subtotal: number;
  total: number;
  isv15?: number;
  isv18?: number;
  discount?: number;
  currency?: string;
}) {
  const isvTotal = Math.round(((invoice.isv15 || 0) + (invoice.isv18 || 0)) * 100) / 100;
  const netRevenue = Math.round((invoice.total - isvTotal) * 100) / 100;

  const lines: JournalLineInput[] = [
    {
      accountCode: "1200",
      accountName: "Accounts Receivable (Cuentas por Cobrar Clientes)",
      description: `Factura ${invoice.invoiceNumber} - ${invoice.customerName}`,
      debit: Math.round(invoice.total * 100) / 100,
      credit: 0,
    },
    {
      accountCode: "4000",
      accountName: "Sales Revenue (Ventas de Mercancías y Empaques)",
      description: `Venta según Factura ${invoice.invoiceNumber}`,
      debit: 0,
      credit: netRevenue,
    },
  ];

  if (isvTotal > 0) {
    lines.push({
      accountCode: "2150",
      accountName: "Débito Fiscal — Impuesto Sobre Ventas (ISV 15%)",
      description: `I.S.V. trasladado Factura ${invoice.invoiceNumber}`,
      debit: 0,
      credit: isvTotal,
    });
  }

  return await createJournalEntry({
    date: invoice.invoiceDate,
    concept: `Venta Factura N.º ${invoice.invoiceNumber} - ${invoice.customerName}`,
    referenceType: "INVOICE",
    referenceId: invoice.invoiceNumber,
    currency: invoice.currency || "USD",
    lines,
  });
}

/**
 * Triggers automatic accounting entry for Customer Payment / Deposit
 * Débito: 1100 Bancos (o Cuenta de Caja)
 * Crédito: 1200 Cuentas por Cobrar Clientes
 */
export async function postCustomerPaymentEntry(payment: {
  id?: string;
  paymentDate: string;
  customerName: string;
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  depositAccount?: string;
  currency?: string;
}) {
  const methodStr = payment.paymentMethod ? ` (${payment.paymentMethod}${payment.referenceNumber ? ` #${payment.referenceNumber}` : ""})` : "";

  return await createJournalEntry({
    date: payment.paymentDate,
    concept: `Cobro a Cliente: ${payment.customerName}${methodStr}`,
    referenceType: "PAYMENT_CUSTOMER",
    referenceId: payment.referenceNumber || payment.id || "COBRO",
    currency: payment.currency || "USD",
    lines: [
      {
        accountCode: "1100",
        accountName: "Operating Checking Account (Banco Ficohsa)",
        description: `Depósito cobro ${payment.customerName}`,
        debit: Math.round(payment.amount * 100) / 100,
        credit: 0,
      },
      {
        accountCode: "1200",
        accountName: "Accounts Receivable (Cuentas por Cobrar Clientes)",
        description: `Abono/Cancelación de saldo ${payment.customerName}`,
        debit: 0,
        credit: Math.round(payment.amount * 100) / 100,
      },
    ],
  });
}

/**
 * Triggers automatic accounting entry for Purchase Invoices from Vendors
 * Débito: 1300 Inventario de Mercancías (Subtotal)
 * Débito: 1150 Crédito Fiscal I.S.V. (Tax)
 * Crédito: 2000 Cuentas por Pagar Proveedores (Total)
 */
export async function postPurchaseInvoiceEntry(purchaseInvoice: {
  id?: string;
  invoiceNumber: string;
  vendorName: string;
  issueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  currency?: string;
}) {
  const lines: JournalLineInput[] = [
    {
      accountCode: "1300",
      accountName: "Inventory Asset (Inventario de Mercancías)",
      description: `Compra según Factura Proveedor ${purchaseInvoice.invoiceNumber}`,
      debit: Math.round(purchaseInvoice.subtotal * 100) / 100,
      credit: 0,
    },
  ];

  if (purchaseInvoice.tax > 0) {
    lines.push({
      accountCode: "1150",
      accountName: "Crédito Fiscal — Impuesto Sobre Ventas (ISV 15%)",
      description: `Crédito fiscal compra ${purchaseInvoice.invoiceNumber}`,
      debit: Math.round(purchaseInvoice.tax * 100) / 100,
      credit: 0,
    });
  }

  lines.push({
    accountCode: "2000",
    accountName: "Accounts Payable (Cuentas por Pagar Proveedores)",
    description: `Cuenta por pagar a ${purchaseInvoice.vendorName} Fac ${purchaseInvoice.invoiceNumber}`,
    debit: 0,
    credit: Math.round(purchaseInvoice.total * 100) / 100,
  });

  return await createJournalEntry({
    date: purchaseInvoice.issueDate,
    concept: `Factura Proveedor N.º ${purchaseInvoice.invoiceNumber} - ${purchaseInvoice.vendorName}`,
    referenceType: "PURCHASE_INVOICE",
    referenceId: purchaseInvoice.invoiceNumber,
    currency: purchaseInvoice.currency || "USD",
    lines,
  });
}

/**
 * Triggers automatic accounting entry for Vendor Payment
 * Débito: 2000 Cuentas por Pagar Proveedores
 * Crédito: 1100 Bancos
 */
export async function postVendorPaymentEntry(payment: {
  date: string;
  vendorName: string;
  amount: number;
  referenceNumber?: string;
  currency?: string;
}) {
  return await createJournalEntry({
    date: payment.date,
    concept: `Pago a Proveedor: ${payment.vendorName}${payment.referenceNumber ? ` #${payment.referenceNumber}` : ""}`,
    referenceType: "PAYMENT_VENDOR",
    referenceId: payment.referenceNumber || "PAGO-PROV",
    currency: payment.currency || "USD",
    lines: [
      {
        accountCode: "2000",
        accountName: "Accounts Payable (Cuentas por Pagar Proveedores)",
        description: `Cancelación de factura ${payment.vendorName}`,
        debit: Math.round(payment.amount * 100) / 100,
        credit: 0,
      },
      {
        accountCode: "1100",
        accountName: "Operating Checking Account (Banco Ficohsa)",
        description: `Egreso bancario pago ${payment.vendorName}`,
        debit: 0,
        credit: Math.round(payment.amount * 100) / 100,
      },
    ],
  });
}
