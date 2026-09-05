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
  referenceType: "INVOICE" | "PURCHASE_INVOICE" | "PAYMENT_CUSTOMER" | "PAYMENT_VENDOR" | "BANK_TX" | "PETTY_CASH" | "MANUAL" | "TAX_RETENTION";
  referenceId?: string;
  currency?: string;
  lines: JournalLineInput[];
}

// Standard chart of accounts mapping for Honduras (SAR / Código de Comercio / NIIF para PYMES)
export const STANDARD_ACCOUNTS: Record<string, { name: string; type: string }> = {
  // 1. ACTIVOS
  "1000": { name: "Caja General", type: "Asset" },
  "1010": { name: "Caja Chica y Fondos Fijos", type: "Asset" },
  "1100": { name: "Bancos Nacionales (Cuenta de Cheques)", type: "Asset" },
  "1120": { name: "Cuentas por Cobrar Comerciales", type: "Asset" },
  "1130": { name: "Cuentas por Cobrar a Empleados y Funcionarios", type: "Asset" },
  "1150": { name: "Crédito Fiscal — Impuesto Sobre Ventas (ISV 15% / 18%)", type: "Asset" },
  "1160": { name: "Pagos a Cuenta de Impuesto Sobre la Renta (ISR)", type: "Asset" },
  "1170": { name: "Anticipos a Proveedores", type: "Asset" },
  "1200": { name: "Accounts Receivable (Cuentas por Cobrar Clientes)", type: "Asset" },
  "1300": { name: "Inventario de Mercancías / Materia Prima", type: "Asset" },
  "1310": { name: "Inventario de Producto Terminado", type: "Asset" },
  "1500": { name: "Propiedad, Planta y Equipo — Maquinaria y Equipo Industrial", type: "Asset" },
  "1510": { name: "Propiedad, Planta y Equipo — Mobiliario y Equipo de Oficina", type: "Asset" },
  "1520": { name: "Propiedad, Planta y Equipo — Equipo de Transporte y Reparto", type: "Asset" },
  "1530": { name: "Propiedad, Planta y Equipo — Equipo de Cómputo y Software", type: "Asset" },
  "1590": { name: "(-) Depreciación Acumulada de Activos Fijos", type: "Asset" },

  // 2. PASIVOS
  "2000": { name: "Cuentas por Pagar Proveedores Comerciales", type: "Liability" },
  "2100": { name: "Préstamos Bancarios y Sobregiros (Corto Plazo)", type: "Liability" },
  "2110": { name: "Sueldos y Salarios por Pagar", type: "Liability" },
  "2120": { name: "Retenciones Laborales por Pagar (IHSS, RAP, INFOP)", type: "Liability" },
  "2150": { name: "Débito Fiscal — Impuesto Sobre Ventas (ISV 15% / 18%)", type: "Liability" },
  "2160": { name: "Retenciones Fiscales por Pagar (SAR: 1% ISV, 12.5% Honorarios, 10% Alquiler)", type: "Liability" },
  "2170": { name: "Impuesto Sobre la Renta por Pagar (Provisión ISR Anual)", type: "Liability" },
  "2200": { name: "Provisiones Laborales (13º, 14º Mes y Vacaciones)", type: "Liability" },
  "2210": { name: "Provisión para Cesantía y Preaviso", type: "Liability" },
  "2500": { name: "Préstamos y Obligaciones Bancarias a Largo Plazo", type: "Liability" },

  // 3. PATRIMONIO
  "3000": { name: "Capital Social Autorizado y Pagado", type: "Equity" },
  "3100": { name: "Reserva Legal Obligatoria (5% Código de Comercio)", type: "Equity" },
  "3200": { name: "Utilidades Acumuladas de Ejercicios Anteriores", type: "Equity" },
  "3210": { name: "(-) Pérdidas Acumuladas de Ejercicios Anteriores", type: "Equity" },
  "3300": { name: "Utilidad o Pérdida del Ejercicio Actual", type: "Equity" },

  // 4. INGRESOS
  "4000": { name: "Ventas de Mercancías y Productos Gravados (ISV 15%)", type: "Income" },
  "4010": { name: "Ventas Exentas / Exportaciones (ISV 0%)", type: "Income" },
  "4100": { name: "Ingresos por Servicios de Impresión, Empaque y Diseño", type: "Income" },
  "4200": { name: "(-) Descuentos y Devoluciones sobre Ventas", type: "Income" },
  "4300": { name: "Ingresos Financieros e Intereses Ganados", type: "Income" },
  "4400": { name: "Ganancia por Diferencial Cambiario (HNL vs USD)", type: "Income" },

  // 5. COSTOS
  "5000": { name: "Costo de Ventas — Mercancías", type: "Expense" },
  "5100": { name: "Materia Prima Directa", type: "Expense" },
  "5200": { name: "Mano de Obra Directa", type: "Expense" },
  "5300": { name: "Costos Indirectos de Fabricación y Mantenimiento", type: "Expense" },

  // 6. GASTOS OPERATIVOS & ADMINISTRATIVOS
  "6000": { name: "Sueldos y Salarios de Administración", type: "Expense" },
  "6010": { name: "Beneficios y Cargas Sociales Patronales (IHSS, RAP, INFOP)", type: "Expense" },
  "6020": { name: "Décimo Tercer y Décimo Cuarto Mes (Gasto Operativo)", type: "Expense" },
  "6100": { name: "Combustibles, Lubricantes y Transporte", type: "Expense" },
  "6150": { name: "Servicios Públicos (Energía Eléctrica, Agua, Comunicaciones)", type: "Expense" },
  "6200": { name: "Papelería, Útiles de Oficina y Limpieza", type: "Expense" },
  "6300": { name: "Publicidad, Mercadeo y Comisiones de Venta", type: "Expense" },
  "6400": { name: "Gastos de Cafetería y Alimentación de Personal", type: "Expense" },
  "6500": { name: "Gasto por Depreciación de Activos Fijos", type: "Expense" },
  "6600": { name: "Gastos Financieros y Comisiones Bancarias", type: "Expense" },
  "6700": { name: "Pérdida por Diferencial Cambiario", type: "Expense" },
};

/**
 * Seeds or synchronizes the standard Honduran chart of accounts.
 * Safely upserts accounts so existing balances and custom descriptions are preserved.
 */
export async function seedStandardChartOfAccounts(currency: string = "USD") {
  const createdOrUpdated = [];
  for (const [code, meta] of Object.entries(STANDARD_ACCOUNTS)) {
    const account = await prisma.account.upsert({
      where: { code },
      update: {
        // Keep existing balance and isActive status
      },
      create: {
        code,
        name: meta.name,
        type: meta.type,
        currency,
        balance: 0,
        isActive: true,
      },
    });
    createdOrUpdated.push(account);
  }
  return createdOrUpdated;
}

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
  paymentNumber?: string;
  referenceNumber?: string;
  currency?: string;
  bankAccountCode?: string;
  bankAccountName?: string;
}) {
  const ref = payment.paymentNumber || payment.referenceNumber || "PAGO-PROV";
  const bankCode = payment.bankAccountCode || "1100";
  const bankName = payment.bankAccountName || "Bancos Nacionales (Cuenta de Cheques)";

  return await createJournalEntry({
    date: payment.date,
    concept: `Pago a Proveedor: ${payment.vendorName}${payment.referenceNumber ? ` ref. ${payment.referenceNumber}` : ""}${payment.paymentNumber ? ` (${payment.paymentNumber})` : ""}`,
    referenceType: "PAYMENT_VENDOR",
    referenceId: ref,
    currency: payment.currency || "USD",
    lines: [
      {
        accountCode: "2000",
        accountName: "Cuentas por Pagar Proveedores Comerciales",
        description: `Abono / Cancelación a proveedor ${payment.vendorName}`,
        debit: Math.round(payment.amount * 100) / 100,
        credit: 0,
      },
      {
        accountCode: bankCode,
        accountName: bankName,
        description: `Egreso bancario pago ${payment.vendorName} [${ref}]`,
        debit: 0,
        credit: Math.round(payment.amount * 100) / 100,
      },
    ],
  });
}

/**
 * Triggers automatic accounting entry for Tax Retention (Retenciones SAR de ISV/ISR a Proveedores)
 * Débito: 2000 Cuentas por Pagar Proveedores Comerciales (Reduce la deuda neta con el proveedor por el valor retenido)
 * Crédito: 2160 Retenciones Fiscales por Pagar (SAR: 1% ISV, 12.5% Honorarios, 10% Alquiler) (Registra la obligación fiscal con el Estado)
 */
export async function postTaxRetentionEntry(retention: {
  retentionNumber: string;
  providerName: string;
  date: string;
  retentionAmount: number;
  retentionType?: string;
  invoiceNumber?: string;
  currency?: string;
}) {
  const typeLabels: Record<string, string> = {
    ISV_1: "Retención 1% ISV",
    ISV_100: "Retención 100% ISV",
    ISR_12_5: "Retención 12.5% ISR Honorarios",
    ISR_10: "Retención 10% ISR Alquiler",
    OTRO: "Retención Fiscal",
  };
  const typeLabel = (retention.retentionType && typeLabels[retention.retentionType]) || "Retención Fiscal SAR";
  const invRef = retention.invoiceNumber ? ` s/Factura ${retention.invoiceNumber}` : "";

  return await createJournalEntry({
    date: retention.date,
    concept: `Comprobante Retención N.º ${retention.retentionNumber} - ${retention.providerName} (${typeLabel}${invRef})`,
    referenceType: "TAX_RETENTION",
    referenceId: retention.retentionNumber,
    currency: retention.currency || "USD",
    lines: [
      {
        accountCode: "2000",
        accountName: "Accounts Payable (Cuentas por Pagar Proveedores)",
        description: `Retención aplicada a proveedor ${retention.providerName} - Comp. ${retention.retentionNumber}`,
        debit: Math.round(retention.retentionAmount * 100) / 100,
        credit: 0,
      },
      {
        accountCode: "2160",
        accountName: "Retenciones Fiscales por Pagar (SAR: 1% ISV, 12.5% Honorarios, 10% Alquiler)",
        description: `Obligación fiscal SAR s/retención ${retention.retentionNumber} - ${retention.providerName}`,
        debit: 0,
        credit: Math.round(retention.retentionAmount * 100) / 100,
      },
    ],
  });
}

/**
 * Triggers automatic reversal accounting entry when a Tax Retention is voided/cancelled
 * Débito: 2160 Retenciones Fiscales por Pagar (Reversa la obligación fiscal con SAR)
 * Crédito: 2000 Cuentas por Pagar Proveedores Comerciales (Restaura la cuenta por pagar al proveedor)
 */
export async function postTaxRetentionVoidEntry(retention: {
  retentionNumber: string;
  providerName: string;
  date: string;
  retentionAmount: number;
  currency?: string;
}) {
  return await createJournalEntry({
    date: retention.date,
    concept: `ANULACIÓN Comprobante Retención N.º ${retention.retentionNumber} - ${retention.providerName}`,
    referenceType: "TAX_RETENTION",
    referenceId: `ANUL-${retention.retentionNumber}`,
    currency: retention.currency || "USD",
    lines: [
      {
        accountCode: "2160",
        accountName: "Retenciones Fiscales por Pagar (SAR: 1% ISV, 12.5% Honorarios, 10% Alquiler)",
        description: `Reverso por anulación de retención SAR ${retention.retentionNumber}`,
        debit: Math.round(retention.retentionAmount * 100) / 100,
        credit: 0,
      },
      {
        accountCode: "2000",
        accountName: "Accounts Payable (Cuentas por Pagar Proveedores)",
        description: `Restitución de saldo proveedor por anulación comp. ${retention.retentionNumber}`,
        debit: 0,
        credit: Math.round(retention.retentionAmount * 100) / 100,
      },
    ],
  });
}

