"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BookOpen, FileText, Layers, Scale, Search, RefreshCw, Download, Printer, CheckCircle, ArrowLeft, Eye, ExternalLink } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  balance?: number;
  isActive: boolean;
}

interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  concept: string;
  referenceType: string;
  referenceId?: string;
  currency: string;
  status: string;
  lines: JournalLine[];
  createdAt: string;
}

interface AccountingBooksProps {
  accounts: Account[];
  onRefreshAccounts: () => Promise<void>;
  onOpenNewAccount: () => void;
  onOpenEditAccount: (acc: Account) => void;
  onBackToDashboard: () => void;
  formatCurrency?: (val: number) => string;
}

export default function AccountingBooksModule({
  accounts,
  onRefreshAccounts,
  onOpenNewAccount,
  onOpenEditAccount,
  onBackToDashboard,
  formatCurrency = (val: number) => `$${val.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
}: AccountingBooksProps) {
  const [activeTab, setActiveTab] = useState<"catalogo" | "diario" | "mayor" | "balance">("catalogo");

  // Libro Diario states
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalSearch, setJournalSearch] = useState("");
  const [journalFilterType, setJournalFilterType] = useState("ALL");
  const [journalSummary, setJournalSummary] = useState<any>(null);

  // Libro Mayor states
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>("ALL");
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Balance de Comprobación states
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [trialBalanceLoading, setTrialBalanceLoading] = useState(false);

  // Modal Asiento Detalle
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  // Catálogo states
  const [accountsSearch, setAccountsSearch] = useState("");
  const [accountsTypeFilter, setAccountsTypeFilter] = useState("Todo");

  // Fetch Journal Entries
  const fetchJournalEntries = async () => {
    setJournalLoading(true);
    try {
      const res = await fetch("/api/journal-entries");
      const data = await res.json();
      if (data.success) {
        setJournalEntries(data.data || []);
        setJournalSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Error fetching journal entries:", err);
    } finally {
      setJournalLoading(false);
    }
  };

  // Fetch General Ledger
  const fetchGeneralLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await fetch("/api/reports/general-ledger");
      const data = await res.json();
      if (data.success) {
        setLedgerData(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching general ledger:", err);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Fetch Trial Balance
  const fetchTrialBalance = async () => {
    setTrialBalanceLoading(true);
    try {
      const res = await fetch("/api/reports/trial-balance");
      const data = await res.json();
      if (data.success) {
        setTrialBalanceData(data);
      }
    } catch (err) {
      console.error("Error fetching trial balance:", err);
    } finally {
      setTrialBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "diario") fetchJournalEntries();
    if (activeTab === "mayor") fetchGeneralLedger();
    if (activeTab === "balance") fetchTrialBalance();
  }, [activeTab]);

  // Filtered Journal Entries
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      const matchesSearch =
        !journalSearch ||
        entry.entryNumber.toLowerCase().includes(journalSearch.toLowerCase()) ||
        entry.concept.toLowerCase().includes(journalSearch.toLowerCase()) ||
        (entry.referenceId && entry.referenceId.toLowerCase().includes(journalSearch.toLowerCase()));

      const matchesType = journalFilterType === "ALL" || entry.referenceType === journalFilterType;
      return matchesSearch && matchesType;
    });
  }, [journalEntries, journalSearch, journalFilterType]);

  // Filtered Ledger Accounts
  const filteredLedgerAccounts = useMemo(() => {
    return ledgerData.filter((acc) => {
      const matchesAcc = selectedLedgerAccount === "ALL" || acc.code === selectedLedgerAccount;
      const matchesSearch =
        !ledgerSearch ||
        acc.code.includes(ledgerSearch) ||
        acc.name.toLowerCase().includes(ledgerSearch.toLowerCase());
      return matchesAcc && matchesSearch;
    });
  }, [ledgerData, selectedLedgerAccount, ledgerSearch]);

  // Filtered Catálogo
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        !accountsSearch ||
        acc.code.toLowerCase().includes(accountsSearch.toLowerCase()) ||
        acc.name.toLowerCase().includes(accountsSearch.toLowerCase());
      const matchesType = accountsTypeFilter === "Todo" || acc.type.toLowerCase().includes(accountsTypeFilter.toLowerCase());
      return matchesSearch && matchesType;
    });
  }, [accounts, accountsSearch, accountsTypeFilter]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Regresar a Dashboard</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Motor Contable &amp; Libros</span>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "catalogo" && (
            <button
              type="button"
              onClick={onOpenNewAccount}
              className="px-3.5 py-1.5 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span>+ Nueva Cuenta</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (activeTab === "catalogo") onRefreshAccounts();
              if (activeTab === "diario") fetchJournalEntries();
              if (activeTab === "mayor") fetchGeneralLedger();
              if (activeTab === "balance") fetchTrialBalance();
            }}
            title="Recargar datos contables"
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("catalogo")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "catalogo"
              ? "bg-[#f6821f] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Catálogo de Cuentas ({accounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("diario")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "diario"
              ? "bg-[#f6821f] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Libro Diario (Partidas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("mayor")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "mayor"
              ? "bg-[#f6821f] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Libro Mayor (General Ledger)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("balance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "balance"
              ? "bg-[#f6821f] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Balance de Comprobación</span>
        </button>
      </div>

      {/* ================= TAB 1: CATÁLOGO DE CUENTAS ================= */}
      {activeTab === "catalogo" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por código o nombre..."
                  value={accountsSearch}
                  onChange={(e) => setAccountsSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f]"
                />
              </div>

              <select
                value={accountsTypeFilter}
                onChange={(e) => setAccountsTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none focus:border-[#f6821f] cursor-pointer"
              >
                <option value="Todo">Todos los tipos</option>
                <option value="Asset">Activo (Asset)</option>
                <option value="Liability">Pasivo (Liability)</option>
                <option value="Equity">Patrimonio (Equity)</option>
                <option value="Income">Ingresos (Income)</option>
                <option value="Expense">Gastos (Expense)</option>
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Nombre de la Cuenta</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Moneda</th>
                    <th className="py-3 px-4 text-right">Saldo Actual (Mayor)</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{acc.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{acc.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            acc.type === "Asset"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : acc.type === "Liability"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : acc.type === "Equity"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : acc.type === "Income"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{acc.currency}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(acc.balance || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            acc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {acc.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenEditAccount(acc)}
                          className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No se encontraron cuentas contables que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LIBRO DIARIO ================= */}
      {activeTab === "diario" && (
        <div className="space-y-4">
          {/* Summary Banner */}
          {journalSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partidas Registradas</span>
                <span className="text-2xl font-black text-slate-900">{journalSummary.count}</span>
                <p className="text-xs text-slate-500 mt-0.5">Asientos automáticos en tiempo real</p>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Débitos (Cargos)</span>
                <span className="text-2xl font-mono font-black text-slate-900">{formatCurrency(journalSummary.totalDebit)}</span>
                <p className="text-xs text-slate-500 mt-0.5">Suma total de cargos</p>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Créditos (Abonos)</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-black text-slate-900">{formatCurrency(journalSummary.totalCredit)}</span>
                  {journalSummary.isBalanced && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Cuadrado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Partida doble verificada</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por número de asiento, concepto o ref..."
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f]"
                />
              </div>

              <select
                value={journalFilterType}
                onChange={(e) => setJournalFilterType(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none focus:border-[#f6821f] cursor-pointer"
              >
                <option value="ALL">Todos los orígenes</option>
                <option value="INVOICE">Facturas de Venta</option>
                <option value="PURCHASE_INVOICE">Facturas de Proveedor</option>
                <option value="PAYMENT_CUSTOMER">Cobros a Clientes</option>
                <option value="PAYMENT_VENDOR">Pagos a Proveedores</option>
                <option value="BANK_TX">Movimientos Bancarios</option>
                <option value="PETTY_CASH">Caja Chica</option>
                <option value="MANUAL">Asientos Manuales</option>
              </select>
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-3">
            {journalLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
                Cargando asientos contables del Libro Diario...
              </div>
            ) : filteredJournalEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                No hay partidas registradas que coincidan con la búsqueda.
              </div>
            ) : (
              filteredJournalEntries.map((entry) => {
                const sumDebits = entry.lines.reduce((s, l) => s + l.debit, 0);
                const sumCredits = entry.lines.reduce((s, l) => s + l.credit, 0);

                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-[#f6821f]/50 transition"
                  >
                    {/* Header of Entry */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-[#f6821f] bg-[#fff7ed] px-2.5 py-0.5 rounded-lg border border-[#fed7aa]">
                          {entry.entryNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{entry.date}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {entry.referenceType}
                        </span>
                        {entry.referenceId && (
                          <span className="text-xs font-mono text-slate-600">Ref: {entry.referenceId}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          Total: {formatCurrency(sumDebits)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewingEntry(entry)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Partida</span>
                        </button>
                      </div>
                    </div>

                    {/* Concept */}
                    <p className="text-xs font-semibold text-slate-800 my-2.5">{entry.concept}</p>

                    {/* Lines Table */}
                    <div className="bg-slate-50/70 rounded-xl overflow-hidden border border-slate-200/60 mt-2">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200/60 text-[10px] uppercase font-bold text-slate-400">
                            <th className="py-2 px-3">Cuenta</th>
                            <th className="py-2 px-3">Nombre</th>
                            <th className="py-2 px-3 text-right">Débito (Debe)</th>
                            <th className="py-2 px-3 text-right">Crédito (Haber)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/40 font-mono">
                          {entry.lines.map((line) => (
                            <tr key={line.id} className="hover:bg-white/80 transition">
                              <td className="py-2 px-3 font-bold text-slate-700">{line.accountCode}</td>
                              <td className="py-2 px-3 font-sans text-slate-800">{line.accountName}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-300 font-mono font-bold bg-slate-100/80 text-slate-900">
                            <td colSpan={2} className="py-2 px-3 text-right uppercase font-sans text-[10px] text-slate-500">
                              Sumas Iguales:
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-700">{formatCurrency(sumDebits)}</td>
                            <td className="py-2 px-3 text-right text-emerald-700">{formatCurrency(sumCredits)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: LIBRO MAYOR ================= */}
      {activeTab === "mayor" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedLedgerAccount}
                onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none focus:border-[#f6821f] cursor-pointer"
              >
                <option value="ALL">Todas las Cuentas con Movimiento ({ledgerData.length})</option>
                {ledgerData.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name} ({acc.movementsCount} mov.)
                  </option>
                ))}
              </select>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar cuenta..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f]"
                />
              </div>
            </div>
          </div>

          {/* Ledger Accounts View */}
          <div className="space-y-6">
            {ledgerLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
                Cargando movimientos del Libro Mayor...
              </div>
            ) : filteredLedgerAccounts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                No hay movimientos registrados en las cuentas seleccionadas.
              </div>
            ) : (
              filteredLedgerAccounts.map((acc) => (
                <div key={acc.code} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  {/* Account Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-base text-slate-900">{acc.code}</span>
                      <h3 className="font-bold text-sm text-slate-800">{acc.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {acc.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Saldo Acumulado</span>
                        <span className="font-mono font-black text-base text-[#f6821f]">
                          {formatCurrency(acc.finalBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Movements Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Partida #</th>
                          <th className="py-2.5 px-3">Concepto</th>
                          <th className="py-2.5 px-3 text-right">Débito (Cargos)</th>
                          <th className="py-2.5 px-3 text-right">Crédito (Abonos)</th>
                          <th className="py-2.5 px-3 text-right">Saldo Progresivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {acc.movements.map((mov: any, idx: number) => (
                          <tr key={mov.id || idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-2 px-3 text-slate-600 font-sans">{mov.date}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{mov.entryNumber}</td>
                            <td className="py-2 px-3 font-sans text-slate-800 max-w-xs truncate">{mov.concept}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {mov.debit > 0 ? formatCurrency(mov.debit) : "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {mov.credit > 0 ? formatCurrency(mov.credit) : "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-[#f6821f]">
                              {formatCurrency(mov.balanceAfter)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-300 font-mono font-bold bg-slate-50 text-slate-900">
                          <td colSpan={3} className="py-2 px-3 text-right uppercase font-sans text-[10px] text-slate-500">
                            Total Movimientos:
                          </td>
                          <td className="py-2 px-3 text-right">{formatCurrency(acc.totalDebit)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(acc.totalCredit)}</td>
                          <td className="py-2 px-3 text-right text-[#f6821f]">{formatCurrency(acc.finalBalance)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: BALANCE DE COMPROBACIÓN ================= */}
      {activeTab === "balance" && (
        <div className="space-y-4">
          {trialBalanceData && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Balance de Comprobación de Sumas y Saldos</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comprobación aritmética de partida doble y saldos deudores y acreedores del catálogo contable.
                  </p>
                </div>
                {trialBalanceData.summary?.isBalanced && (
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Balance Cuadrado (Sumas Iguales)</span>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                      <th rowSpan={2} className="py-3 px-3">Código</th>
                      <th rowSpan={2} className="py-3 px-3">Cuenta</th>
                      <th rowSpan={2} className="py-3 px-3">Tipo</th>
                      <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-200 bg-slate-100/60">
                        Sumas del Período
                      </th>
                      <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-200 bg-slate-100/60">
                        Saldos Actuales
                      </th>
                    </tr>
                    <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                      <th className="py-2 px-3 text-right">Débitos</th>
                      <th className="py-2 px-3 text-right">Créditos</th>
                      <th className="py-2 px-3 text-right">Deudor</th>
                      <th className="py-2 px-3 text-right">Acreedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(trialBalanceData.data || []).map((row: any) => (
                      <tr key={row.code} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{row.code}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{row.name}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px]">{row.type}</td>
                        <td className="py-2.5 px-3 text-right text-slate-800">
                          {row.totalDebit > 0 ? formatCurrency(row.totalDebit) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-800">
                          {row.totalCredit > 0 ? formatCurrency(row.totalCredit) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {row.debitBalance > 0 ? formatCurrency(row.debitBalance) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {row.creditBalance > 0 ? formatCurrency(row.creditBalance) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-mono font-black text-slate-900 bg-slate-100 text-sm">
                      <td colSpan={3} className="py-3 px-3 uppercase font-sans text-xs">
                        TOTALES DE COMPROBACIÓN:
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700">
                        {formatCurrency(trialBalanceData.summary?.totalDebits || 0)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700">
                        {formatCurrency(trialBalanceData.summary?.totalCredits || 0)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#f6821f]">
                        {formatCurrency(trialBalanceData.summary?.totalDebitBalance || 0)}
                      </td>
                      <td className="py-3 px-3 text-right text-[#f6821f]">
                        {formatCurrency(trialBalanceData.summary?.totalCreditBalance || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: VER PARTIDA CONTABLE ================= */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Comprobante Oficial de Diario
                </span>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>Partida Contable</span>
                  <span className="font-mono text-[#f6821f]">{viewingEntry.entryNumber}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fecha de Contabilización: <strong>{viewingEntry.date}</strong> | Tipo: <strong>{viewingEntry.referenceType}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingEntry(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Concept */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600 block mb-0.5 uppercase text-[10px]">Concepto / Glosa:</span>
              <p className="font-semibold text-slate-900">{viewingEntry.concept}</p>
              {viewingEntry.referenceId && (
                <p className="text-slate-500 font-mono mt-1 text-[11px]">Documento Relacionado: {viewingEntry.referenceId}</p>
              )}
            </div>

            {/* Lines */}
            <div className="rounded-xl overflow-hidden border border-slate-200 text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-2.5 px-3">Cuenta</th>
                    <th className="py-2.5 px-3">Nombre</th>
                    <th className="py-2.5 px-3 text-right">Débito (Debe)</th>
                    <th className="py-2.5 px-3 text-right">Crédito (Haber)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {viewingEntry.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{line.accountCode}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-900">{line.accountName}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 font-mono font-black bg-slate-50 text-slate-900">
                    <td colSpan={2} className="py-2.5 px-3 uppercase font-sans text-[10px] text-slate-500">
                      Sumas Iguales:
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700">
                      {formatCurrency(viewingEntry.lines.reduce((s, l) => s + l.debit, 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700">
                      {formatCurrency(viewingEntry.lines.reduce((s, l) => s + l.credit, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Partida</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingEntry(null)}
                className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
