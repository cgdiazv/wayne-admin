"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Building2,
  CreditCard,
  Filter,
} from "lucide-react";

interface AgingBillDetail {
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

interface VendorAgingRow {
  vendorId: string;
  vendorName: string;
  macolaCode?: string | null;
  vendorEmail?: string | null;
  vendorPhone?: string | null;
  totalBalance: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  daysOver90: number;
  oldestDueDate?: string;
  maxDaysPastDue: number;
  billsCount: number;
  bills: AgingBillDetail[];
}

interface AgingSummary {
  totalPayables: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  daysOver90: number;
  totalBills: number;
  totalVendors: number;
  overdueTotal: number;
  currentPct: number;
  days1to30Pct: number;
  days31to60Pct: number;
  days61to90Pct: number;
  daysOver90Pct: number;
  overduePct: number;
}

interface VendorAgingReportProps {
  onBack: () => void;
  onNavigateToPayment?: (vendorName: string, invoiceNumber?: string) => void;
  onNavigateToBill?: (invoiceNumber: string) => void;
  formatCurrency?: (val: number) => string;
}

export default function VendorAgingReportModule({
  onBack,
  onNavigateToPayment,
  onNavigateToBill,
  formatCurrency = (val: number) =>
    `$${val.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
}: VendorAgingReportProps) {
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currency, setCurrency] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<"ALL" | "OVERDUE_ONLY" | "CRITICAL_60">("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<AgingSummary | null>(null);
  const [vendors, setVendors] = useState<VendorAgingRow[]>([]);
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (asOfDate) params.set("asOfDate", asOfDate);
      if (currency !== "ALL") params.set("currency", currency);
      if (search) params.set("search", search);

      const res = await fetch(`/api/reports/vendor-aging?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data.summary);
        setVendors(json.data.vendors || []);
      }
    } catch (err) {
      console.error("Error fetching vendor aging report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgingData();
  }, [asOfDate, currency]);

  const toggleExpand = (vendorId: string) => {
    setExpandedVendors((prev) => ({
      ...prev,
      [vendorId]: !prev[vendorId],
    }));
  };

  const toggleExpandAll = () => {
    const allExpanded = Object.keys(expandedVendors).length === vendors.length;
    if (allExpanded) {
      setExpandedVendors({});
    } else {
      const next: Record<string, boolean> = {};
      vendors.forEach((v) => {
        next[v.vendorId] = true;
      });
      setExpandedVendors(next);
    }
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (filterType === "OVERDUE_ONLY") {
        const hasOverdue = v.days1to30 + v.days31to60 + v.days61to90 + v.daysOver90 > 0;
        if (!hasOverdue) return false;
      } else if (filterType === "CRITICAL_60") {
        const hasCritical = v.days61to90 + v.daysOver90 > 0;
        if (!hasCritical) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchesName = v.vendorName.toLowerCase().includes(q);
      const matchesCode = v.macolaCode?.toLowerCase().includes(q);
      const matchesInvoice = v.bills.some(
        (b) =>
          b.invoiceNumber.toLowerCase().includes(q) ||
          (b.purchaseOrderNumber && b.purchaseOrderNumber.toLowerCase().includes(q))
      );
      return matchesName || matchesCode || matchesInvoice;
    });
  }, [vendors, filterType, search]);

  const handleExportCSV = () => {
    const headers = [
      "Código Proveedor",
      "Nombre Proveedor",
      "Facturas Pendientes",
      "Total Cuentas por Pagar (USD)",
      "Corriente (Al día)",
      "1 a 30 Días",
      "31 a 60 Días",
      "61 a 90 Días",
      "Más de 90 Días",
      "Fecha Venc. Más Antigua",
      "Días Máx. Vencido",
    ];

    const rows = filteredVendors.map((v) => [
      `"${v.macolaCode || ""}"`,
      `"${v.vendorName.replace(/"/g, '""')}"`,
      v.billsCount,
      v.totalBalance.toFixed(2),
      v.current.toFixed(2),
      v.days1to30.toFixed(2),
      v.days31to60.toFixed(2),
      v.days61to90.toFixed(2),
      v.daysOver90.toFixed(2),
      v.oldestDueDate || "",
      v.maxDaysPastDue > 0 ? v.maxDaysPastDue : 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `antiguedad_saldos_proveedores_wayne_${asOfDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ================= PRINT HEADER (visible only during print) ================= */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Wayne Trademark Printing & Packaging de Honduras S. de R.L.
            </h1>
            <p className="text-xs text-slate-600">
              RTN: 05019008183490 • ZIP Búfalo, Villanueva, Cortés
            </p>
            <h2 className="text-base font-bold text-slate-800 mt-2">
              Reporte de Antigüedad de Saldos a Proveedores (Cuentas por Pagar)
            </h2>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>
              <b>Fecha de corte:</b> {asOfDate}
            </p>
            <p>
              <b>Fecha de emisión:</b> {new Date().toLocaleDateString("es-HN")}
            </p>
            <p>
              <b>Moneda:</b> USD ($)
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
            <span>Regresar a Proveedores</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Cuentas por Pagar</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Antigüedad de Saldos Proveedores</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Antigüedad de Saldos a Proveedores
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5]">
                Cuentas por Pagar (AP)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Estratificación cronológica de facturas de compra y compromisos por pagar a proveedores.
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
      {/* Numbers match the primary dashboard cards typography: text-2xl sm:text-3xl font-bold */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total Cuentas por Pagar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Cuentas por Pagar
            </span>
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
              $
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(summary?.totalPayables || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{summary?.totalVendors || 0} proveedores</span>
            <span>{summary?.totalBills || 0} facturas</span>
          </div>
        </div>

        {/* Card 2: Corriente (Al día) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Al Día (Corriente)
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              {summary?.currentPct || 0}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
              {formatCurrency(summary?.current || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-emerald-600 font-medium">Dentro de crédito</span>
            <span>Sin mora</span>
          </div>
        </div>

        {/* Card 3: 1 a 30 días */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              1 a 30 Días
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {summary?.days1to30Pct || 0}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-800 tracking-tight">
              {formatCurrency(summary?.days1to30 || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Mora temprana</span>
          </div>
        </div>

        {/* Card 4: 31 a 60 días */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              31 a 60 Días
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-[#e07216] border border-orange-200">
              {summary?.days31to60Pct || 0}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#e07216] tracking-tight">
              {formatCurrency(summary?.days31to60 || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Mora intermedia</span>
          </div>
        </div>

        {/* Card 5: 61 a 90 días */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              61 a 90 Días
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
              {summary?.days61to90Pct || 0}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-700 tracking-tight">
              {formatCurrency(summary?.days61to90 || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Prioridad alta</span>
          </div>
        </div>

        {/* Card 6: Más de 90 días (Crítica) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Más de 90 Días
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900 border border-rose-300">
              {summary?.daysOver90Pct || 0}%
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-900 tracking-tight">
              {formatCurrency(summary?.daysOver90 || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-rose-700 font-bold">
            <span>Riesgo de corte de suministro</span>
          </div>
        </div>
      </div>

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
              Todos ({vendors.length})
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
              Crítico (&gt;60d)
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
              placeholder="Buscar proveedor o N.º factura..."
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
            {Object.keys(expandedVendors).length === vendors.length
              ? "Contraer todo"
              : "Expandir todo"}
          </button>
        </div>
      </div>

      {/* ================= AGING TABLE ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4 text-center">Facturas</th>
                <th className="py-3 px-4 text-right">Al Día (Corriente)</th>
                <th className="py-3 px-4 text-right">1 - 30 d</th>
                <th className="py-3 px-4 text-right">31 - 60 d</th>
                <th className="py-3 px-4 text-right">61 - 90 d</th>
                <th className="py-3 px-4 text-right">&gt; 90 d</th>
                <th className="py-3 px-4 text-right font-black text-slate-900">Total Adeudado</th>
                <th className="py-3 px-4 text-center print:hidden">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && vendors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#f6821f] mx-auto mb-2" />
                    <span>Cargando análisis de vencimientos a proveedores...</span>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-800 text-sm">No hay saldos pendientes a proveedores</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Todas las facturas de compra están al día o no coinciden con los filtros aplicados.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((row) => {
                  const isExpanded = !!expandedVendors[row.vendorId];
                  const hasOverdue = row.days1to30 + row.days31to60 + row.days61to90 + row.daysOver90 > 0;
                  const isCritical = row.days61to90 + row.daysOver90 > 0;

                  return (
                    <React.Fragment key={row.vendorId}>
                      {/* Vendor Summary Row */}
                      <tr
                        className={`hover:bg-slate-50/80 transition cursor-pointer ${
                          isExpanded ? "bg-slate-50/60" : ""
                        }`}
                        onClick={() => toggleExpand(row.vendorId)}
                      >
                        <td className="py-3.5 px-4 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#f6821f]" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>

                        {/* Vendor Name & Macola Code */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{row.vendorName}</span>
                            {isCritical ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                Mora crítica
                              </span>
                            ) : hasOverdue ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Por pagar
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Al día
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {row.macolaCode && (
                              <span>Código: <b className="text-slate-600">{row.macolaCode}</b></span>
                            )}
                            {row.vendorPhone && <span>• Tel: {row.vendorPhone}</span>}
                          </div>
                        </td>

                        {/* Bills Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {row.billsCount}
                          </span>
                        </td>

                        {/* Current */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {row.current > 0 ? (
                            <span className="text-emerald-700 font-bold">
                              {formatCurrency(row.current)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* 1 - 30 days */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {row.days1to30 > 0 ? (
                            <span className="text-amber-800 font-bold">
                              {formatCurrency(row.days1to30)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* 31 - 60 days */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {row.days31to60 > 0 ? (
                            <span className="text-[#e07216] font-bold">
                              {formatCurrency(row.days31to60)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* 61 - 90 days */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {row.days61to90 > 0 ? (
                            <span className="text-rose-700 font-bold">
                              {formatCurrency(row.days61to90)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* > 90 days */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {row.daysOver90 > 0 ? (
                            <span className="text-rose-900 font-black">
                              {formatCurrency(row.daysOver90)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Total Balance */}
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                          {formatCurrency(row.totalBalance)}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-center print:hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {onNavigateToPayment && (
                              <button
                                type="button"
                                onClick={() => onNavigateToPayment(row.vendorName)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition border border-emerald-200 cursor-pointer"
                                title="Programar pago a proveedor"
                              >
                                Pagar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ================= CHILD DETAIL ROWS: INVOICES ================= */}
                      {isExpanded && (
                        <tr className="bg-[#fafafa]">
                          <td colSpan={10} className="p-0">
                            <div className="px-8 py-3.5 border-t border-b border-slate-200/70 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  Facturas de Compra Pendientes ({row.bills.length})
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Vencimiento más antiguo: <b>{row.oldestDueDate || "N/A"}</b>
                                </span>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                                      <th className="py-2 px-3">N.º Factura</th>
                                      <th className="py-2 px-3">Orden de Compra</th>
                                      <th className="py-2 px-3">Emisión</th>
                                      <th className="py-2 px-3">Vencimiento</th>
                                      <th className="py-2 px-3 text-center">Días Vencido</th>
                                      <th className="py-2 px-3 text-center">Tramo</th>
                                      <th className="py-2 px-3 text-right">Total Factura</th>
                                      <th className="py-2 px-3 text-right font-bold text-slate-900">
                                        Saldo Pendiente
                                      </th>
                                      <th className="py-2 px-3 text-center print:hidden">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {row.bills.map((bill) => {
                                      const isOverdue = bill.daysPastDue > 0;
                                      return (
                                        <tr key={bill.id} className="hover:bg-slate-50/50">
                                          <td className="py-2 px-3 font-semibold text-slate-800">
                                            {bill.invoiceNumber}
                                          </td>
                                          <td className="py-2 px-3 text-slate-500">
                                            {bill.purchaseOrderNumber || "—"}
                                          </td>
                                          <td className="py-2 px-3 text-slate-600">
                                            {bill.issueDate}
                                          </td>
                                          <td className="py-2 px-3 font-medium text-slate-800">
                                            {bill.dueDate}
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            {isOverdue ? (
                                              <span
                                                className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                                  bill.daysPastDue > 60
                                                    ? "bg-rose-100 text-rose-700"
                                                    : bill.daysPastDue > 30
                                                    ? "bg-orange-100 text-[#e07216]"
                                                    : "bg-amber-100 text-amber-800"
                                                }`}
                                              >
                                                +{bill.daysPastDue} días
                                              </span>
                                            ) : (
                                              <span className="text-emerald-700 font-semibold text-[11px]">
                                                Al día ({Math.abs(bill.daysPastDue)}d restantes)
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                              {bill.bucket === "CURRENT" && "Al Día"}
                                              {bill.bucket === "DAYS_1_30" && "1-30 Días"}
                                              {bill.bucket === "DAYS_31_60" && "31-60 Días"}
                                              {bill.bucket === "DAYS_61_90" && "61-90 Días"}
                                              {bill.bucket === "DAYS_OVER_90" && "+90 Días"}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-right text-slate-500">
                                            {formatCurrency(bill.total)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                                            {formatCurrency(bill.balance)}
                                          </td>
                                          <td className="py-2 px-3 text-center print:hidden">
                                            {onNavigateToPayment && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  onNavigateToPayment(row.vendorName, bill.invoiceNumber)
                                                }
                                                className="px-2 py-0.5 rounded bg-[#fff7ed] hover:bg-[#ffedd5] text-[#f6821f] font-bold text-[10px] border border-[#fed7aa] cursor-pointer"
                                              >
                                                Pagar
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* ================= TABLE FOOTER TOTALS ================= */}
            {filteredVendors.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td className="py-3.5 px-4 text-center">Σ</td>
                  <td className="py-3.5 px-4">
                    TOTAL GENERAL ({filteredVendors.length} PROVEEDORES)
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {summary?.totalBills || 0}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-700">
                    {formatCurrency(summary?.current || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-amber-800">
                    {formatCurrency(summary?.days1to30 || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#e07216]">
                    {formatCurrency(summary?.days31to60 || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-rose-700">
                    {formatCurrency(summary?.days61to90 || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-rose-900">
                    {formatCurrency(summary?.daysOver90 || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-base text-slate-900 font-black">
                    {formatCurrency(summary?.totalPayables || 0)}
                  </td>
                  <td className="py-3.5 px-4 print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ================= MORA POLICY AND AUDIT FOOTNOTE ================= */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#f6821f]" />
          <span>
            <b>Política de Crédito Wayne:</b> Pagos a proveedores se rigen según condiciones de crédito (Neto 15, 30 o 60 días).
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Auditoría de Cuentas por Pagar • Wayne Admin
        </div>
      </div>
    </div>
  );
}
