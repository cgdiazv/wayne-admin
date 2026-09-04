"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Building2,
  DollarSign,
  Calendar,
  User,
  Trash2,
  Edit3,
  BookOpen,
  ArrowUpRight,
  Send,
  Check,
  Percent,
  Sparkles,
  Info,
} from "lucide-react";

interface QuoteLine {
  id?: string;
  productName: string;
  sku?: string | null;
  description?: string | null;
  quantity: number;
  rate: number;
  amount: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  customerId?: string | null;
  customerName: string;
  customerRtn?: string | null;
  customerAddress?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  quoteDate: string;
  validUntil: string;
  paymentTerms: string;
  currency: string;
  salesRepId?: string | null;
  salesRepName?: string | null;
  notes?: string | null;
  termsConditions?: string | null;
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  status: "Borrador" | "Enviada" | "Aprobada" | "Facturada" | "Rechazada" | string;
  invoiceNumber?: string | null;
  salesInvoiceId?: string | null;
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    total: number;
    status: string;
    journalEntryId?: string | null;
  } | null;
  lines: QuoteLine[];
  createdAt: string;
}

interface QuotesModuleProps {
  onBack?: () => void;
  autoOpenCreate?: boolean;
  onAutoOpenCreateConsumed?: () => void;
  onOpenInvoiceEditor?: (prefilledData: any) => void;
  onNavigateToAccounting?: () => void;
  onNavigateToInvoices?: () => void;
  customers?: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    currency: string;
  }>;
  inventory?: Array<{
    id: string;
    sku: string;
    description: string;
    price: number;
    quantity: number;
  }>;
  salesReps?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export default function QuotesModule({
  onBack,
  autoOpenCreate,
  onAutoOpenCreateConsumed,
  onOpenInvoiceEditor,
  onNavigateToAccounting,
  onNavigateToInvoices,
  customers = [],
  inventory = [],
  salesReps = [],
}: QuotesModuleProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [nextQuoteNumber, setNextQuoteNumber] = useState("COT-2026-0001");

  // Alertas / Mensajes
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Modales
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<"Editar" | "Vista de PDF">("Editar");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showConvertConfirmModal, setShowConvertConfirmModal] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);
  const [activePrintQuote, setActivePrintQuote] = useState<Quote | null>(null);
  const [converting, setConverting] = useState(false);

  // Formulario de Cotización
  const initialFormState = {
    id: "",
    quoteNumber: "",
    customerId: "",
    customerName: "",
    customerRtn: "",
    customerAddress: "",
    customerEmail: "",
    customerPhone: "",
    quoteDate: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    paymentTerms: "Neto 30 días",
    currency: "USD",
    salesRepId: "",
    salesRepName: "",
    notes: "Precios sujetos a confirmación de volumen y especificaciones de arte flexográfico.",
    termsConditions: "Validez de la oferta: 30 días calendario. Entrega estimada en 10-15 días laborables.",
    discount: 0,
    taxRate: 15,
    status: "Borrador",
    lines: [
      {
        productName: "",
        sku: "",
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ],
  };

  const [formData, setFormData] = useState(initialFormState);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Cargar Cotizaciones desde la API
  const fetchQuotes = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/quotes");
      const json = await res.json();
      if (json.success) {
        setQuotes(json.data || []);
        if (json.nextQuoteNumber) {
          setNextQuoteNumber(json.nextQuoteNumber);
        }
      }
    } catch (err) {
      console.error("Error al cargar cotizaciones:", err);
      setErrorAlert("No se pudieron cargar las cotizaciones del servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreate();
      if (onAutoOpenCreateConsumed) {
        onAutoOpenCreateConsumed();
      }
    }
  }, [autoOpenCreate]);

  // Cálculos de formulario
  const formCalculations = useMemo(() => {
    const linesTotal = formData.lines.reduce((acc, line) => {
      const q = Number(line.quantity) || 0;
      const r = Number(line.rate) || 0;
      return acc + q * r;
    }, 0);

    const discount = Math.max(0, Number(formData.discount) || 0);
    const taxableBase = Math.max(0, linesTotal - discount);
    const taxRate = Number(formData.taxRate) || 0;
    const tax = Math.round(((taxableBase * taxRate) / 100) * 100) / 100;
    const total = Math.round((taxableBase + tax) * 100) / 100;

    return {
      subtotal: Math.round(linesTotal * 100) / 100,
      taxableBase,
      tax,
      total,
    };
  }, [formData.lines, formData.discount, formData.taxRate]);

  // Manejar apertura de editor (Nuevo o Edición)
  const handleOpenCreate = () => {
    setFormData({
      ...initialFormState,
      quoteNumber: nextQuoteNumber,
      quoteDate: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      lines: [
        {
          productName: "",
          sku: "",
          description: "",
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ],
    });
    setActiveEditorTab("Editar");
    setShowEditorModal(true);
  };

  const handleOpenEdit = (quote: Quote) => {
    setActiveEditorTab("Editar");
    setFormData({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerId: quote.customerId || "",
      customerName: quote.customerName,
      customerRtn: quote.customerRtn || "",
      customerAddress: quote.customerAddress || "",
      customerEmail: quote.customerEmail || "",
      customerPhone: quote.customerPhone || "",
      quoteDate: quote.quoteDate,
      validUntil: quote.validUntil,
      paymentTerms: quote.paymentTerms || "Neto 30 días",
      currency: quote.currency || "USD",
      salesRepId: quote.salesRepId || "",
      salesRepName: quote.salesRepName || "",
      notes: quote.notes || "",
      termsConditions: quote.termsConditions || "",
      discount: quote.discount || 0,
      taxRate: quote.taxRate || 15,
      status: quote.status || "Borrador",
      lines:
        quote.lines && quote.lines.length > 0
          ? quote.lines.map((l) => ({
              productName: l.productName,
              sku: l.sku || "",
              description: l.description || "",
              quantity: l.quantity,
              rate: l.rate,
              amount: l.amount,
            }))
          : [
              {
                productName: "",
                sku: "",
                description: "",
                quantity: 1,
                rate: 0,
                amount: 0,
              },
            ],
    });
    setShowEditorModal(true);
  };

  // Selección de cliente autocompleta datos
  const handleCustomerSelect = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setFormData((prev) => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email || "",
        customerPhone: cust.phone || "",
        customerAddress: cust.address || "",
        currency: cust.currency || "USD",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        customerId: "",
      }));
    }
  };

  // Selección de producto en línea
  const handleProductSelect = (index: number, sku: string) => {
    const prod = inventory.find((p) => p.sku === sku);
    if (prod) {
      setFormData((prev) => {
        const lines = [...prev.lines];
        lines[index] = {
          ...lines[index],
          sku: prod.sku,
          productName: prod.description,
          description: `SKU: ${prod.sku} - ${prod.description}`,
          rate: prod.price || 0,
          amount: (lines[index].quantity || 1) * (prod.price || 0),
        };
        return { ...prev, lines };
      });
    }
  };

  // Actualizar línea
  const handleLineChange = (index: number, field: keyof QuoteLine, value: any) => {
    setFormData((prev) => {
      const lines = [...prev.lines];
      const updated = { ...lines[index], [field]: value };
      if (field === "quantity" || field === "rate") {
        const q = field === "quantity" ? Number(value) : Number(updated.quantity);
        const r = field === "rate" ? Number(value) : Number(updated.rate);
        updated.amount = Math.round(q * r * 100) / 100;
      }
      lines[index] = updated;
      return { ...prev, lines };
    });
  };

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          productName: "",
          sku: "",
          description: "",
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ],
    }));
  };

  const handleRemoveLine = (index: number) => {
    if (formData.lines.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  // Guardar Cotización (POST)
  const handleSaveQuote = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!formData.customerName.trim()) {
      setErrorAlert("Debe ingresar o seleccionar un cliente.");
      return;
    }
    const hasValidLine = formData.lines.some(
      (l) => l.productName.trim() && l.quantity > 0 && l.rate > 0
    );
    if (!hasValidLine) {
      setErrorAlert("Debe incluir al menos un ítem con descripción, cantidad y precio.");
      return;
    }

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          subtotal: formCalculations.subtotal,
          tax: formCalculations.tax,
          total: formCalculations.total,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessAlert(`Cotización ${formData.quoteNumber} guardada exitosamente.`);
        setShowEditorModal(false);
        fetchQuotes();
      } else {
        setErrorAlert(data.error || "Error al guardar la cotización.");
      }
    } catch (err) {
      console.error(err);
      setErrorAlert("Error de conexión al guardar la cotización.");
    }
  };

  // Cambiar estado rápido
  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/quotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quoteId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessAlert(data.message);
        fetchQuotes();
      } else {
        setErrorAlert(data.error || "No se pudo actualizar el estado.");
      }
    } catch (err) {
      console.error(err);
      setErrorAlert("Error de conexión al actualizar el estado.");
    }
  };

  // Eliminar cotización
  const handleDeleteQuote = async (quote: Quote) => {
    if (quote.status === "Facturada") {
      setErrorAlert("No se puede eliminar una cotización que ya fue facturada.");
      return;
    }
    if (!window.confirm(`¿Seguro que deseas eliminar la cotización ${quote.quoteNumber}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccessAlert(`Cotización ${quote.quoteNumber} eliminada correctamente.`);
        fetchQuotes();
      } else {
        setErrorAlert(data.error || "No se pudo eliminar la cotización.");
      }
    } catch (err) {
      console.error(err);
      setErrorAlert("Error al intentar eliminar la cotización.");
    }
  };

  // CONVERTIR A FACTURA CON CONTABILIZACIÓN AUTOMÁTICA
  const handleExecuteConvertToInvoice = async () => {
    if (!quoteToConvert) return;
    setConverting(true);
    setErrorAlert(null);

    try {
      const res = await fetch(`/api/quotes/${quoteToConvert.id}/convert-to-invoice`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setShowConvertConfirmModal(false);
        const jEntryMsg = data.journalEntryNumber
          ? ` Asiento contable registrado en el Libro Diario: #${data.journalEntryNumber}.`
          : "";
        setSuccessAlert(
          `¡Éxito! ${data.message}${jEntryMsg} Las cuentas por cobrar y los ingresos se han actualizado en tiempo real.`
        );
        fetchQuotes();
      } else {
        setErrorAlert(data.error || "Error al convertir la cotización a factura.");
      }
    } catch (err) {
      console.error(err);
      setErrorAlert("Error de conexión al procesar la facturación.");
    } finally {
      setConverting(false);
    }
  };

  // Abrir en editor de facturas para revisión previa
  const handleOpenInInvoiceEditor = (quote: Quote) => {
    if (onOpenInvoiceEditor) {
      onOpenInvoiceEditor({
        num: quote.quoteNumber.replace("COT-", "FAC-"),
        customer: quote.customerName,
        email: quote.customerEmail,
        date: new Date().toISOString().split("T")[0],
        due: quote.validUntil,
        paymentTerms: quote.paymentTerms,
        total: quote.total,
        status: "Pendiente",
        lines: quote.lines.map((l, i) => ({
          id: `line-cot-${i + 1}`,
          serviceDate: new Date().toISOString().split("T")[0],
          productId: "",
          productName: l.productName,
          sku: l.sku || "",
          description: l.description || "",
          quantity: l.quantity,
          rate: l.rate,
          amount: l.amount,
        })),
      });
    }
  };

  // Filtrado de tabla
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch =
        searchTerm === "" ||
        q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.salesRepName && q.salesRepName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        q.lines.some((l) => l.productName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" || q.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalQuoted = quotes.reduce((acc, q) => acc + (q.total || 0), 0);
    const approved = quotes.filter((q) => q.status === "Aprobada" || q.status === "Facturada");
    const totalApproved = approved.reduce((acc, q) => acc + (q.total || 0), 0);
    const facturadas = quotes.filter((q) => q.status === "Facturada");
    const countBorrador = quotes.filter((q) => q.status === "Borrador").length;
    const countEnviada = quotes.filter((q) => q.status === "Enviada").length;

    return {
      totalQuoted,
      totalApproved,
      facturadasCount: facturadas.length,
      pendingCount: countBorrador + countEnviada,
    };
  }, [quotes]);

  // Exportar a CSV
  const handleExportCSV = () => {
    const headers = [
      "Numero",
      "Fecha",
      "Valido_Hasta",
      "Cliente",
      "Vendedor",
      "Subtotal",
      "Descuento",
      "ISV",
      "Total",
      "Moneda",
      "Estado",
      "Factura_Vinculada",
    ];

    const rows = filteredQuotes.map((q) => [
      q.quoteNumber,
      q.quoteDate,
      q.validUntil,
      `"${q.customerName.replace(/"/g, '""')}"`,
      `"${(q.salesRepName || "Sin asignar").replace(/"/g, '""')}"`,
      q.subtotal.toFixed(2),
      q.discount.toFixed(2),
      q.tax.toFixed(2),
      q.total.toFixed(2),
      q.currency,
      q.status,
      q.invoiceNumber || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cotizaciones_Wayne_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aprobada":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aprobada
          </span>
        );
      case "Facturada":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Facturada
          </span>
        );
      case "Enviada":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Send className="w-3.5 h-3.5 text-amber-600" />
            Enviada
          </span>
        );
      case "Rechazada":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rechazada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Borrador
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas de Notificación */}
      {successAlert && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successAlert}</span>
          </div>
          <button
            onClick={() => setSuccessAlert(null)}
            className="text-emerald-500 hover:text-emerald-800 text-xs font-semibold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {errorAlert && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-sm font-medium">{errorAlert}</span>
          </div>
          <button
            onClick={() => setErrorAlert(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-semibold ml-4"
          >
            ✕
          </button>
        </div>
      )}

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
            <span>Regresar a Dashboard</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Ventas</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Historial de Cotizaciones</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Historial de Cotizaciones
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5]">
                Ciclo Comercial de Ventas
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestiona, consulta, imprime y convierte cotizaciones a facturas con partida automática en el Libro Diario.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchQuotes}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#f6821f]/20 cursor-pointer"
            >
              <span className="text-sm leading-none">+</span>
              <span>Crear cotización</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cotizado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Cotizado
            </span>
            <span className="p-2 bg-amber-50 text-[#f6821f] rounded-xl">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${metrics.totalQuoted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {quotes.length} cotizaciones generadas
          </p>
        </div>

        {/* Total Aprobado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monto Aprobado
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            ${metrics.totalApproved.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Listas o procesadas para despacho
          </p>
        </div>

        {/* Facturadas / Conectadas a Libros */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Convertidas a Factura
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {metrics.facturadasCount}
          </p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Check className="w-3 h-3 text-blue-500" />
            Contabilizadas en Libro Diario
          </p>
        </div>

        {/* En Proceso / Borrador */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              En Seguimiento
            </span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {metrics.pendingCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Borrador o enviadas a cliente
          </p>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por N.º, cliente o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#f6821f]/30 focus:border-[#f6821f] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "Todas" },
            { id: "Borrador", label: "Borrador" },
            { id: "Enviada", label: "Enviadas" },
            { id: "Aprobada", label: "Aprobadas" },
            { id: "Facturada", label: "Facturadas" },
            { id: "Rechazada", label: "Rechazadas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#fff7ed] text-[#f6821f] font-semibold border border-[#ffedd5]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Principal de Cotizaciones */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3.5 px-4">N.º Cotización</th>
                <th className="py-3.5 px-4">Fecha / Validez</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Vendedor</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Estado Comercial</th>
                <th className="py-3.5 px-4 text-center">Contabilidad & Factura</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#f6821f] mb-2" />
                    Cargando cotizaciones...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No se encontraron cotizaciones con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => {
                  const isExpired =
                    new Date(quote.validUntil) < new Date() &&
                    quote.status !== "Facturada" &&
                    quote.status !== "Aprobada";

                  return (
                    <tr
                      key={quote.id}
                      className="hover:bg-slate-50/60 transition group"
                    >
                      {/* N.º Cotización */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{quote.quoteNumber}</span>
                          {quote.status === "Facturada" && (
                            <span
                              title={`Vinculada a Factura N.º ${quote.invoiceNumber || ""}`}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800"
                            >
                              FAC
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Fecha / Validez */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800">{quote.quoteDate}</div>
                        <div
                          className={`text-[11px] flex items-center gap-1 ${
                            isExpired ? "text-rose-600 font-medium" : "text-slate-400"
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          Vence: {quote.validUntil}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{quote.customerName}</div>
                        {quote.customerEmail && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {quote.customerEmail}
                          </div>
                        )}
                      </td>

                      {/* Vendedor */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {quote.salesRepName || "Sin asignar"}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] text-slate-400 font-normal">{quote.currency}</span>
                      </td>

                      {/* Estado Comercial */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(quote.status)}
                      </td>

                      {/* Estado Contable & Facturación */}
                      <td className="py-3.5 px-4 text-center">
                        {quote.status === "Facturada" ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Check className="w-3 h-3" />
                              Asiento en Libro Diario
                            </span>
                            {quote.invoiceNumber && (
                              <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Factura: #{quote.invoiceNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            Extracontable (Pendiente)
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón de Conversión a Factura */}
                          {quote.status !== "Facturada" ? (
                            <button
                              onClick={() => {
                                setQuoteToConvert(quote);
                                setShowConvertConfirmModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs cursor-pointer"
                              title="Convertir a Factura y contabilizar en Libros"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Facturar
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (onNavigateToInvoices) onNavigateToInvoices();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200 cursor-pointer"
                              title="Ver en facturas"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver Fac.
                            </button>
                          )}

                          {/* Ver / Imprimir */}
                          <button
                            onClick={() => {
                              setActivePrintQuote(quote);
                              setShowPrintModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Vista previa e impresión"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          {quote.status !== "Facturada" && (
                            <button
                              onClick={() => handleOpenEdit(quote)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Editar cotización"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Eliminar */}
                          {quote.status !== "Facturada" && (
                            <button
                              onClick={() => handleDeleteQuote(quote)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Eliminar cotización"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* ================= PÁGINA COMPLETA: CREAR / EDITAR COTIZACIÓN ================= */}
      {showEditorModal && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-100 text-slate-800 animate-in fade-in duration-150 overflow-hidden print:static print:inset-auto print:bg-white print:overflow-visible print:block print:p-0">
          {/* TOP HEADER BAR */}
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs print:hidden">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer w-fit"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Regresar</span>
              </button>

              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2 border-l border-slate-200 pl-4">
                <span>{formData.id ? `Editar Cotización ${formData.quoteNumber}` : `Cotización ${formData.quoteNumber}`}</span>
              </h1>

              {/* Sub-tabs: Editar vs Vista de PDF */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-6">
                {(["Editar", "Vista de PDF"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveEditorTab(tab)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      activeEditorTab === tab
                        ? "bg-[#fff7ed] text-[#f6821f] border border-[#f6821f]/30"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Cerrar editor"
              >
                ✕
              </button>
            </div>
          </header>

          {/* MAIN CONTENT WORKSPACE */}
          <div className="flex-1 flex overflow-hidden print:hidden">
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

              {/* PESTAÑA: EDITAR */}
              {activeEditorTab === "Editar" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs max-w-5xl mx-auto space-y-8">
                  {/* Fila Superior: Membrete corporativo y Correlativo */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-[#fff7ed] flex items-center justify-center text-[#f6821f] font-bold text-base border border-[#ffedd5]">
                          W
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-slate-900 tracking-tight">
                            WAYNE TRADEMARK DE HONDURAS
                          </h2>
                          <p className="text-xs text-slate-500">
                            Printing & Packaging • RTN: 05019008183490
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Zip Búfalo Edificio 1B, Villanueva, Cortés • Tel: +504 9452-2666
                      </p>
                    </div>

                    <div className="text-right sm:w-72 space-y-2">
                      <div className="inline-block px-3 py-1 bg-[#fff7ed] border border-[#ffedd5] text-[#f6821f] font-bold text-xs rounded-lg uppercase tracking-wider">
                        Cotización Comercial
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          N.º Cotización
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.quoteNumber}
                          onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })}
                          className="w-full px-3 py-1.5 text-right font-mono font-bold text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-[#f6821f]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Datos del Cliente y Condiciones Comerciales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70 text-xs">
                    {/* Columna Izquierda: Cliente */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Información del Cliente
                      </span>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Seleccionar Cliente
                        </label>
                        <select
                          value={formData.customerId}
                          onChange={(e) => handleCustomerSelect(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#f6821f]/30 focus:border-[#f6821f]"
                        >
                          <option value="">-- Seleccionar de catálogo existente --</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nombre o Razón Social *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nombre completo del cliente..."
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:border-[#f6821f]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            RTN / ID Fiscal
                          </label>
                          <input
                            type="text"
                            placeholder="0501..."
                            value={formData.customerRtn}
                            onChange={(e) => setFormData({ ...formData, customerRtn: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Teléfono
                          </label>
                          <input
                            type="text"
                            placeholder="+504..."
                            value={formData.customerPhone}
                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Correo Electrónico
                          </label>
                          <input
                            type="email"
                            placeholder="correo@empresa.hn"
                            value={formData.customerEmail}
                            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Dirección Fiscal
                          </label>
                          <input
                            type="text"
                            placeholder="Ciudad, parque industrial..."
                            value={formData.customerAddress}
                            onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Condiciones */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Términos & Fechas
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Fecha de Emisión
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.quoteDate}
                            onChange={(e) => setFormData({ ...formData, quoteDate: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Válida Hasta
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.validUntil}
                            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Términos de Pago
                          </label>
                          <select
                            value={formData.paymentTerms}
                            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          >
                            <option value="Contado">Contado</option>
                            <option value="Neto 15 días">Neto 15 días</option>
                            <option value="Neto 30 días">Neto 30 días</option>
                            <option value="Neto 45 días">Neto 45 días</option>
                            <option value="Neto 60 días">Neto 60 días</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Moneda
                          </label>
                          <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          >
                            <option value="USD">USD ($ - Dólar Estadounidense)</option>
                            <option value="HNL">HNL (L - Lempira Hondureño)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Vendedor Asignado
                          </label>
                          <select
                            value={formData.salesRepId}
                            onChange={(e) => {
                              const rep = salesReps.find((r) => r.id === e.target.value);
                              setFormData({
                                ...formData,
                                salesRepId: e.target.value,
                                salesRepName: rep ? rep.name : "",
                              });
                            }}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          >
                            <option value="">-- Sin asignar --</option>
                            {salesReps.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Estado Comercial
                          </label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#f6821f]"
                          >
                            <option value="Borrador">Borrador</option>
                            <option value="Enviada">Enviada al Cliente</option>
                            <option value="Aprobada">Aprobada</option>
                            <option value="Rechazada">Rechazada</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Productos / Servicios */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        Producto o servicio
                      </h3>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3 w-8 text-center">#</th>
                            <th className="p-3 min-w-[200px]">Producto / Catálogo</th>
                            <th className="p-3 w-28">SKU</th>
                            <th className="p-3 min-w-[220px]">Descripción</th>
                            <th className="p-3 w-20 text-right">Cant.</th>
                            <th className="p-3 w-28 text-right">Precio Unit.</th>
                            <th className="p-3 w-28 text-right">Importe</th>
                            <th className="p-3 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {formData.lines.map((line, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition">
                              <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                              <td className="p-3">
                                <input
                                  type="text"
                                  list={`inventory-quote-list-${idx}`}
                                  placeholder="Buscar o escribir producto..."
                                  required
                                  value={line.productName}
                                  onChange={(e) => handleLineChange(idx, "productName", e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-semibold text-slate-900 focus:border-[#f6821f] mb-1"
                                />
                                {inventory.length > 0 && (
                                  <select
                                    value={line.sku || ""}
                                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                                    className="w-full px-2 py-0.5 text-[11px] text-slate-500 border border-slate-200 rounded-md bg-slate-50/80"
                                  >
                                    <option value="">-- Catálogo de Inventario --</option>
                                    {inventory.map((item) => (
                                      <option key={item.id} value={item.sku}>
                                        {item.sku} - {item.description.slice(0, 32)} (${item.price})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              <td className="p-3 font-mono text-[11px] text-[#f6821f] font-semibold">
                                {line.sku || "—"}
                              </td>

                              <td className="p-3">
                                <input
                                  type="text"
                                  placeholder="Especificaciones (tintas, sustrato, acabado)..."
                                  value={line.description || ""}
                                  onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:border-[#f6821f]"
                                />
                              </td>

                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  min="1"
                                  step="any"
                                  value={line.quantity}
                                  onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                                  className="w-16 px-2 py-1 text-xs rounded-lg border border-slate-200 text-right font-mono focus:border-[#f6821f]"
                                />
                              </td>

                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.rate}
                                  onChange={(e) => handleLineChange(idx, "rate", e.target.value)}
                                  className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-200 text-right font-mono focus:border-[#f6821f]"
                                />
                              </td>

                              <td className="p-3 text-right font-bold text-slate-900 font-mono">
                                ${line.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  disabled={formData.lines.length <= 1}
                                  className="text-slate-400 hover:text-red-600 text-xs font-bold p-1 cursor-pointer disabled:opacity-20"
                                  title="Eliminar línea"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleAddLine}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-300/80"
                      >
                        <span>+ Agregar producto o servicio</span>
                      </button>
                    </div>
                  </div>

                  {/* Sección Inferior: Notas y Desglose de Totales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Condiciones Comerciales & Validez
                        </label>
                        <textarea
                          rows={3}
                          value={formData.termsConditions || ""}
                          onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:border-[#f6821f]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Nota para el cliente
                        </label>
                        <textarea
                          rows={2}
                          value={formData.notes || ""}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:border-[#f6821f]"
                        />
                      </div>

                      {/* Tarjeta de Impacto Contable Proyectado */}
                      <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-blue-900 space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-xs text-blue-800">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span>Partida Doble Automática en Libros (al Facturar)</span>
                        </div>
                        <p className="text-[11px] text-blue-700">
                          Al convertir esta cotización en factura, el sistema generará de forma automática el asiento en el Libro Diario:
                        </p>
                        <div className="space-y-1 font-mono text-[11px] bg-white p-2.5 rounded-xl border border-blue-100">
                          <div className="flex justify-between text-slate-700">
                            <span>[Débito] 1200 - CxC Clientes</span>
                            <span className="font-semibold text-emerald-700">+${formCalculations.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-700">
                            <span>[Crédito] 4000 - Ingresos Ventas</span>
                            <span className="font-semibold text-slate-900">-${formCalculations.taxableBase.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-700">
                            <span>[Crédito] 2150 - Débito Fiscal ISV</span>
                            <span className="font-semibold text-slate-900">-${formCalculations.tax.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desglose de Totales */}
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Subtotal:</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ${formCalculations.subtotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                            Descuento Comercial ($):
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.discount}
                            onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                            className="w-24 px-2 py-1 text-right text-xs bg-white border border-slate-300 rounded-lg focus:border-[#f6821f]"
                          />
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                            Tasa de Impuesto (I.S.V.):
                          </span>
                          <select
                            value={formData.taxRate}
                            onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                            className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                          >
                            <option value={15}>15% (SAR)</option>
                            <option value={18}>18% (Especial)</option>
                            <option value={0}>0% (Exento)</option>
                          </select>
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                            Total I.S.V. ({formData.taxRate}%):
                          </span>
                          <span className="font-mono font-medium text-slate-800">
                            ${formCalculations.tax.toFixed(2)}
                          </span>
                        </div>

                        <div className="border-t border-slate-300 pt-3">
                          <div className="flex justify-between items-center py-2 px-3 bg-slate-200 border border-slate-300 text-slate-900 rounded-xl shadow-xs">
                            <span className="font-black text-xs uppercase tracking-wider text-slate-700">Total Cotización:</span>
                            <span className="font-mono font-black text-xl text-[#f6821f]">
                              ${formCalculations.total.toFixed(2)} <span className="text-xs font-normal text-slate-600">{formData.currency}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: VISTA DE PDF */}
              {activeEditorTab === "Vista de PDF" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-xs max-w-4xl mx-auto space-y-6 text-slate-800 animate-in fade-in duration-150">
                  {/* Membrete formal */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                    <div>
                      <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                        WAYNE TRADEMARK PRINTING AND PACKAGING
                      </h1>
                      <p className="text-xs font-semibold text-slate-600">DE HONDURAS S. DE R.L.</p>
                      <p className="text-xs text-slate-500 mt-1">RTN: 05019008183490</p>
                      <p className="text-xs text-slate-500">Parque Industrial Zip Búfalo, Edificio 1B, Villanueva, Cortés</p>
                      <p className="text-xs text-slate-500">Tel: +504 9452-2666 | info@waynetrademarkhn.com</p>
                    </div>

                    <div className="text-right">
                      <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-[#f6821f] font-bold text-sm rounded-lg">
                        COTIZACIÓN
                      </div>
                      <p className="text-base font-extrabold text-slate-900 mt-2">{formData.quoteNumber}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Fecha: {formData.quoteDate}</p>
                      <p className="text-xs text-slate-500">Válida hasta: {formData.validUntil}</p>
                    </div>
                  </div>

                  {/* Datos del Cliente */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                    <div>
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">Cotizado Para:</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{formData.customerName || "Cliente Contado"}</p>
                      {formData.customerRtn && <p className="text-slate-600 mt-0.5">RTN: {formData.customerRtn}</p>}
                      {formData.customerAddress && <p className="text-slate-500 mt-0.5">{formData.customerAddress}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-semibold uppercase text-[10px]">Condiciones:</p>
                      <p className="text-slate-700 mt-0.5"><span className="font-semibold">Términos:</span> {formData.paymentTerms}</p>
                      <p className="text-slate-700 mt-0.5"><span className="font-semibold">Moneda:</span> {formData.currency}</p>
                      <p className="text-slate-700 mt-0.5"><span className="font-semibold">Vendedor:</span> {formData.salesRepName || "Wayne Sales"}</p>
                    </div>
                  </div>

                  {/* Tabla de Productos */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-300 text-slate-600 font-bold">
                        <th className="py-2 px-2 w-12 text-center">Ítem</th>
                        <th className="py-2 px-2">Descripción</th>
                        <th className="py-2 px-2 w-20 text-center">Cantidad</th>
                        <th className="py-2 px-2 w-24 text-right">Precio Unit.</th>
                        <th className="py-2 px-2 w-28 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {formData.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-2 text-center text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-2">
                            <div className="font-bold text-slate-900">{l.productName || "Artículo"}</div>
                            {l.description && <div className="text-slate-500 text-[11px]">{l.description}</div>}
                          </td>
                          <td className="py-2.5 px-2 text-center font-medium">{l.quantity}</td>
                          <td className="py-2.5 px-2 text-right">${(Number(l.rate) || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900">${(Number(l.amount) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totales */}
                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-semibold">${formCalculations.subtotal.toFixed(2)}</span>
                      </div>
                      {formCalculations.taxableBase < formCalculations.subtotal && (
                        <div className="flex justify-between text-slate-500">
                          <span>Descuento:</span>
                          <span>-${(Number(formData.discount) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>I.S.V. ({formData.taxRate}%):</span>
                        <span className="font-semibold">${formCalculations.tax.toFixed(2)}</span>
                      </div>
                      <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                        <span>Total General ({formData.currency}):</span>
                        <span>${formCalculations.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Firmas */}
                  <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs text-slate-600">
                    <div className="border-t border-slate-300 pt-2">
                      <p className="font-semibold text-slate-900">Wayne Trademark Printing & Packaging</p>
                      <p className="text-[11px] text-slate-400">Firma y Sello Autorizado</p>
                    </div>
                    <div className="border-t border-slate-300 pt-2">
                      <p className="font-semibold text-slate-900">{formData.customerName || "Cliente"}</p>
                      <p className="text-[11px] text-slate-400">Aceptación de Cotización</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FIXED BOTTOM ACTION BAR */}
          <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between z-30 shadow-md print:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Imprimir o descargar</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleSaveQuote()}
                className="px-5 py-2 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-bold text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>Guardar cotización</span>
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE CONVERSIÓN A FACTURA */}
      {showConvertConfirmModal && quoteToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200 shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Convertir a Factura Oficial
                </h3>
                <p className="text-xs text-slate-500">
                  Cotización {quoteToConvert.quoteNumber}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold">{quoteToConvert.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto Total:</span>
                <span className="font-bold text-slate-900">
                  ${quoteToConvert.total.toFixed(2)} {quoteToConvert.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ítems a Facturar:</span>
                <span>{quoteToConvert.lines.length} productos</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800">Contabilización Automática en Libros:</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Al confirmar, se emitirá la Factura de Ventas y se generará inmediatamente el asiento de partida doble en el Libro Diario (Débito en CxC Clientes 1200 y Crédito en Ventas 4000 e ISV 2150).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConvertConfirmModal(false)}
                disabled={converting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  setShowConvertConfirmModal(false);
                  handleOpenInInvoiceEditor(quoteToConvert);
                }}
                disabled={converting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                title="Abrir en el editor para modificar antes de emitir"
              >
                Revisar en Editor
              </button>

              <button
                onClick={handleExecuteConvertToInvoice}
                disabled={converting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {converting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Facturando...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Convertir y Contabilizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISTA PREVIA E IMPRESIÓN FORMAL DE COTIZACIÓN */}
      {showPrintModal && activePrintQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl my-6 overflow-hidden">
            {/* Header de herramientas */}
            <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between no-print">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Printer className="w-4 h-4 text-slate-500" />
                Vista Previa de Impresión / PDF
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#f6821f] hover:bg-[#e06f12] rounded-lg transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir / Guardar PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Documento Imprimible */}
            <div ref={printAreaRef} className="p-8 sm:p-12 text-slate-800 space-y-6 bg-white print:p-0">
              {/* Membrete */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    WAYNE TRADEMARK PRINTING AND PACKAGING
                  </h1>
                  <p className="text-xs font-semibold text-slate-600">DE HONDURAS S. DE R.L.</p>
                  <p className="text-xs text-slate-500 mt-1">RTN: 05019008183490</p>
                  <p className="text-xs text-slate-500">
                    Parque Industrial Zip Búfalo, Edificio 1B, Villanueva, Cortés
                  </p>
                  <p className="text-xs text-slate-500">Tel: +504 9452-2666 | info@waynetrademarkhn.com</p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-[#f6821f] font-bold text-sm rounded-lg">
                    COTIZACIÓN
                  </div>
                  <p className="text-base font-extrabold text-slate-900 mt-2">
                    {activePrintQuote.quoteNumber}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Fecha: {activePrintQuote.quoteDate}</p>
                  <p className="text-xs text-slate-500">Válida hasta: {activePrintQuote.validUntil}</p>
                </div>
              </div>

              {/* Datos del Cliente */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Cotizado Para:</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{activePrintQuote.customerName}</p>
                  {activePrintQuote.customerRtn && (
                    <p className="text-slate-600 mt-0.5">RTN: {activePrintQuote.customerRtn}</p>
                  )}
                  {activePrintQuote.customerAddress && (
                    <p className="text-slate-500 mt-0.5">{activePrintQuote.customerAddress}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Condiciones:</p>
                  <p className="text-slate-700 mt-0.5">
                    <span className="font-semibold">Términos de Pago:</span> {activePrintQuote.paymentTerms}
                  </p>
                  <p className="text-slate-700 mt-0.5">
                    <span className="font-semibold">Moneda:</span> {activePrintQuote.currency}
                  </p>
                  <p className="text-slate-700 mt-0.5">
                    <span className="font-semibold">Vendedor:</span> {activePrintQuote.salesRepName || "Wayne Sales"}
                  </p>
                </div>
              </div>

              {/* Tabla de Productos */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600 font-bold">
                    <th className="py-2 px-2 w-12 text-center">Ítem</th>
                    <th className="py-2 px-2">Descripción</th>
                    <th className="py-2 px-2 w-20 text-center">Cantidad</th>
                    <th className="py-2 px-2 w-24 text-right">Precio Unit.</th>
                    <th className="py-2 px-2 w-28 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activePrintQuote.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-2 text-center text-slate-400">{i + 1}</td>
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-slate-900">{l.productName}</div>
                        {l.description && <div className="text-slate-500 text-[11px]">{l.description}</div>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium">{l.quantity}</td>
                      <td className="py-2.5 px-2 text-right">
                        ${l.rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                        ${l.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${activePrintQuote.subtotal.toFixed(2)}</span>
                  </div>
                  {activePrintQuote.discount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Descuento Comercial:</span>
                      <span>-${activePrintQuote.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>I.S.V. ({activePrintQuote.taxRate || 15}%):</span>
                    <span className="font-semibold">${activePrintQuote.tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>Total General ({activePrintQuote.currency}):</span>
                    <span>${activePrintQuote.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notas y Términos */}
              <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Observaciones y Condiciones:</p>
                <p>{activePrintQuote.termsConditions || "Oferta sujeta a especificaciones de arte y corrida."}</p>
                {activePrintQuote.notes && <p className="text-slate-400">{activePrintQuote.notes}</p>}
              </div>

              {/* Firmas */}
              <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs text-slate-600">
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-semibold text-slate-900">Wayne Trademark Printing & Packaging</p>
                  <p className="text-[11px] text-slate-400">Firma y Sello Autorizado</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-semibold text-slate-900">{activePrintQuote.customerName}</p>
                  <p className="text-[11px] text-slate-400">Aceptación de Cotización</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
