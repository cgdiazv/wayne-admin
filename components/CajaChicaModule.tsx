"use client";

import React, { useState, useMemo } from "react";
import { numberToSpanishWords } from "@/lib/numberToWords";
import { ArrowLeft, RefreshCw, Plus } from "lucide-react";

// ==========================================
// DENOMINATIONS CONFIGURATION
// ==========================================
export const HNL_DENOMINATIONS = [
  { label: "L 500.00", value: 500, type: "Billete", bgBadge: "bg-purple-100 text-purple-800 border-purple-200" },
  { label: "L 200.00", value: 200, type: "Billete", bgBadge: "bg-teal-100 text-teal-800 border-teal-200" },
  { label: "L 100.00", value: 100, type: "Billete", bgBadge: "bg-amber-100 text-amber-800 border-amber-200" },
  { label: "L 50.00", value: 50, type: "Billete", bgBadge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { label: "L 20.00", value: 20, type: "Billete", bgBadge: "bg-sky-100 text-sky-800 border-sky-200" },
  { label: "L 10.00", value: 10, type: "Billete", bgBadge: "bg-orange-100 text-orange-800 border-orange-200" },
  { label: "L 5.00", value: 5, type: "Billete", bgBadge: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { label: "L 2.00", value: 2, type: "Billete", bgBadge: "bg-rose-100 text-rose-800 border-rose-200" },
  { label: "L 1.00", value: 1, type: "Billete", bgBadge: "bg-slate-100 text-slate-800 border-slate-300" },
  { label: "L 0.50 (50¢)", value: 0.5, type: "Moneda", bgBadge: "bg-slate-100 text-slate-600 border-slate-200" },
  { label: "L 0.20 (20¢)", value: 0.2, type: "Moneda", bgBadge: "bg-slate-100 text-slate-600 border-slate-200" },
  { label: "L 0.10 (10¢)", value: 0.1, type: "Moneda", bgBadge: "bg-slate-100 text-slate-600 border-slate-200" },
  { label: "L 0.05 (5¢)", value: 0.05, type: "Moneda", bgBadge: "bg-slate-100 text-slate-600 border-slate-200" },
];

export const USD_DENOMINATIONS = [
  { label: "$ 100.00", value: 100, type: "Billete", bgBadge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { label: "$ 50.00", value: 50, type: "Billete", bgBadge: "bg-teal-100 text-teal-800 border-teal-200" },
  { label: "$ 20.00", value: 20, type: "Billete", bgBadge: "bg-sky-100 text-sky-800 border-sky-200" },
  { label: "$ 10.00", value: 10, type: "Billete", bgBadge: "bg-amber-100 text-amber-800 border-amber-200" },
  { label: "$ 5.00", value: 5, type: "Billete", bgBadge: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { label: "$ 1.00", value: 1, type: "Billete", bgBadge: "bg-slate-100 text-slate-800 border-slate-300" },
  { label: "$ 0.25 (25¢)", value: 0.25, type: "Moneda", bgBadge: "bg-slate-100 text-slate-600 border-slate-200" },
  { label: "$ 0.10 (10¢)", value: 0.1, type: "Moneda", bgBadge: "bg-slate-100 text-slate-600 border-slate-200" },
  { label: "$ 0.05 (5¢)", value: 0.05, type: "Moneda", bgBadge: "bg-slate-100 text-slate-600 border-slate-200" },
  { label: "$ 0.01 (1¢)", value: 0.01, type: "Moneda", bgBadge: "bg-slate-100 text-slate-600 border-slate-200" },
];

const EXPENSE_CATEGORIES = [
  "Alimentación y refrigerios",
  "Transporte y combustible / Envíos",
  "Papelería y útiles de oficina",
  "Mantenimiento y reparaciones menores",
  "Servicios y trámites legales / aduanales",
  "Limpieza y cafetería",
  "Medicamentos / Botiquín de planta",
  "Imprevistos de planta / Operativos",
  "Otros gastos varios",
];

interface Props {
  funds: any[];
  selectedFundId: string;
  setSelectedFundId: (id: string) => void;
  loading: boolean;
  audits: any[];
  vouchers: any[];
  activeTab: "movimientos" | "arqueo" | "historial" | "vales" | "reposicion";
  setActiveTab: (tab: "movimientos" | "arqueo" | "historial" | "vales" | "reposicion") => void;
  onRefresh: (fundId?: string) => Promise<void>;
  currentAdminUser: any;
  showToast: (msg: string) => void;
  onBackToDashboard: () => void;
  connectedBanks?: any[];
  accounts?: any[];
}

export default function CajaChicaModule({
  funds,
  selectedFundId,
  setSelectedFundId,
  loading,
  audits,
  vouchers,
  activeTab,
  setActiveTab,
  onRefresh,
  currentAdminUser,
  showToast,
  onBackToDashboard,
  connectedBanks = [],
  accounts = [],
}: Props) {
  // Currently selected fund object
  const currentFund = useMemo(() => {
    return funds.find((f) => f.id === selectedFundId) || funds[0] || null;
  }, [funds, selectedFundId]);

  const currencySymbol = currentFund?.currency === "USD" ? "$" : "L";

  const formatAmount = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val || 0;
    return `${currencySymbol} ${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Transactions belonging to this fund
  const fundTransactions = useMemo(() => {
    return currentFund?.transactions || [];
  }, [currentFund]);

  // Vouchers belonging to this fund
  const fundVouchers = useMemo(() => {
    return currentFund?.vouchers || vouchers.filter((v) => v.fundId === currentFund?.id);
  }, [currentFund, vouchers]);

  // Audits belonging to this fund
  const fundAudits = useMemo(() => {
    return audits.filter((a) => a.fundId === currentFund?.id);
  }, [audits, currentFund]);

  // Computed financial KPIs
  const fixedAmount = currentFund?.fixedAmount || 0;
  const currentCash = currentFund?.currentBalance || 0;
  const minThreshold = currentFund?.minThreshold || 0;

  const unreimbursedExpenses = useMemo(() => {
    return fundTransactions.filter((t: any) => !t.isReimbursed && t.type === "EXPENSE");
  }, [fundTransactions]);

  const unreimbursedTotal = useMemo(() => {
    return unreimbursedExpenses.reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
  }, [unreimbursedExpenses]);

  const activeVouchers = useMemo(() => {
    return fundVouchers.filter((v: any) => v.status === "ACTIVE");
  }, [fundVouchers]);

  const activeVouchersTotal = useMemo(() => {
    return activeVouchers.reduce((acc: number, v: any) => acc + (v.amount || 0), 0);
  }, [activeVouchers]);

  // Available cash percentage
  const cashPercentage = fixedAmount > 0 ? Math.round((currentCash / fixedAmount) * 100) : 0;
  const isReplenishmentRequired = currentCash <= minThreshold;

  // Modals state
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    type: "EXPENSE",
    category: "Alimentación y refrigerios",
    concept: "",
    beneficiary: "",
    voucherNumber: "",
    invoiceNumber: "",
    cai: "",
    amount: "",
    taxDeductible: true,
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const [showNewVoucherModal, setShowNewVoucherModal] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    beneficiary: "",
    department: "Producción",
    concept: "",
    amount: "",
    expectedLiquidationDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
  });
  const [submittingVoucher, setSubmittingVoucher] = useState(false);

  const [liquidatingVoucher, setLiquidatingVoucher] = useState<any | null>(null);
  const [liquidateForm, setLiquidateForm] = useState({
    actualExpense: "",
    returnedCash: "",
    receiptNumber: "",
    notes: "",
  });
  const [submittingLiquidation, setSubmittingLiquidation] = useState(false);

  // New Fund Modal
  const [showNewFundModal, setShowNewFundModal] = useState(false);
  const [fundForm, setFundForm] = useState({
    code: "",
    name: "",
    custodianName: "",
    custodianTitle: "Asistente Contable",
    currency: "HNL",
    fixedAmount: "",
    minThreshold: "",
    location: "Planta Búfalo, Villanueva",
  });
  const [submittingFund, setSubmittingFund] = useState(false);

  // Arqueo Interactivo State
  const [cashCounts, setCashCounts] = useState<Record<string, number>>({});
  const [auditorName, setAuditorName] = useState("Lic. Auditoría Interna");
  const [auditObservations, setAuditObservations] = useState("");
  const [savingAudit, setSavingAudit] = useState(false);
  const [selectedAuditForPrint, setSelectedAuditForPrint] = useState<any | null>(null);

  // Filters for Transactions Tab
  const [expenseSearch, setExpenseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODOS");
  const [reimbursementFilter, setReimbursementFilter] = useState("TODOS");

  // Reposición selection & Banking integration
  const [selectedTxForReimbursement, setSelectedTxForReimbursement] = useState<string[]>([]);
  const [submittingReimbursement, setSubmittingReimbursement] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [replenishPaymentMethod, setReplenishPaymentMethod] = useState<"CHEQUE" | "TRANSFERENCIA_ACH">("CHEQUE");
  const [replenishReference, setReplenishReference] = useState<string>("CHQ-1048");
  const [replenishPayee, setReplenishPayee] = useState<string>("");
  const [replenishNotes, setReplenishNotes] = useState<string>("");
  const [selectedPolicyForPrint, setSelectedPolicyForPrint] = useState<any | null>(null);

  // Selected bank object
  const activeBank = useMemo(() => {
    if (selectedBankId) {
      const b = connectedBanks.find((bk) => bk.id === selectedBankId);
      if (b) return b;
    }
    const matchCurr = connectedBanks.find((bk) => bk.currency === currentFund?.currency);
    return matchCurr || connectedBanks[0] || null;
  }, [connectedBanks, selectedBankId, currentFund]);

  // Dynamic Journal Entry lines for preview
  const previewJournalEntry = useMemo(() => {
    if (unreimbursedExpenses.length === 0) return [];
    const catMap: Record<string, number> = {};
    let deductibleTotal = 0;

    for (const t of unreimbursedExpenses) {
      const cat = t.category || "Gastos Varios";
      catMap[cat] = (catMap[cat] || 0) + (t.amount || 0);
      if (t.taxDeductible) deductibleTotal += (t.amount || 0);
    }

    const isvCredit = Math.round((deductibleTotal - deductibleTotal / 1.15) * 100) / 100;
    const netTotal = Math.round((unreimbursedTotal - isvCredit) * 100) / 100;

    const lines: Array<{
      code: string;
      name: string;
      type: "DEBIT" | "CREDIT";
      debit: number;
      credit: number;
    }> = [];

    // Debits
    Object.entries(catMap).forEach(([cat, amt]) => {
      let code = "6000";
      let name = `Gastos de Operación (${cat})`;
      if (cat.includes("Transporte") || cat.includes("Combustible") || cat.includes("Envíos")) {
        code = "6100";
        name = "Gastos de Transporte, Fletes y Combustibles";
      } else if (cat.includes("Papelería") || cat.includes("Oficina")) {
        code = "6200";
        name = "Gastos de Papelería, Útiles y Suministros";
      } else if (cat.includes("Mantenimiento") || cat.includes("Reparación")) {
        code = "5000";
        name = "Costo de Mantenimiento y Operaciones Planta";
      } else if (cat.includes("Alimentación") || cat.includes("Cafetería")) {
        code = "6400";
        name = "Gastos de Personal, Cafetería y Alimentación";
      }

      const netCat = isvCredit > 0 && deductibleTotal > 0 ? (amt / unreimbursedTotal) * netTotal : amt;
      lines.push({
        code,
        name,
        type: "DEBIT",
        debit: Math.round(netCat * 100) / 100,
        credit: 0,
      });
    });

    if (isvCredit > 0) {
      lines.push({
        code: "1150",
        name: "Crédito Fiscal — Impuesto Sobre Ventas (ISV 15%)",
        type: "DEBIT",
        debit: isvCredit,
        credit: 0,
      });
    }

    // Credit to Bank
    lines.push({
      code: "1100",
      name: activeBank ? `${activeBank.name} (${activeBank.accountNumber})` : "Banco Ficohsa HNL",
      type: "CREDIT",
      debit: 0,
      credit: unreimbursedTotal,
    });

    return lines;
  }, [unreimbursedExpenses, unreimbursedTotal, activeBank]);

  // Denominations list based on current currency
  const activeDenominations = currentFund?.currency === "USD" ? USD_DENOMINATIONS : HNL_DENOMINATIONS;

  // Calculate physical cash counted
  const physicalCashTotal = useMemo(() => {
    let sum = 0;
    for (const d of activeDenominations) {
      const count = cashCounts[d.value.toString()] || 0;
      sum += count * d.value;
    }
    return Math.round(sum * 100) / 100;
  }, [cashCounts, activeDenominations]);

  // Arqueo Cuadre formula:
  // Total Valores en Caja = Efectivo Físico + Comprobantes por Rendir + Vales Activos
  const totalAccountedFor = physicalCashTotal + unreimbursedTotal + activeVouchersTotal;
  const auditDifference = Math.round((totalAccountedFor - fixedAmount) * 100) / 100;

  const auditStatus = useMemo(() => {
    if (Math.abs(auditDifference) < 0.01) return "EXACTO";
    if (auditDifference > 0) return "SOBRANTE";
    return "FALTANTE";
  }, [auditDifference]);

  // Denomination stepper helpers
  const handleSetDenomCount = (val: number, newCount: number) => {
    const safeCount = Math.max(0, Math.floor(newCount || 0));
    setCashCounts((prev) => ({
      ...prev,
      [val.toString()]: safeCount,
    }));
  };

  const handleResetCashCounts = () => {
    setCashCounts({});
    setAuditObservations("");
  };

  // Submit Expense
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFund) return;
    const amt = parseFloat(expenseForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Ingrese un monto válido mayor a 0");
      return;
    }
    if (!expenseForm.concept.trim()) {
      alert("Ingrese el concepto del gasto");
      return;
    }

    setSubmittingExpense(true);
    try {
      const res = await fetch("/api/caja-chica/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: currentFund.id,
          type: expenseForm.type,
          category: expenseForm.category,
          concept: expenseForm.concept.trim(),
          beneficiary: expenseForm.beneficiary.trim() || undefined,
          voucherNumber: expenseForm.voucherNumber.trim() || undefined,
          invoiceNumber: expenseForm.invoiceNumber.trim() || undefined,
          cai: expenseForm.cai.trim() || undefined,
          amount: amt,
          taxDeductible: expenseForm.taxDeductible,
          registeredBy: currentAdminUser?.name || "Administrador",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          expenseForm.type === "EXPENSE"
            ? "Gasto registrado exitosamente en Caja Chica"
            : "Reembolso / Ingreso registrado exitosamente"
        );
        setShowNewExpenseModal(false);
        setExpenseForm({
          type: "EXPENSE",
          category: "Alimentación y refrigerios",
          concept: "",
          beneficiary: "",
          voucherNumber: "",
          invoiceNumber: "",
          cai: "",
          amount: "",
          taxDeductible: true,
        });
        await onRefresh(currentFund.id);
      } else {
        alert(data.error || "Error al registrar movimiento");
      }
    } catch (err: any) {
      alert(err.message || "Error al registrar movimiento");
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Submit Voucher
  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFund) return;
    const amt = parseFloat(voucherForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Ingrese un monto válido");
      return;
    }
    if (!voucherForm.beneficiary.trim() || !voucherForm.concept.trim()) {
      alert("Ingrese el beneficiario y el concepto");
      return;
    }

    setSubmittingVoucher(true);
    try {
      const res = await fetch("/api/caja-chica/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: currentFund.id,
          beneficiary: voucherForm.beneficiary.trim(),
          department: voucherForm.department.trim() || undefined,
          concept: voucherForm.concept.trim(),
          amount: amt,
          expectedLiquidationDate: voucherForm.expectedLiquidationDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Vale Provisional ${data.data.voucherNumber} emitido correctamente`);
        setShowNewVoucherModal(false);
        setVoucherForm({
          beneficiary: "",
          department: "Producción",
          concept: "",
          amount: "",
          expectedLiquidationDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        });
        await onRefresh(currentFund.id);
      } else {
        alert(data.error || "Error al emitir vale provisional");
      }
    } catch (err: any) {
      alert(err.message || "Error al emitir vale");
    } finally {
      setSubmittingVoucher(false);
    }
  };

  // Liquidate Voucher
  const handleLiquidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidatingVoucher) return;
    const actual = parseFloat(liquidateForm.actualExpense);
    const returned = parseFloat(liquidateForm.returnedCash || "0");
    if (isNaN(actual) || actual < 0) {
      alert("Ingrese un gasto real válido");
      return;
    }

    setSubmittingLiquidation(true);
    try {
      const res = await fetch("/api/caja-chica/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LIQUIDATE",
          voucherId: liquidatingVoucher.id,
          actualExpense: actual,
          returnedCash: isNaN(returned) ? 0 : returned,
          receiptNumber: liquidateForm.receiptNumber.trim() || undefined,
          notes: liquidateForm.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Vale ${liquidatingVoucher.voucherNumber} liquidado exitosamente`);
        setLiquidatingVoucher(null);
        setLiquidateForm({ actualExpense: "", returnedCash: "", receiptNumber: "", notes: "" });
        await onRefresh(currentFund?.id);
      } else {
        alert(data.error || "Error al liquidar vale");
      }
    } catch (err: any) {
      alert(err.message || "Error al liquidar vale");
    } finally {
      setSubmittingLiquidation(false);
    }
  };

  // Submit Fund Creation
  const handleCreateFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fixed = parseFloat(fundForm.fixedAmount);
    const min = parseFloat(fundForm.minThreshold);
    if (!fundForm.name.trim() || !fundForm.custodianName.trim() || isNaN(fixed) || fixed <= 0) {
      alert("Por favor complete los campos obligatorios del fondo");
      return;
    }

    setSubmittingFund(true);
    try {
      const res = await fetch("/api/caja-chica/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: fundForm.code.trim() || undefined,
          name: fundForm.name.trim(),
          custodianName: fundForm.custodianName.trim(),
          custodianTitle: fundForm.custodianTitle.trim() || undefined,
          currency: fundForm.currency,
          fixedAmount: fixed,
          minThreshold: isNaN(min) ? fixed * 0.25 : min,
          location: fundForm.location.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Fondo "${data.data.name}" creado con éxito`);
        setShowNewFundModal(false);
        setFundForm({
          code: "",
          name: "",
          custodianName: "",
          custodianTitle: "Asistente Contable",
          currency: "HNL",
          fixedAmount: "",
          minThreshold: "",
          location: "Planta Búfalo, Villanueva",
        });
        await onRefresh(data.data.id);
      } else {
        alert(data.error || "Error al crear fondo");
      }
    } catch (err: any) {
      alert(err.message || "Error al crear fondo");
    } finally {
      setSubmittingFund(false);
    }
  };

  // Save Audit
  const handleSaveAuditRecord = async () => {
    if (!currentFund) return;
    setSavingAudit(true);
    try {
      const res = await fetch("/api/caja-chica/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: currentFund.id,
          theoreticalBalance: fixedAmount - unreimbursedTotal - activeVouchersTotal,
          physicalCashTotal,
          pendingReceiptsTotal: unreimbursedTotal,
          activeVouchersTotal,
          difference: auditDifference,
          status: auditStatus,
          denominations: cashCounts,
          observations: auditObservations.trim() || undefined,
          auditorName: auditorName.trim() || "Auditoría Interna",
          custodianName: currentFund.custodianName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Acta de Arqueo ${data.data.auditNumber} registrada con éxito`);
        const printableData = {
          ...data.data,
          fund: currentFund,
          unreimbursedTransactions: unreimbursedExpenses,
          activeVouchersList: activeVouchers,
        };
        setSelectedAuditForPrint(printableData);
        await onRefresh(currentFund.id);
        setActiveTab("historial");
      } else {
        alert(data.error || "Error al guardar arqueo");
      }
    } catch (err: any) {
      alert(err.message || "Error al guardar acta");
    } finally {
      setSavingAudit(false);
    }
  };

  // Replenishment Action with Bank Integration & Check Policy Generation
  const handleExecuteReplenish = async () => {
    if (!currentFund || unreimbursedExpenses.length === 0) return;
    if (!activeBank) {
      alert("Por favor seleccione una cuenta bancaria activa para realizar el desembolso.");
      return;
    }
    if (activeBank.bankBalance < unreimbursedTotal) {
      alert(
        `Saldo insuficiente en ${activeBank.name}. Saldo disponible: ${activeBank.currency} ${activeBank.bankBalance.toFixed(
          2
        )}, requerido: ${currentFund.currency} ${unreimbursedTotal.toFixed(2)}`
      );
      return;
    }

    setSubmittingReimbursement(true);
    try {
      const res = await fetch("/api/caja-chica/replenish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: currentFund.id,
          bankAccountId: activeBank.id,
          paymentMethod: replenishPaymentMethod,
          referenceNumber: replenishReference.trim(),
          checkPayee: replenishPayee.trim() || currentFund.custodianName,
          notes: replenishNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Póliza ${data.policy.policyNumber} generada y desembolsada exitosamente desde ${activeBank.name}`
        );
        setSelectedPolicyForPrint(data.policy);
        await onRefresh(currentFund.id);
      } else {
        alert(data.error || "Error al procesar desembolso bancario");
      }
    } catch (err: any) {
      alert(err.message || "Error de red al procesar reposición");
    } finally {
      setSubmittingReimbursement(false);
    }
  };

  // Filtered transactions for Movimientos tab
  const filteredTransactions = useMemo(() => {
    return fundTransactions.filter((t: any) => {
      const matchSearch =
        !expenseSearch ||
        t.concept.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (t.beneficiary && t.beneficiary.toLowerCase().includes(expenseSearch.toLowerCase())) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(expenseSearch.toLowerCase())) ||
        (t.voucherNumber && t.voucherNumber.toLowerCase().includes(expenseSearch.toLowerCase())) ||
        (t.cai && t.cai.toLowerCase().includes(expenseSearch.toLowerCase()));

      const matchCat = categoryFilter === "TODOS" || t.category === categoryFilter;

      const matchReimb =
        reimbursementFilter === "TODOS" ||
        (reimbursementFilter === "PENDIENTE" && !t.isReimbursed) ||
        (reimbursementFilter === "REEMBOLSADO" && t.isReimbursed);

      return matchSearch && matchCat && matchReimb;
    });
  }, [fundTransactions, expenseSearch, categoryFilter, reimbursementFilter]);

  if (!currentFund && !loading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-full bg-orange-50 text-[#f6821f] flex items-center justify-center mx-auto">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">No hay Fondos de Caja Chica configurados</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Comience creando un Fondo Fijo de Caja Chica para la planta o departamento con su custodio responsable.
        </p>
        <button
          onClick={() => setShowNewFundModal(true)}
          className="px-4 py-2.5 bg-[#f6821f] hover:bg-[#e07318] text-white font-semibold rounded-xl text-sm transition shadow-sm"
        >
          + Crear Primer Fondo de Caja Chica
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Dashboard</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Caja Chica &amp; Arqueos</span>
        </div>

        {/* Fund Selector & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {funds.length > 0 && (
            <div className="relative">
              <select
                value={selectedFundId || currentFund?.id}
                onChange={(e) => {
                  setSelectedFundId(e.target.value);
                  onRefresh(e.target.value);
                }}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-[#f6821f] cursor-pointer shadow-xs appearance-none"
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} — {f.name} ({f.currency})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowNewFundModal(true)}
            title="Crear nuevo fondo de caja chica"
            className="p-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer bg-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowNewVoucherModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <span>+ Nuevo Vale</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewExpenseModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <span>+ Registrar Gasto</span>
          </button>

          <button
            type="button"
            onClick={() => onRefresh(selectedFundId || currentFund?.id)}
            disabled={loading}
            title="Recargar datos de caja chica"
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#f6821f]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ================= EXECUTIVE KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Fondo Fijo */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fondo Fijo Asignado</span>
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
              {currentFund?.currency}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatAmount(fixedAmount)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate font-medium text-slate-700">
              Custodio: {currentFund?.custodianName || "Sin asignar"}
            </span>
            <span className="text-slate-400 shrink-0">{currentFund?.code}</span>
          </div>
        </div>

        {/* Card 2: Saldo Físico Disponible */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Saldo Físico en Caja</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isReplenishmentRequired
                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
              }`}
            >
              {cashPercentage}% Restante
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                isReplenishmentRequired ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {formatAmount(currentCash)}
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isReplenishmentRequired ? "bg-rose-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, cashPercentage))}%` }}
            ></div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
            <span>Mínimo alerta: {formatAmount(minThreshold)}</span>
            {isReplenishmentRequired && <span className="text-rose-600 font-bold">¡Reponer!</span>}
          </div>
        </div>

        {/* Card 3: Comprobantes por Rendir */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gastos por Rendir</span>
            <span className="w-5 h-5 rounded-full bg-orange-50 text-[#f6821f] text-[10px] font-bold flex items-center justify-center">
              {unreimbursedExpenses.length}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatAmount(unreimbursedTotal)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Facturas / Recibos</span>
            <button
              onClick={() => setActiveTab("reposicion")}
              className="text-[#f6821f] hover:underline font-bold text-[11px] cursor-pointer"
            >
              Ver Reposición →
            </button>
          </div>
        </div>

        {/* Card 4: Vales Provisionales Activos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vales Provisionales</span>
            <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold flex items-center justify-center">
              {activeVouchers.length}
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatAmount(activeVouchersTotal)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Anticipos pendientes</span>
            <button
              onClick={() => setActiveTab("vales")}
              className="text-amber-700 hover:underline font-bold text-[11px] cursor-pointer"
            >
              Gestionar →
            </button>
          </div>
        </div>

        {/* Card 5: Integridad Teórica */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Integridad de Fondo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatAmount(currentCash + unreimbursedTotal + activeVouchersTotal)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Cuadre 100% OK
            </span>
            <span className="text-slate-400 text-[10px]">Caja + Docs + Vales</span>
          </div>
        </div>
      </div>

      {/* ================= TABS NAVIGATION ================= */}
      <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("movimientos")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === "movimientos"
              ? "border-[#f6821f] text-[#f6821f]"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Movimientos de Caja
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-100 text-slate-600 font-semibold">
            {fundTransactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("arqueo")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === "arqueo"
              ? "border-[#f6821f] text-[#f6821f]"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Arqueo Físico Interactivo
          <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-orange-100 text-[#f6821f] font-bold uppercase tracking-wider">
            Calculadora
          </span>
        </button>

        <button
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === "historial"
              ? "border-[#f6821f] text-[#f6821f]"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Historial de Actas
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-100 text-slate-600 font-semibold">
            {fundAudits.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("vales")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === "vales"
              ? "border-[#f6821f] text-[#f6821f]"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Vales Provisionales
          {activeVouchers.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-100 text-amber-800 font-bold">
              {activeVouchers.length} activos
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("reposicion")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === "reposicion"
              ? "border-[#f6821f] text-[#f6821f]"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Solicitud de Reposición
          {isReplenishmentRequired && (
            <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-rose-100 text-rose-700 font-bold uppercase tracking-wider">
              Urgente
            </span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: MOVIMIENTOS ================= */}
      {activeTab === "movimientos" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="Buscar por concepto, factura, CAI..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
              >
                <option value="TODOS">Todas las Categorías</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={reimbursementFilter}
                onChange={(e) => setReimbursementFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="PENDIENTE">Pendientes de Reembolso</option>
                <option value="REEMBOLSADO">Reembolsados</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewExpenseModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-[#f6821f] hover:bg-[#e07318] text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              + Nuevo Movimiento
            </button>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Categoría & Concepto</th>
                    <th className="py-3 px-4">Beneficiario / Proveedor</th>
                    <th className="py-3 px-4">Factura / Recibo</th>
                    <th className="py-3 px-4">CAI Fiscal</th>
                    <th className="py-3 px-4 text-center">ISV 15%</th>
                    <th className="py-3 px-4 text-right">Importe</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        No se encontraron transacciones registradas en este período.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx: any) => {
                      const isExpense = tx.type === "EXPENSE";
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString("es-HN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isExpense
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isExpense ? "Gasto" : "Reembolso / Ingreso"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">{tx.concept}</span>
                            <span className="text-[11px] text-slate-400">{tx.category}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {tx.beneficiary || "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {tx.invoiceNumber || tx.voucherNumber || "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-xs truncate" title={tx.cai}>
                            {tx.cai || "Sin CAI"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {tx.taxDeductible ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Deducible
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">No</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                            <span className={isExpense ? "text-slate-900" : "text-emerald-700"}>
                              {isExpense ? "-" : "+"} {formatAmount(tx.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {tx.isReimbursed ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Reembolsado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Por Rendir
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-600 gap-2">
              <span>
                Mostrando <b>{filteredTransactions.length}</b> de <b>{fundTransactions.length}</b> movimientos
              </span>
              <div className="flex items-center gap-4 font-medium">
                <span>
                  Total Gastos por Rendir:{" "}
                  <b className="font-mono text-slate-900">{formatAmount(unreimbursedTotal)}</b>
                </span>
                <span>
                  Fondo Fijo: <b className="font-mono text-slate-900">{formatAmount(fixedAmount)}</b>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ARQUEO FÍSICO INTERACTIVO ================= */}
      {activeTab === "arqueo" && (
        <div className="space-y-6">
          {/* Arqueo Header Instructions Banner */}
          <div className="bg-gradient-to-r from-orange-50/70 to-amber-50/70 border border-orange-200/60 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f6821f]"></span>
                Cédula de Arqueo Físico y Reconciliación de Valores
              </h3>
              <p className="text-xs text-slate-600">
                Ingrese el recuento físico de piezas monetarias por cada denominación. El sistema calculará el cuadre
                en tiempo real contra el fondo fijo autorizado, sumando comprobantes y vales pendientes.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetCashCounts}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Limpiar Conteo
              </button>
              <button
                type="button"
                onClick={() => {
                  // Fill counts with theoretical match for quick auditing
                  const sampleCounts: Record<string, number> = {};
                  let remaining = currentCash;
                  for (const d of activeDenominations) {
                    if (remaining >= d.value) {
                      const count = Math.floor(remaining / d.value);
                      sampleCounts[d.value.toString()] = count;
                      remaining = Math.round((remaining - count * d.value) * 100) / 100;
                    }
                  }
                  setCashCounts(sampleCounts);
                  showToast("Conteo sincronizado con saldo teórico de caja");
                }}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Autocompletar Teórico
              </button>
            </div>
          </div>

          {/* Main Arqueo Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols): Interactive Denominations Counter */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Conteo de Billetes y Monedas ({currentFund?.currency})
                  </h4>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    Total Efectivo: <span className="text-[#f6821f]">{formatAmount(physicalCashTotal)}</span>
                  </span>
                </div>

                {/* Denominations Grid / List */}
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {activeDenominations.map((denom) => {
                    const count = cashCounts[denom.value.toString()] || 0;
                    const subtotal = count * denom.value;

                    return (
                      <div
                        key={denom.value}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                          count > 0 ? "bg-orange-50/40 border-orange-200" : "bg-slate-50/70 border-slate-200"
                        }`}
                      >
                        {/* Denomination Info */}
                        <div className="flex items-center gap-3 w-40">
                          <span className={`px-2 py-1 rounded-lg text-xs font-extrabold border ${denom.bgBadge}`}>
                            {denom.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">{denom.type}</span>
                        </div>

                        {/* Stepper Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetDenomCount(denom.value, count - 1)}
                            disabled={count <= 0}
                            className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold transition text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={count || ""}
                            placeholder="0"
                            onChange={(e) => handleSetDenomCount(denom.value, parseInt(e.target.value) || 0)}
                            className="w-14 text-center font-mono text-xs font-bold bg-white border border-slate-300 rounded-lg py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSetDenomCount(denom.value, count + 1)}
                            className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition text-xs cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetDenomCount(denom.value, count + 5)}
                            className="px-1.5 py-1 rounded-md text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition cursor-pointer"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetDenomCount(denom.value, count + 10)}
                            className="px-1.5 py-1 rounded-md text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition cursor-pointer"
                          >
                            +10
                          </button>
                        </div>

                        {/* Line Subtotal */}
                        <div className="w-28 text-right font-mono font-bold text-xs text-slate-900">
                          {formatAmount(subtotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auditor & Observations Form */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Datos de Certificación del Arqueo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Auditor / Revisor</label>
                    <input
                      type="text"
                      value={auditorName}
                      onChange={(e) => setAuditorName(e.target.value)}
                      placeholder="Nombre del Auditor"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Custodio Responsable</label>
                    <input
                      type="text"
                      disabled
                      value={currentFund?.custodianName || ""}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-xs">Observaciones o Hallazgos</label>
                  <textarea
                    rows={2}
                    value={auditObservations}
                    onChange={(e) => setAuditObservations(e.target.value)}
                    placeholder="Ej. El arqueo se realizó sin novedades en presencia del custodio. Billetes y facturas coinciden..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Live Cuadre Card & Print Action */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5 sticky top-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Liquidación del Arqueo
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date().toLocaleDateString("es-HN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Arithmetic Breakdown */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-600 font-medium">1. Efectivo Físico Contado</span>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(physicalCashTotal)}</span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50">
                    <div>
                      <span className="text-slate-600 font-medium block">2. (+) Facturas & Recibos Pendientes</span>
                      <span className="text-[10px] text-slate-400">{unreimbursedExpenses.length} comprobantes en tránsito</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(unreimbursedTotal)}</span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50">
                    <div>
                      <span className="text-slate-600 font-medium block">3. (+) Vales Provisionales Activos</span>
                      <span className="text-[10px] text-slate-400">{activeVouchers.length} vales sin liquidar</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(activeVouchersTotal)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-800">Total Valores en Caja</span>
                    <span className="font-mono font-extrabold text-sm text-slate-900">
                      {formatAmount(totalAccountedFor)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500">
                    <span>(-) Fondo Fijo Autorizado</span>
                    <span className="font-mono font-semibold">{formatAmount(fixedAmount)}</span>
                  </div>
                </div>

                {/* Big Result Badge */}
                <div
                  className={`p-4 rounded-2xl border text-center space-y-1 ${
                    auditStatus === "EXACTO"
                      ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                      : auditStatus === "SOBRANTE"
                      ? "bg-blue-50/80 border-blue-300 text-blue-900"
                      : "bg-rose-50/80 border-rose-300 text-rose-900"
                  }`}
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                    Resultado del Arqueo
                  </span>
                  <div className="text-xl font-black tracking-tight">
                    {auditStatus === "EXACTO" && "EXACTO — CUADRADO"}
                    {auditStatus === "SOBRANTE" && `SOBRANTE: +${formatAmount(auditDifference)}`}
                    {auditStatus === "FALTANTE" && `FALTANTE: ${formatAmount(auditDifference)}`}
                  </div>
                  <p className="text-[11px] opacity-80">
                    {auditStatus === "EXACTO" && "La totalidad de efectivo y documentos amparan al 100% el fondo asignado."}
                    {auditStatus === "SOBRANTE" && "Existe excedente de dinero o comprobantes sobre el fondo fijado."}
                    {auditStatus === "FALTANTE" && "Se determinó faltante no justificado en la caja. Se requiere descargo."}
                  </p>
                </div>

                {/* Save & Print Button */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={savingAudit}
                    onClick={handleSaveAuditRecord}
                    className="w-full py-3 bg-[#f6821f] hover:bg-[#e07318] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingAudit ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    )}
                    Guardar e Imprimir Acta Oficial
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    Se generará el correlativo oficial y el acta para firma mancomunada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: HISTORIAL DE ARQUEOS ================= */}
      {activeTab === "historial" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Actas Oficiales de Arqueo Registradas
              </h3>
              <p className="text-xs text-slate-500">
                Auditorías físicas practicadas al fondo con firmas y cuadre registrado.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("arqueo")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              + Nuevo Arqueo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Acta</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Auditor</th>
                  <th className="py-3 px-4">Custodio</th>
                  <th className="py-3 px-4 text-right">Efectivo Físico</th>
                  <th className="py-3 px-4 text-right">Comprobantes & Vales</th>
                  <th className="py-3 px-4 text-right">Diferencia</th>
                  <th className="py-3 px-4 text-center">Resultado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fundAudits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No hay actas de arqueo registradas aún para este fondo.
                    </td>
                  </tr>
                ) : (
                  fundAudits.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.auditNumber}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString("es-HN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{a.auditorName}</td>
                      <td className="py-3 px-4 text-slate-600">{a.custodianName}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatAmount(a.physicalCashTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatAmount((a.pendingReceiptsTotal || 0) + (a.activeVouchersTotal || 0))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            a.difference === 0
                              ? "text-emerald-700"
                              : a.difference > 0
                              ? "text-blue-700"
                              : "text-rose-700"
                          }
                        >
                          {a.difference > 0 ? "+" : ""}
                          {formatAmount(a.difference)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === "EXACTO"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : a.status === "SOBRANTE"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedAuditForPrint({
                              ...a,
                              fund: currentFund,
                              unreimbursedTransactions: unreimbursedExpenses,
                              activeVouchersList: activeVouchers,
                            });
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Ver / Imprimir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: VALES PROVISIONALES ================= */}
      {activeTab === "vales" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Vales Provisionales de Caja Chica (Anticipos a Colaboradores)
              </h3>
              <p className="text-xs text-slate-500">
                Control de efectivo entregado temporalmente para compras de emergencia o diligencias de planta.
              </p>
            </div>
            <button
              onClick={() => setShowNewVoucherModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              + Emitir Vale Provisional
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Vale</th>
                  <th className="py-3 px-4">Fecha Emisión</th>
                  <th className="py-3 px-4">Colaborador / Beneficiario</th>
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-4">Concepto / Destino</th>
                  <th className="py-3 px-4 text-right">Importe Anticipado</th>
                  <th className="py-3 px-4">Fecha Límite</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {fundVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No hay vales provisionales emitidos en este fondo.
                    </td>
                  </tr>
                ) : (
                  fundVouchers.map((v: any) => {
                    const isActive = v.status === "ACTIVE";
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.voucherNumber}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {new Date(v.issuedDate).toLocaleDateString("es-HN")}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{v.beneficiary}</td>
                        <td className="py-3 px-4 text-slate-600">{v.department || "—"}</td>
                        <td className="py-3 px-4 text-slate-700">{v.concept}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatAmount(v.amount)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {v.expectedLiquidationDate
                            ? new Date(v.expectedLiquidationDate).toLocaleDateString("es-HN")
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {isActive ? "Activo (Sin Liquidar)" : "Liquidado"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isActive ? (
                            <button
                              onClick={() => {
                                setLiquidatingVoucher(v);
                                setLiquidateForm({
                                  actualExpense: v.amount.toString(),
                                  returnedCash: "0",
                                  receiptNumber: "",
                                  notes: "",
                                });
                              }}
                              className="px-2.5 py-1 bg-[#f6821f] hover:bg-[#e07318] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Liquidar Vale
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {v.receiptNumber ? `Fact: ${v.receiptNumber}` : "OK"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: SOLICITUD DE REPOSICIÓN & BANCOS ================= */}
      {activeTab === "reposicion" && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/80 to-sky-50/80 border border-emerald-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Módulo de Tesorería & Contabilidad
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Emisión de Póliza de Cheque / Desembolso Bancario de Reposición
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl">
                Al procesar la reposición, se generará el asiento contable en el Plan de Cuentas, se debitará la cuenta
                bancaria seleccionada (Ficohsa, BAC o Atlántida), se restaurará el fondo físico de caja chica a su monto
                fijo y se emitirá la póliza de cheque oficial para firmas.
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total por Desembolsar
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {formatAmount(unreimbursedTotal)}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {unreimbursedExpenses.length} comprobantes auditados
              </span>
            </div>
          </div>

          {/* Main 2-Column Split: Bank Configuration & Live Accounting Policy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (6 cols): Bank Account Selection & Check Details */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#f6821f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  1. Cuenta Bancaria Emisora del Pago
                </h4>

                {/* Bank Accounts Grid */}
                <div className="grid grid-cols-1 gap-2.5">
                  {connectedBanks.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                      Cargando cuentas bancarias...
                    </div>
                  ) : (
                    connectedBanks.map((b) => {
                      const isSelected = activeBank?.id === b.id;
                      const hasSufficientFunds = b.bankBalance >= unreimbursedTotal;

                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBankId(b.id)}
                          className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-[#f6821f] bg-orange-50/40 shadow-xs"
                              : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/70"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: b.color || "#0284c7" }}
                            >
                              {b.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">{b.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {b.type} — {b.accountNumber}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                              Saldo Banco
                            </span>
                            <span
                              className={`text-xs font-mono font-bold ${
                                hasSufficientFunds ? "text-slate-900" : "text-rose-600"
                              }`}
                            >
                              {b.currency} {Number(b.bankBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                            {!hasSufficientFunds && (
                              <span className="text-[9px] text-rose-600 font-bold block">Saldo bajo</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Payment Method & References Form */}
                <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReplenishPaymentMethod("CHEQUE")}
                      className={`py-2 px-3 rounded-xl font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        replenishPaymentMethod === "CHEQUE"
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>📝 Cheque Bancario</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReplenishPaymentMethod("TRANSFERENCIA_ACH")}
                      className={`py-2 px-3 rounded-xl font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        replenishPaymentMethod === "TRANSFERENCIA_ACH"
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>⚡ Transferencia ACH</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        {replenishPaymentMethod === "CHEQUE" ? "No. de Cheque" : "Referencia ACH / Tracking"}
                      </label>
                      <input
                        type="text"
                        value={replenishReference}
                        onChange={(e) => setReplenishReference(e.target.value)}
                        placeholder="Ej. CHQ-1048"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Páguese a la Orden de:</label>
                      <input
                        type="text"
                        value={replenishPayee || currentFund?.custodianName || ""}
                        onChange={(e) => setReplenishPayee(e.target.value)}
                        placeholder="Nombre del Custodio o Portador"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                      />
                    </div>
                  </div>

                  {/* Amount in Spanish Words Preview */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                      Importe en Letras (Para Cheque Voucher Oficial):
                    </span>
                    <p className="text-xs font-bold font-serif text-amber-950 italic">
                      "{numberToSpanishWords(unreimbursedTotal, currentFund?.currency)}"
                    </p>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Concepto / Notas de la Póliza</label>
                    <input
                      type="text"
                      value={replenishNotes}
                      onChange={(e) => setReplenishNotes(e.target.value)}
                      placeholder={`Reposición de ${unreimbursedExpenses.length} facturas de gastos menores`}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (6 cols): Live Journal Entry & Execution */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    2. Partida de Diario Contable (Asiento Sugerido)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Cuadre 100% OK
                  </span>
                </div>

                {/* Journal Entry Lines Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Cuenta</th>
                        <th className="py-2.5 px-3">Descripción</th>
                        <th className="py-2.5 px-3 text-right">Debe (Cargos)</th>
                        <th className="py-2.5 px-3 text-right">Haber (Abonos)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {previewJournalEntry.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">
                            No hay comprobantes pendientes para generar el asiento.
                          </td>
                        </tr>
                      ) : (
                        previewJournalEntry.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{line.code}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">{line.name}</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                              {line.debit > 0 ? formatAmount(line.debit) : "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                              {line.credit > 0 ? formatAmount(line.credit) : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-300 text-xs">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-slate-900 uppercase">
                          Sumas Iguales
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                          {formatAmount(unreimbursedTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                          {formatAmount(unreimbursedTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Action CTA Button */}
                <div className="pt-3 space-y-2">
                  <button
                    disabled={submittingReimbursement || unreimbursedExpenses.length === 0}
                    onClick={handleExecuteReplenish}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submittingReimbursement ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Generar Póliza y Desembolsar desde Banco ({formatAmount(unreimbursedTotal)})
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    Afecta de inmediato el saldo de {activeBank?.name || "Bancos"} y restaura el fondo de Caja Chica.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Table: Invoices to reimburse */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Relación de Comprobantes Anexos a la Póliza ({unreimbursedExpenses.length})
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Total Acumulado: <b className="font-mono text-slate-900">{formatAmount(unreimbursedTotal)}</b>
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Concepto</th>
                    <th className="py-2.5 px-3">Proveedor / Beneficiario</th>
                    <th className="py-2.5 px-3">Factura #</th>
                    <th className="py-2.5 px-3">CAI SAR</th>
                    <th className="py-2.5 px-3 text-center">ISV 15%</th>
                    <th className="py-2.5 px-3 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {unreimbursedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Todos los comprobantes están al día. El fondo cuenta con el 100% de su saldo disponible.
                      </td>
                    </tr>
                  ) : (
                    unreimbursedExpenses.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString("es-HN")}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{t.category}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{t.concept}</td>
                        <td className="py-2 px-3">{t.beneficiary || "—"}</td>
                        <td className="py-2 px-3 font-mono">{t.invoiceNumber || t.voucherNumber || "—"}</td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500 max-w-xs truncate" title={t.cai}>
                          {t.cai || "Sin CAI"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {t.taxDeductible ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Sí
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatAmount(t.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: NUEVO GASTO ================= */}
      {showNewExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#f6821f]/10 text-[#f6821f] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </span>
                Registrar Movimiento de Caja Chica
              </h3>
              <button
                type="button"
                onClick={() => setShowNewExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4 text-xs">
              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseForm({ ...expenseForm, type: "EXPENSE" })}
                  className={`py-2 px-3 rounded-xl font-bold border transition ${
                    expenseForm.type === "EXPENSE"
                      ? "bg-rose-50 border-rose-300 text-rose-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  Egreso / Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseForm({ ...expenseForm, type: "REIMBURSEMENT" })}
                  className={`py-2 px-3 rounded-xl font-bold border transition ${
                    expenseForm.type === "REIMBURSEMENT"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  Ingreso / Reembolso
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Monto ({currentFund?.currency}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-base font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Categoría</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concept */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Concepto / Detalle del Gasto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra de cinta de embalar industrial para empaque"
                  value={expenseForm.concept}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                />
              </div>

              {/* Beneficiary */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Proveedor / Beneficiario</label>
                <input
                  type="text"
                  placeholder="Ej. Comercial Sula / Transporte Rápido"
                  value={expenseForm.beneficiary}
                  onChange={(e) => setExpenseForm({ ...expenseForm, beneficiary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                />
              </div>

              {/* Invoice & CAI */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No. Factura / Recibo</label>
                  <input
                    type="text"
                    placeholder="000-001-01-00123456"
                    value={expenseForm.invoiceNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No. Vale Interno</label>
                  <input
                    type="text"
                    placeholder="VAL-001"
                    value={expenseForm.voucherNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, voucherNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Código CAI (Factura SAR)</label>
                <input
                  type="text"
                  placeholder="A1B2C3-D4E5F6-..."
                  value={expenseForm.cai}
                  onChange={(e) => setExpenseForm({ ...expenseForm, cai: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                />
              </div>

              {/* Tax Deductible Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="taxDeductible"
                  checked={expenseForm.taxDeductible}
                  onChange={(e) => setExpenseForm({ ...expenseForm, taxDeductible: e.target.checked })}
                  className="rounded text-[#f6821f] focus:ring-[#f6821f] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="taxDeductible" className="text-slate-700 font-semibold cursor-pointer">
                  Comprobante con validez fiscal (Deducible de ISV)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewExpenseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="px-5 py-2 bg-[#f6821f] hover:bg-[#e07318] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  {submittingExpense ? "Guardando..." : "Guardar Movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NUEVO VALE PROVISIONAL ================= */}
      {showNewVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <h3 className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </span>
                Emitir Vale Provisional de Caja Chica
              </h3>
              <button
                type="button"
                onClick={() => setShowNewVoucherModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleVoucherSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Colaborador / Beneficiario <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Carlos Ramos"
                  value={voucherForm.beneficiary}
                  onChange={(e) => setVoucherForm({ ...voucherForm, beneficiary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Departamento</label>
                  <input
                    type="text"
                    placeholder="Producción / Calidad"
                    value={voucherForm.department}
                    onChange={(e) => setVoucherForm({ ...voucherForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Monto a Entregar ({currentFund?.currency}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={voucherForm.amount}
                    onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Concepto / Destino del Efectivo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra urgente de tornillos y brocas para planta"
                  value={voucherForm.concept}
                  onChange={(e) => setVoucherForm({ ...voucherForm, concept: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha Límite de Liquidación</label>
                <input
                  type="date"
                  value={voucherForm.expectedLiquidationDate}
                  onChange={(e) => setVoucherForm({ ...voucherForm, expectedLiquidationDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewVoucherModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingVoucher}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  {submittingVoucher ? "Emitiendo..." : "Emitir Vale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LIQUIDAR VALE PROVISIONAL ================= */}
      {liquidatingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-200 text-emerald-900 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Liquidar Vale {liquidatingVoucher.voucherNumber}
              </h3>
              <button
                type="button"
                onClick={() => setLiquidatingVoucher(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleLiquidateSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Colaborador:</span>
                  <span className="font-bold text-slate-800">{liquidatingVoucher.beneficiary}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Concepto:</span>
                  <span className="text-slate-700">{liquidatingVoucher.concept}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto Entregado:</span>
                  <span className="font-mono font-bold text-slate-900">{formatAmount(liquidatingVoucher.amount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Gasto Real Facturado <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={liquidateForm.actualExpense}
                    onChange={(e) => {
                      const actual = parseFloat(e.target.value) || 0;
                      const returned = Math.max(0, liquidatingVoucher.amount - actual);
                      setLiquidateForm({
                        ...liquidateForm,
                        actualExpense: e.target.value,
                        returnedCash: returned.toFixed(2),
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Efectivo Devuelto a Caja</label>
                  <input
                    type="number"
                    step="0.01"
                    value={liquidateForm.returnedCash}
                    onChange={(e) => setLiquidateForm({ ...liquidateForm, returnedCash: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">No. Factura / Comprobante de Respaldo</label>
                <input
                  type="text"
                  placeholder="000-001-01-00045678"
                  value={liquidateForm.receiptNumber}
                  onChange={(e) => setLiquidateForm({ ...liquidateForm, receiptNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notas de Liquidación</label>
                <input
                  type="text"
                  placeholder="Se reintegró el cambio en monedas a la caja..."
                  value={liquidateForm.notes}
                  onChange={(e) => setLiquidateForm({ ...liquidateForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLiquidatingVoucher(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingLiquidation}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  {submittingLiquidation ? "Procesando..." : "Confirmar Liquidación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREAR NUEVO FONDO ================= */}
      {showNewFundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#f6821f]/10 text-[#f6821f] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                Crear Nuevo Fondo de Caja Chica
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFundModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateFundSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Código de Fondo</label>
                  <input
                    type="text"
                    placeholder="CC-002"
                    value={fundForm.code}
                    onChange={(e) => setFundForm({ ...fundForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Moneda</label>
                  <select
                    value={fundForm.currency}
                    onChange={(e) => setFundForm({ ...fundForm, currency: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  >
                    <option value="HNL">Lempiras (HNL)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nombre Descriptivo del Fondo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Caja Chica Planta - Manufactura Búfalo"
                  value={fundForm.name}
                  onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Custodio Asignado <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Lic. Ruben Mondragón"
                    value={fundForm.custodianName}
                    onChange={(e) => setFundForm({ ...fundForm, custodianName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cargo del Custodio</label>
                  <input
                    type="text"
                    placeholder="Asistente Contable"
                    value={fundForm.custodianTitle}
                    onChange={(e) => setFundForm({ ...fundForm, custodianTitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Fondo Fijo Autorizado <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="10000.00"
                    value={fundForm.fixedAmount}
                    onChange={(e) => setFundForm({ ...fundForm, fixedAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Umbral de Alerta de Reposición</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2500.00"
                    value={fundForm.minThreshold}
                    onChange={(e) => setFundForm({ ...fundForm, minThreshold: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ubicación / Planta</label>
                <input
                  type="text"
                  placeholder="Planta Búfalo, Villanueva, Cortés"
                  value={fundForm.location}
                  onChange={(e) => setFundForm({ ...fundForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f6821f]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFundModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingFund}
                  className="px-5 py-2 bg-[#f6821f] hover:bg-[#e07318] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  {submittingFund ? "Creando..." : "Crear Fondo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VISTA PREVIA / IMPRESIÓN DE ACTA ================= */}
      {selectedAuditForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
            {/* Header with Print button */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-100 text-[#f6821f] flex items-center justify-center font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Acta Oficial de Arqueo — {selectedAuditForPrint.auditNumber}
                  </h3>
                  <span className="text-[11px] text-slate-500">Wayne Trademark de Honduras S. de R.L.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir Documento
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAuditForPrint(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 transition rounded-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Preview */}
            <div className="p-8 overflow-y-auto bg-slate-100 flex-1">
              <div className="bg-white p-8 rounded-xl shadow border border-slate-300 max-w-3xl mx-auto text-slate-800 space-y-6">
                {/* Letterhead */}
                <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                      Wayne Trademark de Honduras S. de R.L.
                    </h2>
                    <p className="text-[11px] text-slate-600">RTN: 05019001123456 | PBX: +504 2565-8900</p>
                    <p className="text-[11px] text-slate-600">
                      Planta de Manufactura: Carretera a Búfalo, Villanueva, Cortés, Honduras
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      ACTA DE ARQUEO FÍSICO
                    </span>
                    <span className="text-base font-mono font-black text-[#f6821f]">
                      {selectedAuditForPrint.auditNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {new Date(selectedAuditForPrint.createdAt).toLocaleDateString("es-HN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Fund Meta */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Fondo de Caja Chica:</span>
                    <span className="font-bold text-slate-900">
                      {selectedAuditForPrint.fund?.name || currentFund?.name} ({selectedAuditForPrint.fund?.code || currentFund?.code})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fondo Fijo Autorizado:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatAmount(selectedAuditForPrint.fund?.fixedAmount || fixedAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Custodio Responsable:</span>
                    <span className="font-semibold text-slate-800">{selectedAuditForPrint.custodianName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Auditor Designado:</span>
                    <span className="font-semibold text-slate-800">{selectedAuditForPrint.auditorName}</span>
                  </div>
                </div>

                {/* Values Summary Table */}
                <table className="w-full text-xs border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 text-left">Concepto de Comprobación</th>
                      <th className="p-2 text-right">Importe Auditado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr>
                      <td className="p-2 text-slate-700">1. Total Efectivo Físico en Billetes y Monedas</td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatAmount(selectedAuditForPrint.physicalCashTotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-700">2. Total Comprobantes y Facturas por Rendir</td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatAmount(selectedAuditForPrint.pendingReceiptsTotal || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-700">3. Total Vales Provisionales Activos</td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatAmount(selectedAuditForPrint.activeVouchersTotal || 0)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2 text-slate-900 uppercase">(=) TOTAL GENERAL ARQUEADO</td>
                      <td className="p-2 text-right font-mono text-sm text-slate-900">
                        {formatAmount(
                          (selectedAuditForPrint.physicalCashTotal || 0) +
                            (selectedAuditForPrint.pendingReceiptsTotal || 0) +
                            (selectedAuditForPrint.activeVouchersTotal || 0)
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-600">(-) Fondo Fijo Autorizado por Gerencia</td>
                      <td className="p-2 text-right font-mono font-semibold">
                        {formatAmount(selectedAuditForPrint.fund?.fixedAmount || fixedAmount)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-bold text-sm">
                      <td className="p-2">
                        RESULTADO / DIFERENCIA: <span className="uppercase">{selectedAuditForPrint.status}</span>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatAmount(selectedAuditForPrint.difference)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Observations */}
                {selectedAuditForPrint.observations && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold block mb-1">Observaciones de Auditoría:</span>
                    <p className="text-slate-700">{selectedAuditForPrint.observations}</p>
                  </div>
                )}

                {/* Formal Declarations & Signatures */}
                <div className="pt-8 space-y-12">
                  <p className="text-[11px] text-slate-500 italic text-justify leading-relaxed">
                    Certificamos que el presente arqueo físico se realizó en nuestra presencia, habiéndose recontado
                    fielmente todo el efectivo y comprobantes que integran el fondo a la fecha indicada. El custodio
                    manifiesta haber recibido a entera satisfacción el dinero y documentos devueltos tras el conteo.
                  </p>

                  <div className="grid grid-cols-2 gap-12 text-center text-xs">
                    <div className="border-t border-slate-400 pt-2">
                      <span className="font-bold text-slate-900 block">{selectedAuditForPrint.custodianName}</span>
                      <span className="text-slate-500 text-[11px] block">Custodio Responsable</span>
                      <span className="text-slate-400 text-[10px]">Wayne Trademark de Honduras S. de R.L.</span>
                    </div>

                    <div className="border-t border-slate-400 pt-2">
                      <span className="font-bold text-slate-900 block">{selectedAuditForPrint.auditorName}</span>
                      <span className="text-slate-500 text-[11px] block">Auditor / Revisor Designado</span>
                      <span className="text-slate-400 text-[10px]">Departamento de Contabilidad & Auditoría</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINT CONTAINER (Hidden in screen, visible in @media print) ================= */}
      {selectedAuditForPrint && (
        <div id="printable-cash-audit-document" className="hidden">
          <div className="p-8 max-w-3xl mx-auto space-y-6 text-black bg-white">
            <div className="border-b-2 border-black pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-lg font-black uppercase">WAYNE TRADEMARK DE HONDURAS S. DE R.L.</h1>
                <p className="text-xs">RTN: 05019001123456 | Tel: +504 2565-8900</p>
                <p className="text-xs">Planta Búfalo, Villanueva, Cortés, Honduras</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-widest block">ACTA OFICIAL DE ARQUEO</span>
                <span className="text-lg font-mono font-bold">{selectedAuditForPrint.auditNumber}</span>
                <span className="text-xs block">{new Date(selectedAuditForPrint.createdAt).toLocaleString("es-HN")}</span>
              </div>
            </div>

            <table className="w-full text-xs border border-black mb-4">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-2 font-bold bg-slate-100 w-1/4">Fondo:</td>
                  <td className="p-2">{selectedAuditForPrint.fund?.name || currentFund?.name} ({selectedAuditForPrint.fund?.code || currentFund?.code})</td>
                  <td className="p-2 font-bold bg-slate-100 w-1/4">Fondo Fijo:</td>
                  <td className="p-2 font-mono font-bold">{formatAmount(selectedAuditForPrint.fund?.fixedAmount || fixedAmount)}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-slate-100">Custodio:</td>
                  <td className="p-2">{selectedAuditForPrint.custodianName}</td>
                  <td className="p-2 font-bold bg-slate-100">Auditor:</td>
                  <td className="p-2">{selectedAuditForPrint.auditorName}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xs font-bold uppercase tracking-wider mb-1">Liquidación del Fondo</h3>
            <table className="w-full text-xs border border-black mb-4">
              <thead className="bg-slate-200 border-b border-black font-bold">
                <tr>
                  <th className="p-2 text-left">Concepto</th>
                  <th className="p-2 text-right">Monto Auditado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-2">1. Efectivo Físico Contado (Billetes y Monedas)</td>
                  <td className="p-2 text-right font-mono font-bold">{formatAmount(selectedAuditForPrint.physicalCashTotal)}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2">2. Comprobantes y Facturas en Tránsito por Rendir</td>
                  <td className="p-2 text-right font-mono font-bold">{formatAmount(selectedAuditForPrint.pendingReceiptsTotal || 0)}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2">3. Vales Provisionales Activos</td>
                  <td className="p-2 text-right font-mono font-bold">{formatAmount(selectedAuditForPrint.activeVouchersTotal || 0)}</td>
                </tr>
                <tr className="border-b-2 border-black font-bold bg-slate-100">
                  <td className="p-2 uppercase">TOTAL GENERAL ARQUEADO</td>
                  <td className="p-2 text-right font-mono">
                    {formatAmount(
                      (selectedAuditForPrint.physicalCashTotal || 0) +
                        (selectedAuditForPrint.pendingReceiptsTotal || 0) +
                        (selectedAuditForPrint.activeVouchersTotal || 0)
                    )}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2">(-) Fondo Fijo Autorizado</td>
                  <td className="p-2 text-right font-mono">{formatAmount(selectedAuditForPrint.fund?.fixedAmount || fixedAmount)}</td>
                </tr>
                <tr className="font-bold text-sm bg-slate-200">
                  <td className="p-2">DIFERENCIA / RESULTADO ({selectedAuditForPrint.status})</td>
                  <td className="p-2 text-right font-mono">{formatAmount(selectedAuditForPrint.difference)}</td>
                </tr>
              </tbody>
            </table>

            {selectedAuditForPrint.observations && (
              <div className="border border-black p-3 text-xs mb-6">
                <span className="font-bold block mb-1">Observaciones:</span>
                <p>{selectedAuditForPrint.observations}</p>
              </div>
            )}

            <div className="pt-16 grid grid-cols-2 gap-16 text-center text-xs">
              <div className="border-t border-black pt-2">
                <span className="font-bold block">{selectedAuditForPrint.custodianName}</span>
                <span className="text-slate-600 block">Custodio Responsable</span>
                <span>Wayne Trademark de Honduras</span>
              </div>
              <div className="border-t border-black pt-2">
                <span className="font-bold block">{selectedAuditForPrint.auditorName}</span>
                <span className="text-slate-600 block">Auditor / Revisor</span>
                <span>Departamento de Auditoría Interna</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PÓLIZA DE CHEQUE / VOUCHER DE DESEMBOLSO ================= */}
      {selectedPolicyForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden animate-scaleIn flex flex-col max-h-[92vh]">
            {/* Modal Top Actions */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Póliza de Cheque / Desembolso Bancario Generada
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedPolicyForPrint.policyNumber} — {selectedPolicyForPrint.referenceNumber}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#f6821f] hover:bg-[#e07318] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Imprimir Póliza Oficial
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPolicyForPrint(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body / Scrollable Printable Preview */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-xs text-slate-800 bg-white">
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    WAYNE TRADEMARK DE HONDURAS S. DE R.L.
                  </h2>
                  <p className="text-slate-500 text-xs">RTN: 05019001123456 | Planta Búfalo, Villanueva, Cortés</p>
                  <p className="text-slate-500 text-xs">Departamento de Tesorería & Contabilidad General</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
                    PÓLIZA DE REPOSICIÓN
                  </span>
                  <div className="text-base font-mono font-black text-slate-900 mt-1">
                    {selectedPolicyForPrint.policyNumber}
                  </div>
                  <span className="text-slate-500 text-[11px] block">{selectedPolicyForPrint.formattedDate}</span>
                </div>
              </div>

              {/* Check Header Box */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Banco Emisor & Cuenta
                    </span>
                    <span className="font-bold text-slate-900 text-xs block">
                      {selectedPolicyForPrint.bankAccount?.name}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      Cuenta: {selectedPolicyForPrint.bankAccount?.accountNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Método & Referencia
                    </span>
                    <span className="font-bold text-slate-900 text-xs block">
                      {selectedPolicyForPrint.paymentMethod === "CHEQUE" ? "Cheque No." : "Transferencia ACH Ref."}
                    </span>
                    <span className="font-mono font-bold text-[#f6821f] text-xs">
                      {selectedPolicyForPrint.referenceNumber}
                    </span>
                  </div>

                  <div className="md:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Importe del Desembolso
                    </span>
                    <span className="text-lg font-black font-mono text-slate-900">
                      {selectedPolicyForPrint.bankAccount?.currency}{" "}
                      {Number(selectedPolicyForPrint.totalAmount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Páguese a la Orden de:
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {selectedPolicyForPrint.checkPayee}
                    </span>
                  </div>
                  <div className="md:col-span-1 md:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Fondo Destino
                    </span>
                    <span className="font-medium text-slate-700 text-xs">
                      {selectedPolicyForPrint.fund?.name}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    La Suma de (en Letras):
                  </span>
                  <p className="font-serif font-bold text-amber-950 italic text-xs">
                    "{selectedPolicyForPrint.amountInWords}"
                  </p>
                </div>
              </div>

              {/* Accounting Journal Entry (Partida Contable) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                    Partida de Diario Contable
                  </h4>
                  <span className="text-[11px] text-slate-500">Plan de Cuentas Wayne</span>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                      <tr>
                        <th className="p-2.5 w-24">Código</th>
                        <th className="p-2.5">Descripción de la Cuenta</th>
                        <th className="p-2.5 text-right w-32">Debe</th>
                        <th className="p-2.5 text-right w-32">Haber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(selectedPolicyForPrint.journalEntry || []).map((line: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-900">{line.accountCode}</td>
                          <td className="p-2 font-medium text-slate-800">{line.accountName}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {line.debit > 0
                              ? Number(line.debit).toLocaleString("en-US", { minimumFractionDigits: 2 })
                              : "—"}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {line.credit > 0
                              ? Number(line.credit).toLocaleString("en-US", { minimumFractionDigits: 2 })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs">
                      <tr>
                        <td colSpan={2} className="p-2.5 uppercase text-slate-900">
                          Sumas Iguales
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-800">
                          {Number(selectedPolicyForPrint.totalAmount || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-800">
                          {Number(selectedPolicyForPrint.totalAmount || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Reimbursed Invoices Annex */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                  Comprobantes y Facturas Respaldadas ({selectedPolicyForPrint.reimbursedTransactions?.length || 0})
                </h4>

                <div className="border border-slate-300 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px] sticky top-0">
                      <tr>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Proveedor</th>
                        <th className="p-2">Factura #</th>
                        <th className="p-2">CAI SAR</th>
                        <th className="p-2 text-center">ISV</th>
                        <th className="p-2 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(selectedPolicyForPrint.reimbursedTransactions || []).map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-2 whitespace-nowrap text-slate-500">
                            {new Date(t.createdAt || t.date).toLocaleDateString("es-HN")}
                          </td>
                          <td className="p-2 font-medium text-slate-900">{t.beneficiary || t.concept}</td>
                          <td className="p-2 font-mono">{t.invoiceNumber || t.voucherNumber || "—"}</td>
                          <td className="p-2 font-mono text-[10px] text-slate-500 max-w-xs truncate">{t.cai || "Sin CAI"}</td>
                          <td className="p-2 text-center">
                            {t.taxDeductible ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700">
                                15%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {Number(t.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4 Corporate Signatures */}
              <div className="pt-6 border-t border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2">
                    <span className="font-bold text-slate-900 block">{selectedPolicyForPrint.fund?.custodianName}</span>
                    <span className="text-[11px] text-slate-500 block">Hecho por (Custodio)</span>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <span className="font-bold text-slate-900 block">Lic. Contabilidad</span>
                    <span className="text-[11px] text-slate-500 block">Revisado por</span>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <span className="font-bold text-slate-900 block">Gerencia Financiera</span>
                    <span className="text-[11px] text-slate-500 block">Aprobado por</span>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <span className="font-bold text-slate-900 block">{selectedPolicyForPrint.checkPayee}</span>
                    <span className="text-[11px] text-slate-500 block">Recibí Conforme</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINT CONTAINER: PÓLIZA DE CHEQUE OFICIAL ================= */}
      {selectedPolicyForPrint && (
        <div id="printable-check-voucher" className="hidden">
          <div className="p-6 max-w-3xl mx-auto space-y-5 text-black bg-white">
            {/* Header */}
            <div className="border-b-2 border-black pb-3 flex justify-between items-start">
              <div>
                <h1 className="text-base font-black uppercase">WAYNE TRADEMARK DE HONDURAS S. DE R.L.</h1>
                <p className="text-[11px]">RTN: 05019001123456 | Planta Búfalo, Villanueva, Cortés</p>
                <p className="text-[11px]">Departamento de Tesorería & Contabilidad General</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest block">
                  PÓLIZA DE CHEQUE & VOUCHER
                </span>
                <span className="text-base font-mono font-black">{selectedPolicyForPrint.policyNumber}</span>
                <span className="text-xs block">{selectedPolicyForPrint.formattedDate}</span>
              </div>
            </div>

            {/* Check Voucher Meta Table */}
            <table className="w-full text-xs border border-black mb-3">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-2 font-bold bg-slate-100 w-1/4">Banco Emisor:</td>
                  <td className="p-2 w-1/4">{selectedPolicyForPrint.bankAccount?.name}</td>
                  <td className="p-2 font-bold bg-slate-100 w-1/4">Cuenta Bancaria:</td>
                  <td className="p-2 font-mono w-1/4">{selectedPolicyForPrint.bankAccount?.accountNumber}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 font-bold bg-slate-100">Método / Referencia:</td>
                  <td className="p-2 font-mono font-bold">
                    {selectedPolicyForPrint.paymentMethod} #{selectedPolicyForPrint.referenceNumber}
                  </td>
                  <td className="p-2 font-bold bg-slate-100">Fondo Repuesto:</td>
                  <td className="p-2">{selectedPolicyForPrint.fund?.name} ({selectedPolicyForPrint.fund?.code})</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-2 font-bold bg-slate-100">Páguese a:</td>
                  <td className="p-2 font-bold" colSpan={3}>
                    {selectedPolicyForPrint.checkPayee}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-slate-100">Importe en Letras:</td>
                  <td className="p-2 italic font-serif" colSpan={2}>
                    "{selectedPolicyForPrint.amountInWords}"
                  </td>
                  <td className="p-2 text-right font-mono font-black text-sm bg-slate-100">
                    {selectedPolicyForPrint.bankAccount?.currency}{" "}
                    {Number(selectedPolicyForPrint.totalAmount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Accounting Entry Table */}
            <h3 className="text-xs font-bold uppercase tracking-wider mb-1">Partida de Diario Contable</h3>
            <table className="w-full text-xs border border-black mb-3">
              <thead className="bg-slate-200 border-b border-black font-bold">
                <tr>
                  <th className="p-1.5 text-left w-20">Código</th>
                  <th className="p-1.5 text-left">Cuenta Contable</th>
                  <th className="p-1.5 text-right w-24">Debe</th>
                  <th className="p-1.5 text-right w-24">Haber</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPolicyForPrint.journalEntry || []).map((line: any, idx: number) => (
                  <tr key={idx} className="border-b border-black">
                    <td className="p-1.5 font-mono font-bold">{line.accountCode}</td>
                    <td className="p-1.5">{line.accountName}</td>
                    <td className="p-1.5 text-right font-mono">
                      {line.debit > 0
                        ? Number(line.debit).toLocaleString("en-US", { minimumFractionDigits: 2 })
                        : "—"}
                    </td>
                    <td className="p-1.5 text-right font-mono">
                      {line.credit > 0
                        ? Number(line.credit).toLocaleString("en-US", { minimumFractionDigits: 2 })
                        : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="border-b-2 border-black font-black bg-slate-100">
                  <td colSpan={2} className="p-1.5 uppercase">
                    Sumas Iguales
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    {Number(selectedPolicyForPrint.totalAmount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    {Number(selectedPolicyForPrint.totalAmount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Annex Table */}
            <h3 className="text-xs font-bold uppercase tracking-wider mb-1">
              Comprobantes Respaldados ({selectedPolicyForPrint.reimbursedTransactions?.length || 0})
            </h3>
            <table className="w-full text-[10px] border border-black mb-4">
              <thead className="bg-slate-100 border-b border-black font-bold">
                <tr>
                  <th className="p-1 text-left">Fecha</th>
                  <th className="p-1 text-left">Proveedor</th>
                  <th className="p-1 text-left">Factura</th>
                  <th className="p-1 text-left">CAI</th>
                  <th className="p-1 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPolicyForPrint.reimbursedTransactions || []).map((t: any) => (
                  <tr key={t.id} className="border-b border-black">
                    <td className="p-1 whitespace-nowrap">{new Date(t.createdAt || t.date).toLocaleDateString("es-HN")}</td>
                    <td className="p-1">{t.beneficiary || t.concept}</td>
                    <td className="p-1 font-mono">{t.invoiceNumber || t.voucherNumber || "—"}</td>
                    <td className="p-1 font-mono">{t.cai || "Sin CAI"}</td>
                    <td className="p-1 text-right font-mono">
                      {Number(t.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 4 Signatures */}
            <div className="pt-10 grid grid-cols-4 gap-6 text-center text-[11px]">
              <div className="border-t border-black pt-1.5">
                <span className="font-bold block">{selectedPolicyForPrint.fund?.custodianName}</span>
                <span className="text-slate-600 block text-[10px]">Hecho por (Custodio)</span>
              </div>
              <div className="border-t border-black pt-1.5">
                <span className="font-bold block">Contabilidad</span>
                <span className="text-slate-600 block text-[10px]">Revisado por</span>
              </div>
              <div className="border-t border-black pt-1.5">
                <span className="font-bold block">Gerencia General</span>
                <span className="text-slate-600 block text-[10px]">Aprobado por</span>
              </div>
              <div className="border-t border-black pt-1.5">
                <span className="font-bold block">{selectedPolicyForPrint.checkPayee}</span>
                <span className="text-slate-600 block text-[10px]">Recibí Conforme</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
