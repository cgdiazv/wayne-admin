"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Printer,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  Building,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
  macolaCode?: string | null;
  email?: string | null;
}

interface StatementMovement {
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

interface StatementData {
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

interface CustomerStatementProps {
  initialCustomerId?: string;
  customersList?: CustomerOption[];
  onBack: () => void;
  onNavigateToInvoice?: (invoiceNumber: string) => void;
  onNavigateToPayment?: (customerName: string) => void;
  formatCurrency?: (val: number) => string;
}

export default function CustomerStatementModule({
  initialCustomerId,
  customersList = [],
  onBack,
  onNavigateToInvoice,
  onNavigateToPayment,
  formatCurrency = (val: number) =>
    `$${val.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
}: CustomerStatementProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || (customersList[0]?.id || "")
  );

  const [datePreset, setDatePreset] = useState<"ALL" | "THIS_MONTH" | "LAST_30" | "THIS_YEAR" | "CUSTOM">("THIS_YEAR");
  const [startDate, setStartDate] = useState<string>("2026-01-01");
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState<boolean>(true);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [availableCustomers, setAvailableCustomers] = useState<CustomerOption[]>(customersList);

  // Load available customers if not passed
  useEffect(() => {
    if (customersList.length > 0) {
      setAvailableCustomers(customersList);
      if (!selectedCustomerId) {
        setSelectedCustomerId(customersList[0].id);
      }
    } else {
      fetch("/api/customers")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setAvailableCustomers(res.data);
            if (!selectedCustomerId && res.data.length > 0) {
              setSelectedCustomerId(res.data[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, [customersList]);

  // Handle Preset Changes
  const applyDatePreset = (preset: "ALL" | "THIS_MONTH" | "LAST_30" | "THIS_YEAR" | "CUSTOM") => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (preset === "ALL") {
      setStartDate("");
      setEndDate(todayStr);
    } else if (preset === "THIS_MONTH") {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      setStartDate(`${year}-${month}-01`);
      setEndDate(todayStr);
    } else if (preset === "LAST_30") {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "THIS_YEAR") {
      const year = today.getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(todayStr);
    }
  };

  const fetchStatement = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(
        `/api/customers/${encodeURIComponent(selectedCustomerId)}/statement?${params.toString()}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setStatement(json.data);
      }
    } catch (err) {
      console.error("Error fetching customer statement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchStatement();
    }
  }, [selectedCustomerId, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!statement || statement.movements.length === 0) return;

    const headers = [
      "Fecha",
      "Tipo",
      "No. Documento",
      "Concepto / Referencia",
      "Cargos (Debito)",
      "Abonos (Credito)",
      "Saldo Acumulado",
    ];

    const rows = statement.movements.map((m) => [
      `"${m.date}"`,
      `"${m.typeLabel}"`,
      `"${m.docNumber}"`,
      `"${m.concept.replace(/"/g, '""')}"`,
      m.debit.toFixed(2),
      m.credit.toFixed(2),
      m.runningBalance.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [
        `"ESTADO DE CUENTA - ${statement.customer.name}"`,
        `"Periodo: ${statement.period.startDate || "Inicio"} al ${statement.period.endDate}"`,
        `"Saldo Inicial: ${statement.summary.saldoInicial.toFixed(2)}"`,
        `"Total Cargos: ${statement.summary.totalCargos.toFixed(2)}"`,
        `"Total Abonos: ${statement.summary.totalAbonos.toFixed(2)}"`,
        `"Saldo Final: ${statement.summary.saldoFinal.toFixed(2)}"`,
        "",
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Estado_Cuenta_${statement.customer.name.replace(/\s+/g, "_")}_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 p-2 sm:p-6 print:p-0 print:m-0">
      {/* Top Breadcrumb & Actions Bar (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Regresar</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Gestión de Clientes</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Estado de Cuenta</span>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToPayment && statement && (
            <button
              type="button"
              onClick={() => onNavigateToPayment(statement.customer.name)}
              className="px-3.5 py-2 rounded-xl bg-[#fff7ed] hover:bg-[#ffedd5] text-[#f6821f] border border-[#fed7aa] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <CreditCard className="w-4 h-4" />
              <span>Registrar Cobro</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchStatement}
            title="Recargar extracto"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#f6821f]" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Controls Bar (Customer Selector & Date Range Filter) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4 print:hidden">
        {/* Customer Selector */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <label className="text-xs font-bold text-slate-700 shrink-0">
            Cliente:
          </label>
          <div className="relative flex-1 lg:w-80">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f6821f] cursor-pointer"
            >
              {availableCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Presets & Inputs */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => applyDatePreset("THIS_YEAR")}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                datePreset === "THIS_YEAR" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
              }`}
            >
              Año 2026
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("THIS_MONTH")}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                datePreset === "THIS_MONTH" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
              }`}
            >
              Mes Actual
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("LAST_30")}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                datePreset === "LAST_30" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
              }`}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("ALL")}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                datePreset === "ALL" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
              }`}
            >
              Todo el Historial
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setStartDate(e.target.value);
              }}
              className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
            />
            <span>a</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset("CUSTOM");
                setEndDate(e.target.value);
              }}
              className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* ================= FORMAL STATEMENT DOCUMENT (LETTERHEAD) ================= */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-[#f6821f] mx-auto mb-3" />
          <p className="font-bold text-slate-700">Cargando estado de cuenta cronológico...</p>
        </div>
      ) : !statement ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 shadow-xs">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No se encontró información para este cliente.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm print:border-none print:shadow-none print:p-0">
          {/* Letterhead Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  Wayne Trademark Honduras
                </span>
              </div>
              <p className="text-xs text-slate-600">S. de R.L. — Soluciones de Empaque, Impresión y Etiquetas</p>
              <p className="text-xs text-slate-500 mt-1">RTN: 05019012345678</p>
              <p className="text-xs text-slate-500">Parque Industrial Búfalo, Villanueva, Cortés, Honduras</p>
              <p className="text-xs text-slate-500">Tel: +504 2550-0000 | Email: cobros@waynetrademarkhn.com</p>
            </div>

            <div className="sm:text-right">
              <div className="inline-block bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] font-bold text-xs px-3.5 py-1.5 rounded-lg mb-2 tracking-wider uppercase shadow-xs">
                ESTADO DE CUENTA
              </div>
              <p className="text-xs text-slate-700 font-semibold">
                Fecha de Emisión:{" "}
                <span className="font-normal text-slate-900">{statement.asOfDate}</span>
              </p>
              <p className="text-xs text-slate-700 font-semibold">
                Período:{" "}
                <span className="font-normal text-slate-900">
                  {statement.period.startDate || "Inicio"} al {statement.period.endDate}
                </span>
              </p>
              <p className="text-xs text-slate-700 font-semibold">
                Moneda:{" "}
                <span className="font-bold text-[#f6821f]">{statement.customer.currency}</span>
              </p>
            </div>
          </div>

          {/* Customer & Credit Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Información del Cliente
              </span>
              <h3 className="font-extrabold text-sm text-slate-900">
                {statement.customer.name}
              </h3>
              {statement.customer.rtn && (
                <p className="text-slate-600 mt-0.5">
                  <span className="font-semibold">RTN:</span> {statement.customer.rtn}
                </p>
              )}
              {statement.customer.macolaCode && (
                <p className="text-slate-600">
                  <span className="font-semibold">Código:</span> {statement.customer.macolaCode}
                </p>
              )}
              {statement.customer.address && (
                <p className="text-slate-600 mt-1">
                  <span className="font-semibold">Dirección:</span> {statement.customer.address}
                </p>
              )}
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-6">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Contacto Comercial
              </span>
              {statement.customer.email && (
                <p className="text-slate-700">
                  <span className="font-semibold">Correo:</span> {statement.customer.email}
                </p>
              )}
              {statement.customer.phone && (
                <p className="text-slate-700">
                  <span className="font-semibold">Teléfono:</span> {statement.customer.phone}
                </p>
              )}
              <p className="text-slate-600 mt-2 text-[11px]">
                <span className="font-semibold">Términos pactados:</span> Crédito Comercial (Neto 30 días)
              </p>
            </div>
          </div>

          {/* Highlight Financial Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Saldo Anterior
              </span>
              <span className="text-base sm:text-lg font-extrabold text-slate-800 font-mono mt-1 block">
                {formatCurrency(statement.summary.saldoInicial)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <span className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                Total Cargos (+)
              </span>
              <span className="text-base sm:text-lg font-extrabold text-blue-900 font-mono mt-1 block">
                {formatCurrency(statement.summary.totalCargos)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Total Pagos / Abonos (-)
              </span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-900 font-mono mt-1 block">
                {formatCurrency(statement.summary.totalAbonos)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fff7ed] border border-[#fed7aa]">
              <span className="block text-[10px] font-bold text-[#f6821f] uppercase tracking-wider">
                Saldo Final a Pagar
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#c2410c] font-mono mt-1 block">
                {formatCurrency(statement.summary.saldoFinal)}
              </span>
            </div>
          </div>

          {/* Statement Movements Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3.5">Fecha</th>
                  <th className="py-3 px-3.5">Tipo</th>
                  <th className="py-3 px-3.5">Documento / Folio</th>
                  <th className="py-3 px-3.5">Concepto / Referencia</th>
                  <th className="py-3 px-3.5 text-right bg-slate-100/40 text-slate-800">Cargos (+)</th>
                  <th className="py-3 px-3.5 text-right bg-emerald-50/40 text-emerald-800">Abonos (-)</th>
                  <th className="py-3 px-3.5 text-right bg-slate-100/70 text-slate-900 font-black">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {/* Saldo Inicial Row */}
                {statement.period.startDate && (
                  <tr className="bg-slate-50/70 font-semibold text-slate-600">
                    <td className="py-2.5 px-3.5">{statement.period.startDate}</td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800 font-bold">
                        SALDO ANTERIOR
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">—</td>
                    <td className="py-2.5 px-3.5">Saldo acumulado anterior al inicio del período</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">—</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">—</td>
                    <td className="py-2.5 px-3.5 text-right font-bold font-mono text-slate-900">
                      {formatCurrency(statement.summary.saldoInicial)}
                    </td>
                  </tr>
                )}

                {statement.movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No se registraron transacciones para este cliente en el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  statement.movements.map((m) => {
                    let typeBadge = "bg-blue-100 text-blue-800";
                    if (m.type === "PAGO") typeBadge = "bg-emerald-100 text-emerald-800";
                    if (m.type === "NOTA_CREDITO") typeBadge = "bg-purple-100 text-purple-800";
                    if (m.type === "NOTA_DEBITO") typeBadge = "bg-orange-100 text-orange-800";

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600 font-medium">
                          {m.date}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${typeBadge}`}>
                            {m.typeLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                          {m.docNumber}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          {m.concept}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-800">
                          {m.debit > 0 ? formatCurrency(m.debit) : "—"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-emerald-700">
                          {m.credit > 0 ? formatCurrency(m.credit) : "—"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(m.runningBalance)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-xs">
                  <td colSpan={4} className="py-3 px-3.5 uppercase tracking-wider text-right">
                    Totales del Período:
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-900">
                    {formatCurrency(statement.summary.totalCargos)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-emerald-700">
                    {formatCurrency(statement.summary.totalAbonos)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-sm text-[#f6821f] bg-slate-200/60">
                    {formatCurrency(statement.summary.saldoFinal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Aging Breakdown Box (Antigüedad de Saldos) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 mb-6">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              Composición de la Cartera Pendiente (Antigüedad al {statement.asOfDate})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase">Al día</span>
                <span className="font-bold text-emerald-900 font-mono block mt-0.5">
                  {formatCurrency(statement.aging.current)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] font-bold text-amber-700 uppercase">1 - 30 d</span>
                <span className="font-bold text-amber-900 font-mono block mt-0.5">
                  {formatCurrency(statement.aging.days1to30)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] font-bold text-orange-700 uppercase">31 - 60 d</span>
                <span className="font-bold text-orange-900 font-mono block mt-0.5">
                  {formatCurrency(statement.aging.days31to60)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] font-bold text-rose-700 uppercase">61 - 90 d</span>
                <span className="font-bold text-rose-900 font-mono block mt-0.5">
                  {formatCurrency(statement.aging.days61to90)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] font-bold text-red-700 uppercase">&gt; 90 d</span>
                <span className="font-bold text-red-900 font-mono block mt-0.5">
                  {formatCurrency(statement.aging.daysOver90)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#fff7ed] border border-[#fed7aa]">
                <span className="block text-[10px] font-bold text-[#ea580c] uppercase">Total Cartera</span>
                <span className="font-extrabold text-[#c2410c] font-mono block mt-0.5">
                  {formatCurrency(statement.aging.totalPending)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Instructions & Formal Footer */}
          <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-700">Cuentas Bancarias para Depósito y Transferencias (USD / HNL):</p>
              <p className="text-[11px] text-slate-500">Banco Ficohsa: 2000-0102-001234 (Cheques USD) | BAC Credomatic: 7420-001923</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Favor enviar confirmación de pago a cobros@waynetrademarkhn.com</p>
            </div>
            <div className="sm:text-right text-[11px] text-slate-400">
              <p>Wayne Trademark Honduras — Sistema Integrado Administrativo</p>
              <p>Documento generado el {new Date().toLocaleString("es-HN")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
