"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Printer,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Building2,
  Calendar,
  Percent,
  Ban,
  Receipt,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

export interface TaxRetentionItem {
  id: string;
  retentionNumber: string;
  providerId: string;
  provider: {
    id: string;
    name: string;
    macolaCode?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    currency?: string;
  };
  purchaseInvoiceId?: string | null;
  purchaseInvoice?: {
    id: string;
    invoiceNumber: string;
    purchaseOrderNumber?: string | null;
    vendorName: string;
    issueDate: string;
    dueDate: string;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  } | null;
  baseAmount: number;
  retentionRate: number;
  retentionAmount: number;
  retentionType: string; // "ISV_1" | "ISV_100" | "ISR_12_5" | "ISR_10" | "OTRO"
  status: string; // "ISSUED" | "VOIDED"
  cai?: string | null;
  notes?: string | null;
  journalEntryId?: string | null;
  date: string;
  createdAt: string;
}

interface TaxRetentionsModuleProps {
  onBack: () => void;
  formatCurrency?: (val: number) => string;
  companySettings?: {
    nombre?: string;
    nombreLegal?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    taxId?: string;
    cai?: string;
    rangoAutorizado?: string;
    fechaLimiteEmision?: string;
  };
  vendorsList?: Array<{
    id: string;
    name: string;
    macolaCode?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    currency?: string;
  }>;
  purchaseInvoicesList?: Array<{
    id: string;
    invoiceNumber: string;
    vendorId?: string | null;
    vendorName: string;
    subtotal: number;
    tax: number;
    total: number;
    issueDate: string;
    paymentStatus: string;
    currency?: string;
  }>;
  onNavigateToBill?: (invNumber: string) => void;
}

const RETENTION_TYPES = [
  {
    code: "ISV_1",
    label: "Retención 1% ISV (Grandes Contribuyentes SAR)",
    shortLabel: "1% ISV",
    defaultRate: 1.0,
    category: "ISV",
    desc: "Aplica sobre compras gravadas según Art. 11 Ley ISV",
  },
  {
    code: "ISV_100",
    label: "Retención 100% ISV Facturado",
    shortLabel: "100% ISV",
    defaultRate: 15.0,
    category: "ISV",
    desc: "Retención total del ISV facturado por el proveedor",
  },
  {
    code: "ISR_12_5",
    label: "Retención 12.5% ISR Honorarios Profesionales",
    shortLabel: "12.5% Honorarios",
    defaultRate: 12.5,
    category: "ISR",
    desc: "Servicios técnicos y honorarios profesionales Art. 50 Ley ISR",
  },
  {
    code: "ISR_10",
    label: "Retención 10% ISR Arrendamiento / Alquiler",
    shortLabel: "10% Alquiler",
    defaultRate: 10.0,
    category: "ISR",
    desc: "Alquileres de bienes muebles o inmuebles",
  },
  {
    code: "OTRO",
    label: "Otra Retención Fiscal Personalizada",
    shortLabel: "Personalizada",
    defaultRate: 0.0,
    category: "OTRO",
    desc: "Porcentaje específico según requerimiento SAR",
  },
];

// Helper to convert number to words in Spanish for official SAR vouchers
function numberToSpanishWords(amount: number, currency = "USD"): string {
  const integerPart = Math.floor(amount);
  const cents = Math.round((amount - integerPart) * 100);
  const centsFormatted = `${String(cents).padStart(2, "0")}/100`;

  const units = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const teens = [
    "DIEZ",
    "ONCE",
    "DOCE",
    "TRECE",
    "CATORCE",
    "QUINCE",
    "DIECISÉIS",
    "DIECISIETE",
    "DIECIOCHO",
    "DIECINUEVE",
  ];
  const tens = [
    "",
    "",
    "VEINTE",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];
  const hundreds = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];

  function convertGroup(n: number): string {
    let output = "";
    if (n === 100) return "CIEN";
    if (n >= 100) {
      output += hundreds[Math.floor(n / 100)] + " ";
      n %= 100;
    }
    if (n >= 20) {
      if (n === 20) {
        output += "VEINTE";
      } else if (n < 30) {
        output += "VEINTI" + units[n - 20];
      } else {
        output += tens[Math.floor(n / 10)];
        if (n % 10 > 0) output += " Y " + units[n % 10];
      }
    } else if (n >= 10) {
      output += teens[n - 10];
    } else if (n > 0) {
      output += units[n];
    }
    return output.trim();
  }

  if (integerPart === 0) {
    return `CERO CON ${centsFormatted} ${currency === "HNL" ? "LEMPIRAS" : "DÓLARES"}`;
  }

  let words = "";
  if (integerPart >= 1000000) {
    const millions = Math.floor(integerPart / 1000000);
    words += (millions === 1 ? "UN MILLÓN " : convertGroup(millions) + " MILLONES ");
  }
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  if (thousands > 0) {
    words += (thousands === 1 ? "MIL " : convertGroup(thousands) + " MIL ");
  }
  const rem = integerPart % 1000;
  if (rem > 0) {
    words += convertGroup(rem) + " ";
  }

  const currencyName = currency === "HNL" ? "LEMPIRAS" : "DÓLARES";
  return `${words.trim()} CON ${centsFormatted} ${currencyName}`.toUpperCase();
}

export default function TaxRetentionsModule({
  onBack,
  formatCurrency = (val: number) =>
    `$${val.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  companySettings,
  vendorsList = [],
  purchaseInvoicesList = [],
  onNavigateToBill,
}: TaxRetentionsModuleProps) {
  // Company Defaults
  const company = {
    nombre: companySettings?.nombre || "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
    nombreLegal: companySettings?.nombreLegal || "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
    direccion: companySettings?.direccion || "Zip Búfalo Edificio 1B, Villanueva, Cortés 21101",
    telefono: companySettings?.telefono || "+504 9452-2666",
    email: companySettings?.email || "contabilidad@waynetrademarkhn.com",
    taxId: companySettings?.taxId || "05019008183490",
    cai: companySettings?.cai || "2B8F44-96DF4A-3240BE-A33190-67B7A9-1E",
    rangoAutorizado: companySettings?.rangoAutorizado || "000-001-05-00000001 a 000-001-05-00005000",
    fechaLimiteEmision: companySettings?.fechaLimiteEmision || "2027-12-31",
  };

  // State
  const [retentions, setRetentions] = useState<TaxRetentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ISSUED" | "VOIDED">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState<string>("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedRetentionForPrint, setSelectedRetentionForPrint] = useState<TaxRetentionItem | null>(null);
  const [voidConfirmRetention, setVoidConfirmRetention] = useState<TaxRetentionItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false);

  // Form State
  const [formVendorId, setFormVendorId] = useState("");
  const [formPurchaseInvoiceId, setFormPurchaseInvoiceId] = useState("");
  const [formRetentionType, setFormRetentionType] = useState("ISV_1");
  const [formBaseAmount, setFormBaseAmount] = useState<number | "">("");
  const [formRetentionRate, setFormRetentionRate] = useState<number>(1.0);
  const [formCustomRate, setFormCustomRate] = useState<string>("1.0");
  const [formRetentionNumber, setFormRetentionNumber] = useState("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formCai, setFormCai] = useState(company.cai);
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Fetch retentions from API
  const fetchRetentions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tax-retentions");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRetentions(json.data);
      }
    } catch (err) {
      console.error("Error fetching tax retentions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRetentions();
  }, []);

  // Filtered retentions
  const filteredRetentions = useMemo(() => {
    return retentions.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.retentionNumber.toLowerCase().includes(q) ||
        r.provider?.name?.toLowerCase().includes(q) ||
        (r.purchaseInvoice?.invoiceNumber && r.purchaseInvoice.invoiceNumber.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q));

      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchType = typeFilter === "ALL" || r.retentionType === typeFilter;

      let matchMonth = true;
      if (monthFilter) {
        const itemDate = new Date(r.date);
        const [year, month] = monthFilter.split("-");
        matchMonth =
          itemDate.getFullYear() === parseInt(year, 10) &&
          itemDate.getMonth() + 1 === parseInt(month, 10);
      }

      return matchSearch && matchStatus && matchType && matchMonth;
    });
  }, [retentions, searchQuery, statusFilter, typeFilter, monthFilter]);

  // Metrics Summary
  const metrics = useMemo(() => {
    const issuedOnly = filteredRetentions.filter((r) => r.status === "ISSUED");
    const totalRetained = issuedOnly.reduce((sum, r) => sum + r.retentionAmount, 0);
    const totalBase = issuedOnly.reduce((sum, r) => sum + r.baseAmount, 0);

    const isvRetained = issuedOnly
      .filter((r) => r.retentionType.startsWith("ISV"))
      .reduce((sum, r) => sum + r.retentionAmount, 0);

    const isrRetained = issuedOnly
      .filter((r) => r.retentionType.startsWith("ISR"))
      .reduce((sum, r) => sum + r.retentionAmount, 0);

    const activeCount = issuedOnly.length;
    const voidedCount = filteredRetentions.filter((r) => r.status === "VOIDED").length;

    return {
      totalRetained,
      totalBase,
      isvRetained,
      isrRetained,
      activeCount,
      voidedCount,
    };
  }, [filteredRetentions]);

  // When Vendor changes in Create Form, filter their pending invoices
  const vendorInvoices = useMemo(() => {
    if (!formVendorId) return [];
    return purchaseInvoicesList.filter(
      (inv) =>
        (inv.vendorId && inv.vendorId === formVendorId) ||
        (vendorsList.find((v) => v.id === formVendorId)?.name.toLowerCase() === inv.vendorName.toLowerCase())
    );
  }, [formVendorId, purchaseInvoicesList, vendorsList]);

  // Handle auto-population when selecting an invoice
  const handleInvoiceSelect = (invId: string) => {
    setFormPurchaseInvoiceId(invId);
    if (!invId) return;

    const inv = purchaseInvoicesList.find((i) => i.id === invId);
    if (inv) {
      // If 100% ISV, base is invoice total or tax; for 1% ISV base is subtotal
      if (formRetentionType === "ISV_1") {
        setFormBaseAmount(inv.subtotal);
      } else if (formRetentionType === "ISV_100") {
        setFormBaseAmount(inv.subtotal);
        // if tax exists, default calculated rate is 15%
        setFormRetentionRate(15.0);
      } else {
        setFormBaseAmount(inv.subtotal || inv.total);
      }
    }
  };

  // Handle retention type change
  const handleTypeChange = (typeCode: string) => {
    setFormRetentionType(typeCode);
    const config = RETENTION_TYPES.find((t) => t.code === typeCode);
    if (config) {
      setFormRetentionRate(config.defaultRate);
      setFormCustomRate(config.defaultRate.toString());
    }
  };

  // Calculated retention amount for form preview
  const formCalculatedRetention = useMemo(() => {
    const base = Number(formBaseAmount) || 0;
    const rate = Number(formRetentionRate) || 0;
    return Math.round(((base * rate) / 100) * 100) / 100;
  }, [formBaseAmount, formRetentionRate]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormVendorId("");
    setFormPurchaseInvoiceId("");
    setFormRetentionType("ISV_1");
    setFormBaseAmount("");
    setFormRetentionRate(1.0);
    setFormCustomRate("1.0");
    setFormRetentionNumber("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCai(company.cai);
    setFormNotes("");
    setFormError("");
    setIsCreateModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formVendorId) {
      setFormError("Por favor seleccione un proveedor.");
      return;
    }

    const base = Number(formBaseAmount);
    if (isNaN(base) || base <= 0) {
      setFormError("Ingrese un monto base mayor a cero.");
      return;
    }

    const rate = Number(formRetentionRate);
    if (isNaN(rate) || rate <= 0) {
      setFormError("Ingrese una tasa de retención válida mayor a cero.");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch("/api/tax-retentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: formVendorId,
          purchaseInvoiceId: formPurchaseInvoiceId || null,
          retentionType: formRetentionType,
          baseAmount: base,
          retentionRate: rate,
          retentionAmount: formCalculatedRetention,
          retentionNumber: formRetentionNumber.trim() || undefined,
          date: new Date(formDate).toISOString(),
          cai: formCai.trim() || undefined,
          notes: formNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo emitir el comprobante.");
      }

      setIsCreateModalOpen(false);
      await fetchRetentions();

      // Automatically open print voucher for convenient delivery
      if (json.data) {
        setSelectedRetentionForPrint(json.data);
      }
    } catch (err: any) {
      setFormError(err.message || "Error al emitir comprobante de retención.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Void confirmation
  const handleConfirmVoid = async () => {
    if (!voidConfirmRetention) return;
    setIsSubmittingVoid(true);
    try {
      const res = await fetch(`/api/tax-retentions/${voidConfirmRetention.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VOID",
          reason: voidReason.trim() || "Anulación solicitada por administración",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al anular comprobante");
      }

      setVoidConfirmRetention(null);
      setVoidReason("");
      await fetchRetentions();
    } catch (err: any) {
      alert(err.message || "Error al anular comprobante");
    } finally {
      setIsSubmittingVoid(false);
    }
  };

  // Export to CSV for SAR reporting
  const handleExportSARCSV = () => {
    if (filteredRetentions.length === 0) {
      alert("No hay retenciones para exportar con los filtros seleccionados.");
      return;
    }

    const headers = [
      "Correlativo Comprobante",
      "Fecha Emisión",
      "RTN Proveedor",
      "Nombre Proveedor",
      "N° Factura Compra",
      "Tipo Retención",
      "Monto Base (USD)",
      "Tasa Retención (%)",
      "Monto Retenido (USD)",
      "CAI",
      "Estado",
      "Asiento Contable N°",
    ];

    const rows = filteredRetentions.map((r) => [
      `"${r.retentionNumber}"`,
      `"${new Date(r.date).toISOString().split("T")[0]}"`,
      `"${r.provider?.macolaCode || ""}"`,
      `"${(r.provider?.name || "").replace(/"/g, '""')}"`,
      `"${r.purchaseInvoice?.invoiceNumber || ""}"`,
      `"${r.retentionType}"`,
      r.baseAmount.toFixed(2),
      r.retentionRate.toFixed(2),
      r.retentionAmount.toFixed(2),
      `"${r.cai || ""}"`,
      `"${r.status}"`,
      `"${r.journalEntryId || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Retenciones_SAR_${monthFilter || "General"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ================= SCREEN HEADER ================= */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Regresar a Proveedores</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Cuentas por Pagar</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Comprobantes de Retención SAR</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Comprobantes de Retención de ISV y Fiscales
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5]">
                SAR Honduras (Cuentas por Pagar)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Emisión oficial, control de obligaciones tributarias con el SAR y registro contable automatizado.
            </p>
          </div>

          {/* Global Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                fetchRetentions();
              }}
              disabled={refreshing || loading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#f6821f]" : ""}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Declaración SAR</span>
            </button>

            <button
              type="button"
              onClick={handleExportSARCSV}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Emitir Retención</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Retenido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Retenido (Período)</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#f6821f] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalRetained)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Base Imponible Total: <span className="font-semibold text-slate-600">{formatCurrency(metrics.totalBase)}</span>
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f6821f]" />
        </div>

        {/* Retenciones ISV */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Retenciones ISV (1% y 100%)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.isvRetained)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Enterar al SAR en Formulario de ISV
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        {/* Retenciones ISR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Retenciones ISR (12.5% / 10%)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.isrRetained)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Honorarios Profesionales y Alquileres
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
        </div>

        {/* Comprobantes Emitidos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Comprobantes Emitidos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.activeCount}
            </span>
            {metrics.voidedCount > 0 && (
              <span className="text-xs text-rose-500 font-medium">
                ({metrics.voidedCount} anulados)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Correlativos SAR Vigentes
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por N° de comprobante, proveedor o factura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs text-slate-500 whitespace-nowrap flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Período:
            </label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition"
            />
            {monthFilter && (
              <button
                onClick={() => setMonthFilter("")}
                className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                Todos
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs text-slate-500 whitespace-nowrap flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Tipo:
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="ISV_1">1% ISV Bienes/Servicios</option>
              <option value="ISV_100">100% ISV Facturado</option>
              <option value="ISR_12_5">12.5% ISR Honorarios</option>
              <option value="ISR_10">10% ISR Alquileres</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ISSUED">Solo Emitidos</option>
              <option value="VOIDED">Solo Anulados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Retentions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">N° Comprobante</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Proveedor</th>
                <th className="px-4 py-3.5">Doc. Relacionado</th>
                <th className="px-4 py-3.5">Tipo Retención</th>
                <th className="px-4 py-3.5 text-right">Base Imponible</th>
                <th className="px-4 py-3.5 text-right">Tasa</th>
                <th className="px-4 py-3.5 text-right">Monto Retenido</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#f6821f] mb-2" />
                    Cargando comprobantes de retención...
                  </td>
                </tr>
              ) : filteredRetentions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No se encontraron comprobantes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRetentions.map((item) => {
                  const isVoid = item.status === "VOIDED";
                  const typeObj = RETENTION_TYPES.find((t) => t.code === item.retentionType);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isVoid ? "bg-rose-50/20 opacity-75" : ""
                      }`}
                    >
                      {/* Correlative */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.retentionNumber}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString("es-HN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Provider */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="font-semibold text-slate-800 truncate">
                          {item.provider?.name}
                        </div>
                        {item.provider?.macolaCode && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            RTN / Código: {item.provider.macolaCode}
                          </div>
                        )}
                      </td>

                      {/* Related Document */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.purchaseInvoice ? (
                          <button
                            onClick={() => onNavigateToBill?.(item.purchaseInvoice!.invoiceNumber)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <span>{item.purchaseInvoice.invoiceNumber}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Directo s/Factura</span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            item.retentionType.startsWith("ISV")
                              ? "bg-blue-100 text-blue-800"
                              : item.retentionType.startsWith("ISR")
                              ? "bg-purple-100 text-purple-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {typeObj?.shortLabel || item.retentionType}
                        </span>
                      </td>

                      {/* Base Amount */}
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatCurrency(item.baseAmount)}
                      </td>

                      {/* Rate */}
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {item.retentionRate}%
                      </td>

                      {/* Retention Amount */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.retentionAmount)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isVoid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            <Ban className="w-2.5 h-2.5" />
                            Anulado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Emitido
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print / View voucher */}
                          <button
                            onClick={() => setSelectedRetentionForPrint(item)}
                            title="Ver e Imprimir Comprobante Oficial SAR"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Void Button */}
                          {!isVoid && (
                            <button
                              onClick={() => {
                                setVoidConfirmRetention(item);
                                setVoidReason("");
                              }}
                              title="Anular comprobante"
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: EMITIR COMPROBANTE DE RETENCIÓN ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#f6821f] flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Emitir Comprobante de Retención SAR
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calcula la retención fiscal, genera el correlativo y registra el asiento contable automático.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid 2 cols: Vendor & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vendor Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proveedor (Sujeto Retenido) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formVendorId}
                    onChange={(e) => {
                      setFormVendorId(e.target.value);
                      setFormPurchaseInvoiceId("");
                    }}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white"
                  >
                    <option value="">Seleccione un proveedor...</option>
                    {vendorsList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.macolaCode ? `(${v.macolaCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Retención Fiscal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRetentionType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white font-medium"
                  >
                    {RETENTION_TYPES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Invoice link (optional) */}
              {formVendorId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Factura de Compra Vinculada (Opcional)
                  </label>
                  <select
                    value={formPurchaseInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white"
                  >
                    <option value="">Ninguna factura (Ingreso de montos manual)</option>
                    {vendorInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.issueDate} — Total: {formatCurrency(inv.total)} (Subtotal: {formatCurrency(inv.subtotal)})
                      </option>
                    ))}
                  </select>
                  {vendorInvoices.length === 0 && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      No hay facturas registradas en sistema para este proveedor. Puede ingresar la base gravable directamente.
                    </p>
                  )}
                </div>
              )}

              {/* Amounts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {/* Base Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Imponible ($ / L.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formBaseAmount}
                    onChange={(e) => setFormBaseAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white"
                  />
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Porcentaje Retenido (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formCustomRate}
                    onChange={(e) => {
                      setFormCustomRate(e.target.value);
                      setFormRetentionRate(Number(e.target.value) || 0);
                    }}
                    required
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white"
                  />
                </div>

                {/* Calculated Retention */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Importe Retenido Total
                  </label>
                  <div className="px-3 py-2 text-xs font-mono font-black text-[#f6821f] bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between">
                    <span>USD / HNL</span>
                    <span className="text-sm">{formatCurrency(formCalculatedRetention)}</span>
                  </div>
                </div>
              </div>

              {/* Fiscal & Date details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Emisión <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white"
                  />
                </div>

                {/* Custom Correlative (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Comprobante (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto: RET-2026-XXXX"
                    value={formRetentionNumber}
                    onChange={(e) => setFormRetentionNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white"
                  />
                </div>

                {/* CAI */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CAI de Retención SAR
                  </label>
                  <input
                    type="text"
                    value={formCai}
                    onChange={(e) => setFormCai(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white"
                  />
                </div>
              </div>

              {/* Concept / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Concepto / Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Retención de 1% de ISV sobre compra según factura N°..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#f6821f] transition bg-white"
                />
              </div>

              {/* Real-time Double-Entry Preview */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Asiento Contable Automático (Partida de Diario)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-white rounded-lg border border-blue-100">
                    <span className="text-emerald-700 font-bold">DÉBITO:</span> Cuenta 2000 Cuentas por Pagar Proveedores
                    <div className="text-slate-900 font-bold text-right mt-0.5">
                      {formatCurrency(formCalculatedRetention)}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-100">
                    <span className="text-blue-700 font-bold">CRÉDITO:</span> Cuenta 2160 Retenciones Fiscales por Pagar SAR
                    <div className="text-slate-900 font-bold text-right mt-0.5">
                      {formatCurrency(formCalculatedRetention)}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Efecto: Disminuye la obligación a pagar al proveedor en {formatCurrency(formCalculatedRetention)} y reconoce la deuda tributaria ante el SAR.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || formCalculatedRetention <= 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#f6821f] hover:bg-[#e07115] disabled:opacity-50 rounded-xl transition cursor-pointer shadow-sm shadow-orange-500/20 flex items-center gap-1.5"
                >
                  {isSubmittingCreate ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Emitir Comprobante Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COMPROBANTE OFICIAL IMPRIMIBLE SAR ================= */}
      {selectedRetentionForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Actions Bar */}
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Vista Previa • Comprobante de Retención Oficial SAR
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  Listo para impresión
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#f6821f] hover:bg-[#e07115] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Comprobante
                </button>
                <button
                  onClick={() => setSelectedRetentionForPrint(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Document */}
            <div className="flex-1 overflow-y-auto p-8 text-slate-800 space-y-6 print:p-0 print:overflow-visible">
              <div className="border-2 border-slate-800 p-6 rounded-2xl space-y-6">
                {/* Header: Company & Voucher Title */}
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-300">
                  <div className="space-y-1">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      {company.nombreLegal}
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {company.direccion}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Tel: {company.telefono} • Correo: {company.email}
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-800">
                      RTN: {company.taxId}
                    </p>
                  </div>

                  {/* Correlative & SAR Box */}
                  <div className="text-right border border-slate-400 p-3 rounded-xl bg-slate-50 min-w-[240px]">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">
                      Comprobante de Retención
                    </div>
                    <div className="text-base font-black text-[#f6821f] font-mono tracking-wide mt-0.5">
                      N.º {selectedRetentionForPrint.retentionNumber}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono mt-1">
                      CAI: {selectedRetentionForPrint.cai || company.cai}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      Rango: {company.rangoAutorizado}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      Fecha Límite Emisión: {company.fechaLimiteEmision}
                    </div>
                  </div>
                </div>

                {/* Subject / Provider Box */}
                <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Datos del Sujeto Retenido (Proveedor):
                    </span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                      {selectedRetentionForPrint.provider?.name}
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      RTN / Código: {selectedRetentionForPrint.provider?.macolaCode || "N/A"}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {selectedRetentionForPrint.provider?.address || "Honduras"}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Fecha de Emisión:
                      </span>
                      <p className="font-bold font-mono text-slate-800">
                        {new Date(selectedRetentionForPrint.date).toLocaleDateString("es-HN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Documento Sujeto a Retención:
                      </span>
                      <p className="font-mono text-slate-700">
                        {selectedRetentionForPrint.purchaseInvoice
                          ? `Factura N° ${selectedRetentionForPrint.purchaseInvoice.invoiceNumber}`
                          : "Liquidación Directa de Operación"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Breakdown Table */}
                <table className="w-full text-xs text-left border border-slate-300">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r border-slate-300">Descripción / Concepto</th>
                      <th className="p-2 border-r border-slate-300 text-right">Base Imponible</th>
                      <th className="p-2 border-r border-slate-300 text-center">Tipo Impuesto</th>
                      <th className="p-2 border-r border-slate-300 text-right">% Retenido</th>
                      <th className="p-2 text-right">Monto Retenido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr>
                      <td className="p-2.5 border-r border-slate-300 font-sans">
                        {selectedRetentionForPrint.notes ||
                          `Retención fiscal aplicada según normativa del SAR sobre adquisiciones o servicios`}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-right font-bold text-slate-800">
                        {formatCurrency(selectedRetentionForPrint.baseAmount)}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center font-sans font-bold">
                        {selectedRetentionForPrint.retentionType.startsWith("ISV") ? "ISV" : "ISR"}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-right font-bold">
                        {selectedRetentionForPrint.retentionRate}%
                      </td>
                      <td className="p-2.5 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(selectedRetentionForPrint.retentionAmount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-400">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right uppercase text-xs text-slate-700">
                        Total Importe Retenido:
                      </td>
                      <td className="p-2.5 text-right font-black text-[#f6821f] text-sm font-mono">
                        {formatCurrency(selectedRetentionForPrint.retentionAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Amount in words */}
                <div className="p-3 bg-slate-100/70 border border-slate-300 rounded-xl text-xs">
                  <span className="font-bold text-slate-700">TOTAL EN LETRAS: </span>
                  <span className="font-semibold text-slate-900">
                    {numberToSpanishWords(
                      selectedRetentionForPrint.retentionAmount,
                      selectedRetentionForPrint.provider?.currency || "USD"
                    )}
                  </span>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs">
                  <div>
                    <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                      WAYNE TRADEMARK S. DE R.L.
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Firma Autorizada y Sello Agente Retenedor
                    </div>
                  </div>

                  <div>
                    <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                      {selectedRetentionForPrint.provider?.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Firma, Nombre, Identidad y Sello de Recibido Sujeto Retenido
                    </div>
                  </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 text-center">
                  Este comprobante de retención surte plenos efectos legales y fiscales ante el Servicio de Administración de Rentas (SAR) de la República de Honduras.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DECLARACIÓN MENSUAL SAR REPORT ================= */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Reporte Resumen para Declaración Mensual del SAR
                  </h3>
                  <p className="text-xs text-slate-500">
                    Consolidado mensual de retenciones efectuadas a enterar al fisco hondureño.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Summary Category Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {RETENTION_TYPES.filter((t) => t.code !== "OTRO").map((type) => {
                  const items = filteredRetentions.filter(
                    (r) => r.status === "ISSUED" && r.retentionType === type.code
                  );
                  const total = items.reduce((sum, r) => sum + r.retentionAmount, 0);
                  const base = items.reduce((sum, r) => sum + r.baseAmount, 0);

                  return (
                    <div key={type.code} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">{type.shortLabel}</div>
                      <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                        {formatCurrency(total)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                        <span>Base: {formatCurrency(base)}</span>
                        <span>{items.length} comp.</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table Breakdown */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Correlativo</th>
                      <th className="p-3">Proveedor / RTN</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3 text-right">Base Gravable</th>
                      <th className="p-3 text-right">Tasa</th>
                      <th className="p-3 text-right">Total Retenido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredRetentions
                      .filter((r) => r.status === "ISSUED")
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{r.retentionNumber}</td>
                          <td className="p-3 font-sans">
                            <div className="font-semibold text-slate-900">{r.provider?.name}</div>
                            <div className="text-[10px] text-slate-400">{r.provider?.macolaCode || "N/A"}</div>
                          </td>
                          <td className="p-3 font-sans text-[11px]">{r.retentionType}</td>
                          <td className="p-3 text-right">{formatCurrency(r.baseAmount)}</td>
                          <td className="p-3 text-right">{r.retentionRate}%</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {formatCurrency(r.retentionAmount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                    <tr>
                      <td colSpan={3} className="p-3 font-sans uppercase text-right text-xs">
                        Gran Total Retenciones a Enterar:
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {formatCurrency(metrics.totalBase)}
                      </td>
                      <td className="p-3"></td>
                      <td className="p-3 text-right font-mono font-black text-[#f6821f] text-sm">
                        {formatCurrency(metrics.totalRetained)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-500">
                Total de comprobantes activos: <strong>{metrics.activeCount}</strong>
              </span>
              <button
                onClick={handleExportSARCSV}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#f6821f] hover:bg-[#e07115] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                Descargar Reporte CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM VOID MODAL ================= */}
      {voidConfirmRetention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  ¿Anular Comprobante de Retención?
                </h4>
                <p className="text-xs text-slate-500">
                  {voidConfirmRetention.retentionNumber} — {voidConfirmRetention.provider?.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Al anular este comprobante, se generará una <strong>partida contable de reversión automática</strong> en el Libro Diario (Débito a Retenciones por Pagar / Crédito a Cuentas por Pagar Proveedor) restaurando el saldo original.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo de la anulación (Requerido):
              </label>
              <input
                type="text"
                placeholder="Ej. Error en base imponible o factura cancelada..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidConfirmRetention(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingVoid}
                onClick={handleConfirmVoid}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isSubmittingVoid ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
