"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  ArrowLeft,
  Calendar,
  Building2,
  Printer,
  History,
  FileSpreadsheet,
  Check,
  RotateCcw,
  Search,
  Filter,
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  currency: string;
  bankBalance: number;
  bookBalance: number;
  color?: string;
  type?: string;
}

interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  transactionId?: string | null;
  sourceType: string;
  date: string;
  reference?: string | null;
  description: string;
  payee?: string | null;
  type: string; // "DEPOSIT" | "CHECK" | "FEE" | "INTEREST"
  amount: number;
  isCleared: boolean;
  clearedAt?: string | null;
  notes?: string | null;
}

interface BankReconciliation {
  id: string;
  reconciliationNumber: string;
  bankAccountId: string;
  bankAccount?: BankAccount;
  period: string;
  statementDate: string;
  startDate: string;
  endDate: string;
  statementBeginningBalance: number;
  statementEndingBalance: number;
  clearedDepositsCount: number;
  clearedDepositsAmount: number;
  clearedChecksCount: number;
  clearedChecksAmount: number;
  clearedBalance: number;
  difference: number;
  status: "EN_PROCESO" | "CONCILIADA_CUADRADA" | "CERRADA" | string;
  closedAt?: string | null;
  closedBy?: string | null;
  notes?: string | null;
  items: ReconciliationItem[];
}

interface Props {
  onBack: () => void;
  formatCurrency?: (val: number, curr?: string) => string;
  companySettings?: any;
}

export default function BankReconciliationModule({
  onBack,
  formatCurrency,
  companySettings = {
    nombre: "WAYNE TRADEMARK DE HONDURAS, S.A.",
    taxId: "05019008183490",
    direccion: "Zip Búfalo, Edificio 1B, Villanueva, Cortés",
    telefono: "+504 2516-4300",
  },
}: Props) {
  // State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedRecId, setSelectedRecId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"deposits" | "checks" | "history">("deposits");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Modals
  const [showNewRecModal, setShowNewRecModal] = useState<boolean>(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // New Rec Form
  const [newRecForm, setNewRecForm] = useState({
    bankAccountId: "",
    period: new Date().toISOString().slice(0, 7), // "2026-09"
    statementDate: new Date().toISOString().split("T")[0],
    statementBeginningBalance: 0,
    statementEndingBalance: 0,
    notes: "",
  });

  // Adjustment Form
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: "FEE", // FEE | INTEREST
    description: "Comisión Bancaria / Mantenimiento de Cuenta",
    reference: "ND-EST-01",
    payee: "Banco Ficohsa",
    amount: 25.00,
    date: new Date().toISOString().split("T")[0],
    notes: "Registrado directamente desde extracto mensual",
  });

  // Helper accountant signature
  const accountantFullName = companySettings?.contadorNombre?.trim()
    ? `${companySettings.contadorNombre.trim()} (${companySettings.contadorTitulo?.trim() || "Contador General"})`
    : "Contador General";
  const accountantDisplayName = companySettings?.contadorNombre?.trim() || "Contador General";
  const accountantDisplayTitle = companySettings?.contadorTitulo?.trim() || "Preparado por / Contador";
  const accountantCol =
    companySettings?.contadorColegiacion && companySettings.contadorColegiacion !== "Ninguno indicado"
      ? ` • Col. ${companySettings.contadorColegiacion}`
      : "";

  const getRecordClosedBy = (rec?: BankReconciliation | null) => {
    if (!rec) return "";
    if (rec.status !== "CERRADA") return "En Proceso";
    if (companySettings?.contadorNombre?.trim()) {
      const title = companySettings.contadorTitulo?.trim() || "Contador General";
      return `${companySettings.contadorNombre.trim()} (${title})`;
    }
    return rec.closedBy || "Auditoría Contable";
  };

  // Close Statement Form
  const [closeForm, setCloseForm] = useState({
    closedBy: accountantFullName,
    notes: "Conciliación bancaria mensual aprobada y cuadrada sin discrepancias para archivo de auditoría.",
    allowDifference: false,
  });

  useEffect(() => {
    if (companySettings?.contadorNombre?.trim()) {
      setCloseForm((prev) => ({
        ...prev,
        closedBy: accountantFullName,
      }));
    }
  }, [accountantFullName, companySettings?.contadorNombre]);

  const [toastMsg, setToastMsg] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // Helper formatter
  const fmt = (val: number, curr = "USD") => {
    if (formatCurrency) return formatCurrency(val, curr);
    return `$${Number(val || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
  };

  // 1. Initial Load: Accounts and Reconciliations
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [banksRes, recsRes] = await Promise.all([
        fetch("/api/bank-accounts").then((r) => r.json()).catch(() => ({ success: false })),
        fetch("/api/bank-reconciliations").then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (banksRes.success && Array.isArray(banksRes.data)) {
        setBankAccounts(banksRes.data);
        if (!selectedBankId && banksRes.data.length > 0) {
          setSelectedBankId(banksRes.data[0].id);
        }
      }

      if (recsRes.success && Array.isArray(recsRes.data)) {
        setReconciliations(recsRes.data);
        if (recsRes.data.length > 0) {
          setSelectedRecId(recsRes.data[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading bank reconciliations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filtered Reconciliations by Selected Bank
  const bankReconciliations = useMemo(() => {
    if (!selectedBankId) return reconciliations;
    return reconciliations.filter((r) => r.bankAccountId === selectedBankId);
  }, [reconciliations, selectedBankId]);

  // Current Active Reconciliation
  const currentRec = useMemo(() => {
    if (!selectedRecId && bankReconciliations.length > 0) return bankReconciliations[0];
    return reconciliations.find((r) => r.id === selectedRecId) || bankReconciliations[0] || null;
  }, [reconciliations, bankReconciliations, selectedRecId]);

  // Current Bank Account
  const currentBank = useMemo(() => {
    if (currentRec?.bankAccount) return currentRec.bankAccount;
    return bankAccounts.find((b) => b.id === selectedBankId) || bankAccounts[0] || null;
  }, [currentRec, bankAccounts, selectedBankId]);

  // Sync / Refresh active reconciliation
  const reloadActiveRec = async (idToReload = selectedRecId) => {
    if (!idToReload) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/bank-reconciliations/${idToReload}`);
      const json = await res.json();
      if (json.success && json.data) {
        setReconciliations((prev) =>
          prev.map((r) => (r.id === json.data.id ? json.data : r))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Single Item Cleared
  const handleToggleCleared = async (item: ReconciliationItem) => {
    if (!currentRec || currentRec.status === "CERRADA") return;

    const newClearedState = !item.isCleared;

    // Optimistic Update
    setReconciliations((prev) =>
      prev.map((rec) => {
        if (rec.id !== currentRec.id) return rec;

        const updatedItems = rec.items.map((it) =>
          it.id === item.id ? { ...it, isCleared: newClearedState } : it
        );

        let depAmt = 0;
        let depCnt = 0;
        let chkAmt = 0;
        let chkCnt = 0;

        updatedItems.forEach((it) => {
          if (it.isCleared) {
            if (it.type === "DEPOSIT" || it.type === "INTEREST") {
              depAmt += it.amount;
              depCnt += 1;
            } else {
              chkAmt += it.amount;
              chkCnt += 1;
            }
          }
        });

        const clearedBal = Math.round((rec.statementBeginningBalance + depAmt - chkAmt) * 100) / 100;
        const diff = Math.round((rec.statementEndingBalance - clearedBal) * 100) / 100;

        return {
          ...rec,
          items: updatedItems,
          clearedDepositsAmount: depAmt,
          clearedDepositsCount: depCnt,
          clearedChecksAmount: chkAmt,
          clearedChecksCount: chkCnt,
          clearedBalance: clearedBal,
          difference: diff,
          status: diff === 0 ? "CONCILIADA_CUADRADA" : "EN_PROCESO",
        };
      })
    );

    try {
      await fetch(`/api/bank-reconciliations/${currentRec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toggleItemId: item.id,
          isCleared: newClearedState,
        }),
      });
    } catch (err) {
      console.error("Error toggling cleared:", err);
      reloadActiveRec();
    }
  };

  // Batch Select / Clear All in active tab
  const handleBatchToggle = async (type: "deposits" | "checks", targetState: boolean) => {
    if (!currentRec || currentRec.status === "CERRADA") return;

    const itemsToChange = currentRec.items.filter((it) => {
      const isDeposit = it.type === "DEPOSIT" || it.type === "INTEREST";
      if (type === "deposits" && isDeposit) return it.isCleared !== targetState;
      if (type === "checks" && !isDeposit) return it.isCleared !== targetState;
      return false;
    });

    if (itemsToChange.length === 0) return;

    const itemIds = itemsToChange.map((i) => i.id);

    // Optimistic UI update
    setReconciliations((prev) =>
      prev.map((rec) => {
        if (rec.id !== currentRec.id) return rec;
        const updatedItems = rec.items.map((it) =>
          itemIds.includes(it.id) ? { ...it, isCleared: targetState } : it
        );

        let depAmt = 0;
        let depCnt = 0;
        let chkAmt = 0;
        let chkCnt = 0;

        updatedItems.forEach((it) => {
          if (it.isCleared) {
            if (it.type === "DEPOSIT" || it.type === "INTEREST") {
              depAmt += it.amount;
              depCnt += 1;
            } else {
              chkAmt += it.amount;
              chkCnt += 1;
            }
          }
        });

        const clearedBal = Math.round((rec.statementBeginningBalance + depAmt - chkAmt) * 100) / 100;
        const diff = Math.round((rec.statementEndingBalance - clearedBal) * 100) / 100;

        return {
          ...rec,
          items: updatedItems,
          clearedDepositsAmount: depAmt,
          clearedDepositsCount: depCnt,
          clearedChecksAmount: chkAmt,
          clearedChecksCount: chkCnt,
          clearedBalance: clearedBal,
          difference: diff,
          status: diff === 0 ? "CONCILIADA_CUADRADA" : "EN_PROCESO",
        };
      })
    );

    try {
      await fetch(`/api/bank-reconciliations/${currentRec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchItemIds: itemIds,
          isCleared: targetState,
        }),
      });
      showToast(targetState ? "Movimientos marcados como cotejados." : "Movimientos desmarcados.");
    } catch (err) {
      console.error(err);
      reloadActiveRec();
    }
  };

  // Create New Monthly Reconciliation
  const handleCreateNewRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecForm.bankAccountId || !newRecForm.period || !newRecForm.statementDate) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }

    try {
      const res = await fetch("/api/bank-reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecForm),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setReconciliations((prev) => [json.data, ...prev]);
        setSelectedRecId(json.data.id);
        setSelectedBankId(json.data.bankAccountId);
        setShowNewRecModal(false);
        showToast(json.message || "Nueva conciliación aperturada con éxito.");
      } else {
        alert(json.error || "Error al crear la conciliación");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    }
  };

  // Add Direct Adjustment (e.g. Bank Fee / Interest)
  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRec || currentRec.status === "CERRADA") return;

    try {
      const res = await fetch(`/api/bank-reconciliations/${currentRec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newAdjustment: adjustmentForm,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setReconciliations((prev) =>
          prev.map((r) => (r.id === json.data.id ? json.data : r))
        );
        setShowAdjustmentModal(false);
        showToast("Ajuste registrado y cotejado en la conciliación.");
      } else {
        alert(json.error || "Error al registrar el ajuste.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Execute Formal Monthly Closure
  const handleCloseStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRec) return;

    try {
      const res = await fetch(`/api/bank-reconciliations/${currentRec.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(closeForm),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setReconciliations((prev) =>
          prev.map((r) => (r.id === json.data.id ? json.data : r))
        );
        setShowCloseModal(false);
        showToast(json.message || "¡Cierre formal de extracto mensual completado con éxito!");
      } else {
        alert(json.error || "Error al ejecutar el cierre");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor para ejecutar el cierre.");
    }
  };

  // Filter items in active workbench tab
  const filteredDeposits = useMemo(() => {
    if (!currentRec) return [];
    return currentRec.items.filter((it) => {
      const isDep = it.type === "DEPOSIT" || it.type === "INTEREST";
      if (!isDep) return false;
      if (!searchFilter) return true;
      const s = searchFilter.toLowerCase();
      return (
        it.description.toLowerCase().includes(s) ||
        (it.payee && it.payee.toLowerCase().includes(s)) ||
        (it.reference && it.reference.toLowerCase().includes(s)) ||
        String(it.amount).includes(s)
      );
    });
  }, [currentRec, searchFilter]);

  const filteredChecks = useMemo(() => {
    if (!currentRec) return [];
    return currentRec.items.filter((it) => {
      const isDep = it.type === "DEPOSIT" || it.type === "INTEREST";
      if (isDep) return false;
      if (!searchFilter) return true;
      const s = searchFilter.toLowerCase();
      return (
        it.description.toLowerCase().includes(s) ||
        (it.payee && it.payee.toLowerCase().includes(s)) ||
        (it.reference && it.reference.toLowerCase().includes(s)) ||
        String(it.amount).includes(s)
      );
    });
  }, [currentRec, searchFilter]);

  // Uncleared items for the official reconciliation statement
  const unclearedDeposits = useMemo(() => {
    if (!currentRec) return [];
    return currentRec.items.filter((it) => !it.isCleared && (it.type === "DEPOSIT" || it.type === "INTEREST"));
  }, [currentRec]);

  const unclearedChecks = useMemo(() => {
    if (!currentRec) return [];
    return currentRec.items.filter((it) => !it.isCleared && !(it.type === "DEPOSIT" || it.type === "INTEREST"));
  }, [currentRec]);

  const totalUnclearedDeposits = useMemo(() => {
    return unclearedDeposits.reduce((acc, it) => acc + it.amount, 0);
  }, [unclearedDeposits]);

  const totalUnclearedChecks = useMemo(() => {
    return unclearedChecks.reduce((acc, it) => acc + it.amount, 0);
  }, [unclearedChecks]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150 p-6">
      {/* ================= SCREEN HEADER ================= */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Regresar a Dashboard</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Contabilidad &amp; Tesorería</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Conciliación de Extracto Mensual</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Conciliación y Cierre de Extractos Mensuales
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5]">
                Auditoría Contable &amp; Bancos
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cotejo formal de partidas en tránsito, comisiones, cheques y cuadre matemático contra estados de cuenta bancarios oficiales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {currentRec && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Cédula de Conciliación</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setNewRecForm({
                  bankAccountId: selectedBankId || bankAccounts[0]?.id || "",
                  period: new Date().toISOString().slice(0, 7),
                  statementDate: new Date().toISOString().split("T")[0],
                  statementBeginningBalance: currentRec?.statementEndingBalance || currentBank?.bankBalance || 0,
                  statementEndingBalance: currentBank?.bankBalance || 0,
                  notes: "",
                });
                setShowNewRecModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#f6821f]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Aperturar Nueva Conciliación</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast alert */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ================= 4 KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Inicial de Extracto */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Saldo Inicial Extracto</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {fmt(currentRec?.statementBeginningBalance || 0, currentBank?.currency)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Corte inicial según estado de cuenta</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        {/* Card 2: Depósitos Aclarados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Depósitos Aclarados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {fmt(currentRec?.clearedDepositsAmount || 0, currentBank?.currency)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {currentRec?.clearedDepositsCount || 0} abonos cotejados en banco
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Card 3: Cargos y Cheques Aclarados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-700">Cargos / Cheques Aclarados</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 tracking-tight">
              {fmt(currentRec?.clearedChecksAmount || 0, currentBank?.currency)}
            </span>
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            {currentRec?.clearedChecksCount || 0} débitos y pagos cotejados
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600" />
        </div>

        {/* Card 4: Diferencia de Conciliación */}
        {(() => {
          const diff = currentRec?.difference || 0;
          const isBalanced = Math.abs(diff) < 0.01;
          return (
            <div
              className={`p-5 rounded-2xl border shadow-xs relative overflow-hidden transition-all hover:shadow-md ${
                isBalanced
                  ? "bg-white border-emerald-300"
                  : "bg-white border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Diferencia de Cuadre</span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isBalanced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-2">
                <span
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    isBalanced ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {fmt(diff, currentBank?.currency)}
                </span>
              </div>
              <p
                className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                  isBalanced ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {isBalanced ? "¡Cuadrada exactamente ($0.00)!" : "Diferencia pendiente de cotejo"}
              </p>
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 ${
                  isBalanced ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </div>
          );
        })()}
      </div>

      {/* ================= CONTROLS BAR (ACCOUNT & PERIOD SELECTOR) ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Account & Period selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Cuenta Bancaria
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => {
                setSelectedBankId(e.target.value);
                const recsForBank = reconciliations.filter((r) => r.bankAccountId === e.target.value);
                if (recsForBank.length > 0) setSelectedRecId(recsForBank[0].id);
                else setSelectedRecId("");
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f6821f] cursor-pointer"
            >
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.accountNumber}) - {b.currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Período de Conciliación
            </label>
            <select
              value={selectedRecId}
              onChange={(e) => setSelectedRecId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f6821f] cursor-pointer"
              disabled={bankReconciliations.length === 0}
            >
              {bankReconciliations.length === 0 && (
                <option value="">Sin conciliaciones registradas</option>
              )}
              {bankReconciliations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.period} • {r.reconciliationNumber} ({r.status})
                </option>
              ))}
            </select>
          </div>

          {currentRec && (
            <div className="pt-4 lg:pt-0">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  currentRec.status === "CERRADA"
                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                    : currentRec.status === "CONCILIADA_CUADRADA"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {currentRec.status === "CERRADA" && <Lock className="w-3.5 h-3.5" />}
                {currentRec.status === "CONCILIADA_CUADRADA" && <Check className="w-3.5 h-3.5" />}
                {currentRec.status === "EN_PROCESO" && <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />}
                <span>
                  {currentRec.status === "CERRADA"
                    ? "CERRADA Y BLOQUEADA"
                    : currentRec.status === "CONCILIADA_CUADRADA"
                    ? "CUADRADA (Lista para cierre)"
                    : "EN PROCESO DE COTEJO"}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Right: Closing & Adjustments Actions */}
        <div className="flex items-center gap-2">
          {currentRec && currentRec.status !== "CERRADA" && (
            <>
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(true)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#f6821f]" />
                <span>Agregar Ajuste</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCloseForm({
                    closedBy: accountantFullName,
                    notes: `Cierre mensual de ${currentRec.period} cuadrado sin discrepancias.`,
                    allowDifference: false,
                  });
                  setShowCloseModal(true);
                }}
                disabled={Math.abs(currentRec.difference) > 0.01}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                  Math.abs(currentRec.difference) <= 0.01
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                }`}
                title={
                  Math.abs(currentRec.difference) <= 0.01
                    ? "Cerrar formalmente este período de extracto bancario"
                    : "Debe cuadrar la diferencia a $0.00 antes de ejecutar el cierre formal"
                }
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar Período Mensual</span>
              </button>
            </>
          )}

          {currentRec && currentRec.status === "CERRADA" && (
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Cerrada formalmente</span>
              <span className="text-xs font-bold text-slate-800">{getRecordClosedBy(currentRec)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= REAL-TIME MATH RECONCILIATION STRIP ================= */}
      {currentRec && (
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* 1. Saldo Inicial */}
            <div className="pt-2 sm:pt-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                1. Saldo Inicial
              </span>
              <p className="text-base sm:text-lg font-black text-slate-800 mt-1 font-mono">
                {fmt(currentRec.statementBeginningBalance, currentBank?.currency)}
              </p>
            </div>

            {/* 2. + Depósitos */}
            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
                2. (+) Depósitos Aclarados
              </span>
              <p className="text-base sm:text-lg font-black text-emerald-600 mt-1 font-mono">
                +{fmt(currentRec.clearedDepositsAmount, currentBank?.currency)}
              </p>
            </div>

            {/* 3. - Cargos / Cheques */}
            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] uppercase font-bold text-purple-600 block tracking-wider">
                3. (-) Débitos Aclarados
              </span>
              <p className="text-base sm:text-lg font-black text-purple-600 mt-1 font-mono">
                -{fmt(currentRec.clearedChecksAmount, currentBank?.currency)}
              </p>
            </div>

            {/* 4. = Saldo en Libros */}
            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] uppercase font-bold text-blue-600 block tracking-wider">
                4. (=) Saldo Cotejado
              </span>
              <p className="text-base sm:text-lg font-black text-blue-700 mt-1 font-mono">
                {fmt(currentRec.clearedBalance, currentBank?.currency)}
              </p>
            </div>

            {/* 5. Saldo Extracto Final */}
            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] uppercase font-bold text-slate-600 block tracking-wider">
                5. Saldo Final Extracto
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
                {fmt(currentRec.statementEndingBalance, currentBank?.currency)}
              </p>
            </div>

            {/* 6. Diferencia */}
            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span
                className={`text-[10px] uppercase font-extrabold block tracking-wider ${
                  Math.abs(currentRec.difference) < 0.01 ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                6. Diferencia
              </span>
              <p
                className={`text-base sm:text-lg font-black mt-1 font-mono ${
                  Math.abs(currentRec.difference) < 0.01 ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {fmt(currentRec.difference, currentBank?.currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= WORKBENCH NAVIGATION TABS ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("deposits")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "deposits"
                ? "bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5] shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Depósitos y Abonos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {filteredDeposits.filter((i) => i.isCleared).length}/{filteredDeposits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("checks")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "checks"
                ? "bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5] shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Cheques, Transferencias y Cargos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
              {filteredChecks.filter((i) => i.isCleared).length}/{filteredChecks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5] shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Cierres Mensuales</span>
          </button>
        </div>

        {/* Search Input */}
        {activeTab !== "history" && (
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Buscar por descripción, ref..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#f6821f]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        )}
      </div>

      {/* ================= TAB CONTENT 1: DEPÓSITOS Y ABONOS ================= */}
      {activeTab === "deposits" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Depósitos y Créditos en Extracto Bancario</span>
                <span className="text-xs font-normal text-slate-500">
                  ({filteredDeposits.length} transacciones registradas)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Marque la casilla de las partidas que aparecen acreditadas en el estado de cuenta oficial del banco.
              </p>
            </div>

            {currentRec && currentRec.status !== "CERRADA" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchToggle("deposits", true)}
                  className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchToggle("deposits", false)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Desmarcar todos
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4 w-12 text-center">Cotejado</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4">Descripción / Concepto</th>
                  <th className="py-3 px-4">Pagador / Cliente</th>
                  <th className="py-3 px-4 text-right">Monto Acreditado</th>
                  <th className="py-3 px-4 text-center">Estado Partida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No hay depósitos para mostrar en este período.
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleToggleCleared(item)}
                      className={`transition cursor-pointer ${
                        item.isCleared ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={item.isCleared}
                          disabled={currentRec?.status === "CERRADA"}
                          onChange={() => {}} // handled by row click
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-700 font-medium">{item.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.reference || "S/R"}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-800 font-medium">{item.description}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-600">{item.payee || "N/A"}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        +{fmt(item.amount, currentBank?.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isCleared
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.isCleared ? "Aclarado en Banco" : "En Tránsito"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB CONTENT 2: CHEQUES, TRANSFERENCIAS Y CARGOS ================= */}
      {activeTab === "checks" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Cheques, Transferencias Emitidas y Comisiones</span>
                <span className="text-xs font-normal text-slate-500">
                  ({filteredChecks.length} transacciones registradas)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Marque los pagos, cheques cobrados y notas de débito que ya fueron cargados por el banco.
              </p>
            </div>

            {currentRec && currentRec.status !== "CERRADA" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchToggle("checks", true)}
                  className="px-3 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchToggle("checks", false)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Desmarcar todos
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4 w-12 text-center">Cotejado</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">N.º Cheque / Ref</th>
                  <th className="py-3 px-4">Descripción / Concepto</th>
                  <th className="py-3 px-4">Beneficiario / Proveedor</th>
                  <th className="py-3 px-4 text-right">Monto Debitado</th>
                  <th className="py-3 px-4 text-center">Estado Partida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredChecks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No hay cheques o pagos para mostrar en este período.
                    </td>
                  </tr>
                ) : (
                  filteredChecks.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleToggleCleared(item)}
                      className={`transition cursor-pointer ${
                        item.isCleared ? "bg-purple-50/40 hover:bg-purple-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={item.isCleared}
                          disabled={currentRec?.status === "CERRADA"}
                          onChange={() => {}} // handled by row click
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-700 font-medium">{item.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.reference || "S/R"}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-800 font-medium">{item.description}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-600">{item.payee || "N/A"}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-purple-600">
                        -{fmt(item.amount, currentBank?.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isCleared
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.isCleared ? "Cargado en Banco" : "En Circulación"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB CONTENT 3: HISTORIAL DE CIERRES MENSUALES ================= */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70">
            <h3 className="font-bold text-sm text-slate-900">
              Historial de Conciliaciones Mensuales y Cierres
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro histórico y auditoría de extractos mensuales cerrados por cuenta bancaria.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4">N.º Conciliación</th>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4">Cuenta Bancaria</th>
                  <th className="py-3 px-4 text-right">Saldo Inicial</th>
                  <th className="py-3 px-4 text-right">Saldo Final</th>
                  <th className="py-3 px-4 text-right">Diferencia</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4">Cerrado Por</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {reconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{rec.reconciliationNumber}</td>
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-700">{rec.period}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-600">{rec.bankAccount?.name || "Banco"}</td>
                    <td className="py-3.5 px-4 text-right text-slate-700">{fmt(rec.statementBeginningBalance, rec.bankAccount?.currency)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">{fmt(rec.statementEndingBalance, rec.bankAccount?.currency)}</td>
                    <td
                      className={`py-3.5 px-4 text-right font-bold ${
                        Math.abs(rec.difference) < 0.01 ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {fmt(rec.difference, rec.bankAccount?.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === "CERRADA"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : rec.status === "CONCILIADA_CUADRADA"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-500">{getRecordClosedBy(rec)}</td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecId(rec.id);
                          setSelectedBankId(rec.bankAccountId);
                          setShowReportModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition cursor-pointer"
                      >
                        Ver Cédula
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: APERTURAR NUEVA CONCILIACIÓN ================= */}
      {showNewRecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#f6821f] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Aperturar Conciliación Mensual</h3>
                  <p className="text-[11px] text-slate-500">Inicia el proceso de cuadre de extracto bancario</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewRecModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewRec} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cuenta Bancaria *</label>
                <select
                  value={newRecForm.bankAccountId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    const b = bankAccounts.find((x) => x.id === bId);
                    setNewRecForm((prev) => ({
                      ...prev,
                      bankAccountId: bId,
                      statementBeginningBalance: b?.bankBalance || 0,
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#f6821f]"
                  required
                >
                  <option value="">Seleccione cuenta...</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.accountNumber}) - {b.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Período (Mes/Año) *</label>
                  <input
                    type="month"
                    value={newRecForm.period}
                    onChange={(e) => setNewRecForm({ ...newRecForm, period: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#f6821f]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Corte del Extracto *</label>
                  <input
                    type="date"
                    value={newRecForm.statementDate}
                    onChange={(e) => setNewRecForm({ ...newRecForm, statementDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#f6821f]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Saldo Inicial Extracto *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRecForm.statementBeginningBalance}
                    onChange={(e) => setNewRecForm({ ...newRecForm, statementBeginningBalance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-[#f6821f]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Saldo Final del Extracto *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRecForm.statementEndingBalance}
                    onChange={(e) => setNewRecForm({ ...newRecForm, statementEndingBalance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-[#f6821f]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Notas de Auditoría</label>
                <textarea
                  rows={2}
                  value={newRecForm.notes}
                  onChange={(e) => setNewRecForm({ ...newRecForm, notes: e.target.value })}
                  placeholder="Número de estado de cuenta bancario, observaciones iniciales..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#f6821f]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRecModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-bold cursor-pointer transition shadow-md shadow-[#f6821f]/20"
                >
                  Iniciar Conciliación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AGREGAR AJUSTE DIRECTO ================= */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Agregar Ajuste de Extracto</h3>
                  <p className="text-[11px] text-slate-500">Registra comisiones bancarias o intereses del período</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAdjustment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Ajuste *</label>
                <select
                  value={adjustmentForm.type}
                  onChange={(e) => {
                    const t = e.target.value;
                    setAdjustmentForm({
                      ...adjustmentForm,
                      type: t,
                      description:
                        t === "FEE"
                          ? "Comisión por Mantenimiento y Servicios Bancarios"
                          : "Intereses Ganados en Cuenta de Cheques",
                      payee: currentBank?.name || "Banco",
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#f6821f]"
                >
                  <option value="FEE">Cargo Bancario / Comisión (Disminuye saldo)</option>
                  <option value="INTEREST">Intereses Ganados (Aumenta saldo)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción / Concepto *</label>
                <input
                  type="text"
                  value={adjustmentForm.description}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#f6821f]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Referencia *</label>
                  <input
                    type="text"
                    value={adjustmentForm.reference}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#f6821f]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto ({currentBank?.currency || "USD"}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustmentForm.amount}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-[#f6821f]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={adjustmentForm.date}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#f6821f]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-bold cursor-pointer transition shadow-md shadow-[#f6821f]/20"
                >
                  Registrar y Cotejar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CIERRE FORMAL DEL EXTRACTO ================= */}
      {showCloseModal && currentRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-emerald-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Cierre Formal de Extracto Mensual</h3>
                  <p className="text-[11px] text-emerald-800 font-semibold">Período: {currentRec.period} • {currentBank?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseStatement} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">Saldo según Extracto:</span>
                  <span className="font-bold text-slate-900">{fmt(currentRec.statementEndingBalance, currentBank?.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">Saldo Cotejado en Libros:</span>
                  <span className="font-bold text-blue-600">{fmt(currentRec.clearedBalance, currentBank?.currency)}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-sm">
                  <span className="font-sans text-slate-800">Diferencia de Cierre:</span>
                  <span className="text-emerald-600">{fmt(currentRec.difference, currentBank?.currency)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Responsable / Auditor *</label>
                <input
                  type="text"
                  value={closeForm.closedBy}
                  onChange={(e) => setCloseForm({ ...closeForm, closedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#f6821f]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dictamen o Notas de Cierre</label>
                <textarea
                  rows={2}
                  value={closeForm.notes}
                  onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#f6821f]"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Aviso de Cierre Contable:</span>
                </p>
                <p>
                  Al ejecutar el cierre formal, este período mensual quedará bloqueado contra modificaciones futuras y el saldo bancario de la cuenta se actualizará a {fmt(currentRec.statementEndingBalance, currentBank?.currency)}.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition shadow-md shadow-emerald-600/20"
                >
                  Aprobar y Cerrar Extracto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CÉDULA OFICIAL DE CONCILIACIÓN IMPRIMIBLE ================= */}
      {showReportModal && currentRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl my-auto">
            {/* Header toolbar */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#f6821f]" />
                <span className="font-bold text-sm text-slate-900">
                  Cédula Oficial de Conciliación Bancaria Mensual
                </span>
                <span className="text-xs text-slate-400 font-mono">({currentRec.reconciliationNumber})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-600/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Report Document */}
            <div id="printable-reconciliation-report" className="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 bg-white">
              {/* Document Header */}
              <div className="border-b-2 border-[#f6821f] pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-[#f6821f] tracking-tight">
                    {companySettings.nombre}
                  </h1>
                  <p className="text-slate-600 font-semibold">{companySettings.direccion}</p>
                  <p className="text-slate-500">RTN: {companySettings.taxId} • Tel: {companySettings.telefono}</p>
                  <p className="text-slate-500 font-bold mt-1 uppercase text-[11px] tracking-wider">
                    DEPARTAMENTO DE CONTABILIDAD Y AUDITORÍA INTERNA
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 block mb-2 w-fit ml-auto">
                    CÉDULA DE AUDITORÍA B-01
                  </span>
                  <h2 className="text-base font-black text-slate-900">CONCILIACIÓN BANCARIA MENSUAL</h2>
                  <p className="font-mono font-bold text-slate-700 mt-0.5">Período: {currentRec.period}</p>
                  <p className="text-slate-500 text-[11px]">Fecha de Corte: {currentRec.statementDate}</p>
                </div>
              </div>

              {/* Bank and Period Info Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 font-sans uppercase block">Institución Financiera:</span>
                  <span className="font-bold text-slate-900 font-sans">{currentBank?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 font-sans uppercase block">N.º Cuenta:</span>
                  <span className="font-bold text-slate-900">{currentBank?.accountNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 font-sans uppercase block">Moneda de Cuenta:</span>
                  <span className="font-bold text-slate-900">{currentBank?.currency || "USD"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 font-sans uppercase block">Estado de Auditoría:</span>
                  <span className="font-bold text-emerald-700 font-sans">{currentRec.status}</span>
                </div>
              </div>

              {/* Formal Accounting Reconciliation Table */}
              <div className="space-y-4 font-mono text-xs">
                {/* 1. Saldo en Extracto */}
                <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl flex justify-between font-bold text-sm text-slate-900">
                  <span className="font-sans">1. SALDO SEGÚN EXTRACTO BANCARIO AL {currentRec.statementDate}</span>
                  <span>{fmt(currentRec.statementEndingBalance, currentBank?.currency)}</span>
                </div>

                {/* 2. Depósitos en Tránsito (+) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50/70 px-4 py-2 font-bold font-sans text-emerald-900 flex justify-between border-b border-emerald-100">
                    <span>(+) DEPÓSITOS Y ABONOS EN TRÁNSITO (No acreditados por el banco)</span>
                    <span className="font-mono text-emerald-700 font-bold">+{fmt(totalUnclearedDeposits, currentBank?.currency)}</span>
                  </div>
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 font-sans font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-3">Fecha</th>
                        <th className="py-1.5 px-3">Referencia</th>
                        <th className="py-1.5 px-3">Concepto / Pagador</th>
                        <th className="py-1.5 px-3 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unclearedDeposits.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-slate-400 font-sans text-center">
                            Ningún depósito en tránsito al cierre.
                          </td>
                        </tr>
                      ) : (
                        unclearedDeposits.map((it) => (
                          <tr key={it.id}>
                            <td className="py-1.5 px-3 font-sans">{it.date}</td>
                            <td className="py-1.5 px-3">{it.reference || "S/R"}</td>
                            <td className="py-1.5 px-3 font-sans">{it.description} - {it.payee}</td>
                            <td className="py-1.5 px-3 text-right font-bold">{fmt(it.amount, currentBank?.currency)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 3. Cheques y Transferencias en Circulación (-) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-purple-50/70 px-4 py-2 font-bold font-sans text-purple-900 flex justify-between border-b border-purple-100">
                    <span>(-) CHEQUES Y TRANSFERENCIAS EN CIRCULACIÓN (Emitidos no cobrados)</span>
                    <span className="font-mono text-purple-700 font-bold">-{fmt(totalUnclearedChecks, currentBank?.currency)}</span>
                  </div>
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 font-sans font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-3">Fecha</th>
                        <th className="py-1.5 px-3">N.º Cheque / Ref</th>
                        <th className="py-1.5 px-3">Beneficiario / Proveedor</th>
                        <th className="py-1.5 px-3 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unclearedChecks.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-2 px-3 text-slate-400 font-sans text-center">
                            Ningún cheque o pago en circulación al cierre.
                          </td>
                        </tr>
                      ) : (
                        unclearedChecks.map((it) => (
                          <tr key={it.id}>
                            <td className="py-1.5 px-3 font-sans">{it.date}</td>
                            <td className="py-1.5 px-3">{it.reference || "S/R"}</td>
                            <td className="py-1.5 px-3 font-sans">{it.description} - {it.payee}</td>
                            <td className="py-1.5 px-3 text-right font-bold">{fmt(it.amount, currentBank?.currency)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Saldo Bancario Ajustado */}
                {(() => {
                  const adjustedBankBal = currentRec.statementEndingBalance + totalUnclearedDeposits - totalUnclearedChecks;
                  return (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex justify-between font-bold text-sm text-blue-950">
                      <span className="font-sans">(=) SALDO AJUSTADO EN BANCOS</span>
                      <span className="text-blue-700">{fmt(adjustedBankBal, currentBank?.currency)}</span>
                    </div>
                  );
                })()}

                {/* 5. Saldo según Libros */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between font-bold text-sm text-slate-900">
                  <span className="font-sans">(=) SALDO SEGÚN LIBROS CONTABLES</span>
                  <span className="text-[#f6821f]">{fmt(currentBank?.bookBalance || currentRec.clearedBalance, currentBank?.currency)}</span>
                </div>

                {/* 6. Diferencia de Auditoría */}
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex justify-between font-bold text-sm text-emerald-900">
                  <span className="font-sans">DIFERENCIA FINAL DE CONCILIACIÓN:</span>
                  <span className="font-black text-emerald-700">$0.00 {currentBank?.currency} (CONCILIADA)</span>
                </div>
              </div>

              {/* Signatures Section */}
              <div className="pt-12 grid grid-cols-3 gap-6 text-center text-[11px] font-sans">
                <div className="border-t border-slate-400 pt-2 space-y-0.5">
                  <p className="font-bold text-slate-900">{accountantDisplayName}</p>
                  <p className="text-slate-500">{accountantDisplayTitle}{accountantCol}</p>
                </div>
                <div className="border-t border-slate-400 pt-2 space-y-0.5">
                  <p className="font-bold text-slate-900">Lic. Carlos Díaz</p>
                  <p className="text-slate-500">Revisado por / Gerente Financiero</p>
                </div>
                <div className="border-t border-slate-400 pt-2 space-y-0.5">
                  <p className="font-bold text-slate-900">Firma y Sello de Auditoría</p>
                  <p className="text-slate-500">Aprobado por / Control Interno</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
