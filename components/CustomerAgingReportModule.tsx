"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CardSkeleton, TableRowsSkeleton } from "@/components/Skeleton";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Printer,
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  UserCheck,
  ExternalLink,
} from "lucide-react";

interface AgingInvoiceDetail {
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

interface CustomerAgingRow {
  customerId: string;
  customerName: string;
  customerRtn?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  totalBalance: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  daysOver90: number;
  oldestDueDate?: string;
  maxDaysPastDue: number;
  invoicesCount: number;
  invoices: AgingInvoiceDetail[];
}

interface AgingSummary {
  totalReceivables: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  daysOver90: number;
  totalInvoices: number;
  totalCustomers: number;
  overdueTotal: number;
  currentPct: number;
  days1to30Pct: number;
  days31to60Pct: number;
  days61to90Pct: number;
  daysOver90Pct: number;
  overduePct: number;
}

interface CustomerAgingReportProps {
  onBack: () => void;
  onNavigateToInvoice?: (invoiceNumber: string) => void;
  onNavigateToPayment?: (customerName: string) => void;
  onNavigateToStatement?: (customerNameOrId: string) => void;
  formatCurrency?: (val: number) => string;
}

export default function CustomerAgingReportModule({
  onBack,
  onNavigateToInvoice,
  onNavigateToPayment,
  onNavigateToStatement,
  formatCurrency = (val: number) =>
    `$${val.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
}: CustomerAgingReportProps) {
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currency, setCurrency] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<"ALL" | "OVERDUE_ONLY" | "CRITICAL_60">(
    "ALL"
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<AgingSummary | null>(null);
  const [customers, setCustomers] = useState<CustomerAgingRow[]>([]);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (asOfDate) params.set("asOfDate", asOfDate);
      if (currency !== "ALL") params.set("currency", currency);
      if (search) params.set("search", search);

      const res = await fetch(`/api/reports/customer-aging?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data.summary);
        setCustomers(json.data.customers || []);
      }
    } catch (err) {
      console.error("Error fetching customer aging report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgingData();
  }, [asOfDate, currency]);

  const toggleExpand = (customerId: string) => {
    setExpandedCustomers((prev) => ({
      ...prev,
      [customerId]: !prev[customerId],
    }));
  };

  const toggleExpandAll = () => {
    const allExpanded = Object.keys(expandedCustomers).length === customers.length;
    if (allExpanded) {
      setExpandedCustomers({});
    } else {
      const next: Record<string, boolean> = {};
      customers.forEach((c) => {
        next[c.customerId] = true;
      });
      setExpandedCustomers(next);
    }
  };

  // Client-side filtering
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (c.customerRtn && c.customerRtn.toLowerCase().includes(search.toLowerCase()));

      let matchesFilter = true;
      if (filterType === "OVERDUE_ONLY") {
        matchesFilter = c.days1to30 > 0 || c.days31to60 > 0 || c.days61to90 > 0 || c.daysOver90 > 0;
      } else if (filterType === "CRITICAL_60") {
        matchesFilter = c.days31to60 > 0 || c.days61to90 > 0 || c.daysOver90 > 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [customers, search, filterType]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!customers || customers.length === 0) return;

    const headers = [
      "Cliente",
      "RTN",
      "Email",
      "Facturas Pendientes",
      "Corriente",
      "1 a 30 Días",
      "31 a 60 Días",
      "61 a 90 Días",
      "Más de 90 Días",
      "Total Saldo",
      "Días Máx. Vencido",
    ];

    const rows = customers.map((c) => [
      `"${c.customerName.replace(/"/g, '""')}"`,
      `"${c.customerRtn || ""}"`,
      `"${c.customerEmail || ""}"`,
      c.invoicesCount,
      c.current.toFixed(2),
      c.days1to30.toFixed(2),
      c.days31to60.toFixed(2),
      c.days61to90.toFixed(2),
      c.daysOver90.toFixed(2),
      c.totalBalance.toFixed(2),
      c.maxDaysPastDue > 0 ? c.maxDaysPastDue : 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Antiguedad_Saldos_Clientes_${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 p-2 sm:p-6 print:p-0 print:m-0">
      {/* ================= PRINT HEADER (visible only during print) ================= */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Wayne Trademark Printing &amp; Packaging de Honduras S. de R.L.
            </h1>
            <p className="text-xs text-slate-600">
              RTN: 05019008183490 • ZIP Búfalo, Villanueva, Cortés
            </p>
            <h2 className="text-base font-bold text-slate-800 mt-2">
              Reporte de Antigüedad de Saldos de Clientes (Cuentas por Cobrar)
            </h2>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>
              <b>Fecha de corte:</b> {asOfDate}
            </p>
            <p>
              <b>Fecha de emisión:</b> {new Date().toLocaleDateString("es-HN")}
            </p>
          </div>
        </div>
      </div>

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
            <span>Regresar a Reportes</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Reportes Financieros</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Antigüedad de Saldos Clientes</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Antigüedad de Saldos de Clientes
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5]">
                Cuentas por Cobrar (AR)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Estratificación cronológica de facturas de venta y saldos pendientes por cobrar de clientes.
            </p>
          </div>

          {/* Global Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchAgingData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Actualizar reporte"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#f6821f]" : ""}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-[#f6821f]/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= EXECUTIVE KPI SUMMARY CARDS ================= */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Total Cuentas por Cobrar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Total Cuentas por Cobrar
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#f6821f] flex items-center justify-center font-bold text-xs">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(summary.totalReceivables)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{summary.totalCustomers} clientes</span>
              <span>{summary.totalInvoices} facturas</span>
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f6821f]" />
          </div>

          {/* Card 2: Corriente (Al día) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Al Día (Corriente)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 tracking-tight">
                {formatCurrency(summary.current)}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {summary.currentPct}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Sin vencer (en término)
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
          </div>

          {/* Card 3: 1 a 30 días */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                1 a 30 Días
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 tracking-tight">
                {formatCurrency(summary.days1to30)}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                {summary.days1to30Pct}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mora temprana de cobro
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
          </div>

          {/* Card 4: 31 a 60 días */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                31 a 60 Días
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#e07216] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#e07216] tracking-tight">
                {formatCurrency(summary.days31to60)}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#e07216]">
                {summary.days31to60Pct}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mora intermedia de cobro
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500" />
          </div>

          {/* Card 5: 61 a 90 días */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                61 a 90 Días
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 tracking-tight">
                {formatCurrency(summary.days61to90)}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                {summary.days61to90Pct}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Gestión urgente requerida
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
          </div>

          {/* Card 6: Más de 90 días */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Más de 90 Días
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-900 tracking-tight">
                {formatCurrency(summary.daysOver90)}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                {summary.daysOver90Pct}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Riesgo alto de incobrabilidad
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-700" />
          </div>
        </div>
      ) : null}

      {/* Visual Risk Distribution Bar */}
      {summary && summary.totalReceivables > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Distribución Porcentual de la Cartera</span>
              <span className="text-[11px] font-normal text-slate-500">
                ({summary.overduePct}% en mora vencida)
              </span>
            </span>
            <div className="flex items-center gap-4 text-[11px] font-medium">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Al día: {summary.currentPct}%
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                1-30d: {summary.days1to30Pct}%
              </span>
              <span className="flex items-center gap-1 text-orange-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                31-60d: {summary.days31to60Pct}%
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                61-90d: {summary.days61to90Pct}%
              </span>
              <span className="flex items-center gap-1 text-red-800">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                &gt;90d: {summary.daysOver90Pct}%
              </span>
            </div>
          </div>

          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {summary.currentPct > 0 && (
              <div
                style={{ width: `${summary.currentPct}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`Corriente: ${formatCurrency(summary.current)} (${summary.currentPct}%)`}
              />
            )}
            {summary.days1to30Pct > 0 && (
              <div
                style={{ width: `${summary.days1to30Pct}%` }}
                className="bg-amber-400 h-full transition-all duration-300"
                title={`1-30 Días: ${formatCurrency(summary.days1to30)} (${summary.days1to30Pct}%)`}
              />
            )}
            {summary.days31to60Pct > 0 && (
              <div
                style={{ width: `${summary.days31to60Pct}%` }}
                className="bg-orange-500 h-full transition-all duration-300"
                title={`31-60 Días: ${formatCurrency(summary.days31to60)} (${summary.days31to60Pct}%)`}
              />
            )}
            {summary.days61to90Pct > 0 && (
              <div
                style={{ width: `${summary.days61to90Pct}%` }}
                className="bg-rose-500 h-full transition-all duration-300"
                title={`61-90 Días: ${formatCurrency(summary.days61to90)} (${summary.days61to90Pct}%)`}
              />
            )}
            {summary.daysOver90Pct > 0 && (
              <div
                style={{ width: `${summary.daysOver90Pct}%` }}
                className="bg-red-600 h-full transition-all duration-300"
                title={`>90 Días: ${formatCurrency(summary.daysOver90)} (${summary.daysOver90Pct}%)`}
              />
            )}
          </div>
        </div>
      )}

      {/* ================= FILTER TOOLBAR ================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* As Of Date Selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Corte al:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="text-xs bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("OVERDUE_ONLY")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === "OVERDUE_ONLY"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Solo con Mora
            </button>
            <button
              type="button"
              onClick={() => setFilterType("CRITICAL_60")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === "CRITICAL_60"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Crítico (&gt;30d)
            </button>
          </div>

          {/* Currency Filter */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f6821f] cursor-pointer"
          >
            <option value="ALL">Todas las monedas</option>
            <option value="USD">USD ($)</option>
            <option value="HNL">HNL (L)</option>
          </select>
        </div>

        {/* Search and Expand All */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente o RTN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f6821f] w-64"
            />
          </div>

          <button
            type="button"
            onClick={toggleExpandAll}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs shrink-0"
          >
            {Object.keys(expandedCustomers).length === customers.length && customers.length > 0
              ? "Colapsar todo"
              : "Expandir todo"}
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold tracking-wider uppercase text-[10px]">
                <th className="py-3.5 px-4 w-10 text-center">#</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4 text-center">Facturas</th>
                <th className="py-3.5 px-4 text-right text-emerald-800 bg-emerald-50/40">Corriente</th>
                <th className="py-3.5 px-4 text-right text-amber-800 bg-amber-50/40">1 - 30 d</th>
                <th className="py-3.5 px-4 text-right text-orange-800 bg-orange-50/40">31 - 60 d</th>
                <th className="py-3.5 px-4 text-right text-rose-800 bg-rose-50/40">61 - 90 d</th>
                <th className="py-3.5 px-4 text-right text-red-800 bg-red-50/40">&gt; 90 d</th>
                <th className="py-3.5 px-4 text-right font-extrabold text-slate-900 bg-slate-100/60">Total Adeudado</th>
                <th className="py-3.5 px-4 text-center print:hidden">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <TableRowsSkeleton rows={6} cols={10} />
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No se encontraron saldos pendientes</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Todos los clientes están al día o no coinciden con los filtros aplicados.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => {
                  const isExpanded = !!expandedCustomers[c.customerId];
                  const hasOverdue = c.days1to30 > 0 || c.days31to60 > 0 || c.days61to90 > 0 || c.daysOver90 > 0;

                  return (
                    <React.Fragment key={c.customerId || idx}>
                      <tr
                        onClick={() => toggleExpand(c.customerId)}
                        className={`hover:bg-slate-50/80 transition cursor-pointer ${
                          isExpanded ? "bg-slate-50/60 font-medium" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(c.customerId);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#f6821f]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{c.customerName}</span>
                            {hasOverdue && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Mora {c.maxDaysPastDue}d
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-normal">
                            {c.customerRtn && <span>RTN: {c.customerRtn}</span>}
                            {c.customerEmail && <span>{c.customerEmail}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {c.invoicesCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-700 bg-emerald-50/20">
                          {c.current > 0 ? formatCurrency(c.current) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-amber-700 bg-amber-50/20">
                          {c.days1to30 > 0 ? formatCurrency(c.days1to30) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-orange-700 bg-orange-50/20">
                          {c.days31to60 > 0 ? formatCurrency(c.days31to60) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-rose-700 bg-rose-50/20">
                          {c.days61to90 > 0 ? formatCurrency(c.days61to90) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-red-700 bg-red-50/20">
                          {c.daysOver90 > 0 ? formatCurrency(c.daysOver90) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 bg-slate-100/50">
                          {formatCurrency(c.totalBalance)}
                        </td>
                        <td className="py-3 px-4 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {onNavigateToStatement && (
                              <button
                                type="button"
                                onClick={() => onNavigateToStatement(c.customerId || c.customerName)}
                                title="Ver Estado de Cuenta individual"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition cursor-pointer"
                              >
                                Estado
                              </button>
                            )}
                            {onNavigateToPayment && (
                              <button
                                type="button"
                                onClick={() => onNavigateToPayment(c.customerName)}
                                title="Registrar Cobro"
                                className="px-2.5 py-1 rounded-lg bg-[#fff7ed] hover:bg-[#ffedd5] text-[#f6821f] text-[11px] font-bold border border-[#fed7aa] transition cursor-pointer"
                              >
                                Cobrar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Invoices Detail Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={10} className="p-4 pl-12">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-[#f6821f]" />
                                  <span>Desglose de facturas pendientes de {c.customerName}</span>
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {c.invoices.length} {c.invoices.length === 1 ? "factura pendiente" : "facturas pendientes"}
                                </span>
                              </div>

                              <table className="w-full text-left text-[11px]">
                                <thead>
                                  <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                                    <th className="py-2">Factura N.º</th>
                                    <th className="py-2">Fecha Emisión</th>
                                    <th className="py-2">Fecha Vencimiento</th>
                                    <th className="py-2">Términos</th>
                                    <th className="py-2 text-center">Días de Vencimiento</th>
                                    <th className="py-2 text-center">Tramo</th>
                                    <th className="py-2 text-right">Importe Factura</th>
                                    <th className="py-2 text-right">Saldo Pendiente</th>
                                    <th className="py-2 text-center print:hidden">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {c.invoices.map((inv) => {
                                    let badgeColor = "bg-emerald-100 text-emerald-800";
                                    let bucketLabel = "Corriente";

                                    if (inv.bucket === "DAYS_1_30") {
                                      badgeColor = "bg-amber-100 text-amber-800";
                                      bucketLabel = "1 - 30 Días";
                                    } else if (inv.bucket === "DAYS_31_60") {
                                      badgeColor = "bg-orange-100 text-orange-800";
                                      bucketLabel = "31 - 60 Días";
                                    } else if (inv.bucket === "DAYS_61_90") {
                                      badgeColor = "bg-rose-100 text-rose-800";
                                      bucketLabel = "61 - 90 Días";
                                    } else if (inv.bucket === "DAYS_OVER_90") {
                                      badgeColor = "bg-red-200 text-red-900 font-bold";
                                      bucketLabel = "> 90 Días";
                                    }

                                    return (
                                      <tr key={inv.id} className="hover:bg-slate-50/80">
                                        <td className="py-2 font-mono font-bold text-slate-800">
                                          {inv.invoiceNumber}
                                        </td>
                                        <td className="py-2 text-slate-600">{inv.invoiceDate}</td>
                                        <td className="py-2 text-slate-800 font-medium">{inv.dueDate}</td>
                                        <td className="py-2 text-slate-500">{inv.paymentTerms}</td>
                                        <td className="py-2 text-center font-medium">
                                          {inv.daysPastDue <= 0 ? (
                                            <span className="text-emerald-600">Al día ({Math.abs(inv.daysPastDue)}d restantes)</span>
                                          ) : (
                                            <span className="text-red-600 font-bold">
                                              {inv.daysPastDue} {inv.daysPastDue === 1 ? "día vencido" : "días vencidos"}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 text-center">
                                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>
                                            {bucketLabel}
                                          </span>
                                        </td>
                                        <td className="py-2 text-right text-slate-500 font-mono">
                                          {formatCurrency(inv.total)}
                                        </td>
                                        <td className="py-2 text-right text-slate-900 font-bold font-mono">
                                          {formatCurrency(inv.balance)}
                                        </td>
                                        <td className="py-2 text-center print:hidden">
                                          <div className="flex items-center justify-center gap-1.5">
                                            {onNavigateToInvoice && (
                                              <button
                                                type="button"
                                                onClick={() => onNavigateToInvoice(inv.invoiceNumber)}
                                                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                                                title="Ver detalle de factura"
                                              >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Totals */}
            {summary && filteredCustomers.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-slate-900 text-xs">
                  <td colSpan={2} className="py-4 px-4 uppercase tracking-wider">
                    TOTAL GENERAL CARTERA
                  </td>
                  <td className="py-4 px-4 text-center">
                    {summary.totalInvoices} facturas
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-800 bg-emerald-100/40">
                    {formatCurrency(summary.current)}
                  </td>
                  <td className="py-4 px-4 text-right text-amber-800 bg-amber-100/40">
                    {formatCurrency(summary.days1to30)}
                  </td>
                  <td className="py-4 px-4 text-right text-orange-800 bg-orange-100/40">
                    {formatCurrency(summary.days31to60)}
                  </td>
                  <td className="py-4 px-4 text-right text-rose-800 bg-rose-100/40">
                    {formatCurrency(summary.days61to90)}
                  </td>
                  <td className="py-4 px-4 text-right text-red-900 bg-red-100/40">
                    {formatCurrency(summary.daysOver90)}
                  </td>
                  <td className="py-4 px-4 text-right text-base text-[#f6821f] bg-slate-200/50">
                    {formatCurrency(summary.totalReceivables)}
                  </td>
                  <td className="py-4 px-4 print:hidden" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
