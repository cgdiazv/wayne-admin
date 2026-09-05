"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  X,
  Plus,
  Building2,
  CreditCard,
  FileText,
  DollarSign,
  Ban,
  Filter,
  Check,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";

export interface VendorPaymentLineItem {
  id: string;
  invoiceNumber: string;
  originalAmount: number;
  balanceBefore: number;
  amountPaid: number;
  balanceRemaining: number;
  purchaseInvoice?: {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    total: number;
  };
}

export interface VendorPaymentRecord {
  id: string;
  paymentNumber: string;
  vendorId?: string | null;
  vendorName: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  bankAccountId?: string | null;
  paidAccount: string;
  currency: string;
  amount: number;
  notes?: string | null;
  status: "APLICADO" | "ANULADO";
  journalEntryId?: string | null;
  createdAt: string;
  lines: VendorPaymentLineItem[];
  bankAccount?: {
    id: string;
    name: string;
    accountNumber: string;
    bookBalance: number;
    currency: string;
  } | null;
  vendor?: {
    id: string;
    name: string;
    macolaCode?: string | null;
  } | null;
}

interface PendingInvoiceItem {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  tax: number;
  paymentStatus: string;
  taxRetentions?: Array<{ retentionAmount: number; status: string }>;
  paymentLines?: Array<{ amountPaid: number; vendorPayment?: { status: string } }>;
  balanceDue: number;
  isSelected: boolean;
  amountToPay: number;
}

interface VendorPaymentsModuleProps {
  onBack: () => void;
  formatCurrency: (val: number, cur?: string) => string;
  companySettings?: any;
  initialVendorFilter?: string;
}

export default function VendorPaymentsModule({
  onBack,
  formatCurrency,
  companySettings,
  initialVendorFilter,
}: VendorPaymentsModuleProps) {
  // Lists & data state
  const [payments, setPayments] = useState<VendorPaymentRecord[]>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; macolaCode?: string }>>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; name: string; accountNumber: string; bookBalance: number; currency: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>(initialVendorFilter || "ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // New Payment Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedVendorName, setSelectedVendorName] = useState("");
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoiceItem[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Transferencia Bancaria");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [paymentNotes, setPaymentNotes] = useState("");

  // View / Print Voucher Modal state
  const [activeVoucher, setActiveVoucher] = useState<VendorPaymentRecord | null>(null);

  // Void confirmation modal
  const [paymentToVoid, setPaymentToVoid] = useState<VendorPaymentRecord | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  // Load Payments, Vendors and Bank Accounts
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [paymentsRes, vendorsRes, banksRes] = await Promise.all([
        fetch("/api/vendor-payments"),
        fetch("/api/vendors"),
        fetch("/api/bank-accounts"),
      ]);

      const [paymentsData, vendorsData, banksData] = await Promise.all([
        paymentsRes.json(),
        vendorsRes.json(),
        banksRes.json(),
      ]);

      if (paymentsData.success) {
        setPayments(paymentsData.data || []);
      } else {
        setError(paymentsData.error || "Error al cargar pagos");
      }

      if (vendorsData.success) {
        setVendors(vendorsData.data || []);
      }

      if (banksData.success) {
        setBankAccounts(banksData.data || []);
      }
    } catch (err: any) {
      console.error("Error loading vendor payments data:", err);
      setError("Error de conexión al cargar datos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Set initial filter if passed
  useEffect(() => {
    if (initialVendorFilter) {
      setSelectedVendorFilter(initialVendorFilter);
    }
  }, [initialVendorFilter]);

  // Load pending invoices for selected vendor in Create Modal
  const loadVendorPendingInvoices = async (vName: string) => {
    if (!vName) {
      setPendingInvoices([]);
      return;
    }
    setLoadingInvoices(true);
    try {
      const res = await fetch("/api/purchase-invoices");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Filter invoices for this vendor that are not fully paid
        const vendorInvs = data.data.filter((inv: any) => {
          const matchName = inv.vendorName.toLowerCase().trim() === vName.toLowerCase().trim();
          const notPaid = !["Pagada", "PAGADA", "Cancelada", "CANCELADA"].includes(inv.paymentStatus);
          return matchName && notPaid;
        });

        // Compute net balance per invoice
        const mapped: PendingInvoiceItem[] = vendorInvs.map((inv: any) => {
          const retAmount = (inv.taxRetentions || [])
            .filter((r: any) => r.status === "ISSUED")
            .reduce((sum: number, r: any) => sum + (Number(r.retentionAmount) || 0), 0);

          const paidAmount = (inv.paymentLines || [])
            .filter((pl: any) => pl.vendorPayment?.status === "APLICADO" || !pl.vendorPayment)
            .reduce((sum: number, pl: any) => sum + (Number(pl.amountPaid) || 0), 0);

          const balance = Math.max(0, Math.round((Number(inv.total) - retAmount - paidAmount) * 100) / 100);

          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            currency: inv.currency || "USD",
            total: Number(inv.total) || 0,
            tax: Number(inv.tax) || 0,
            paymentStatus: inv.paymentStatus,
            balanceDue: balance,
            isSelected: false,
            amountToPay: balance,
          };
        }).filter((item: PendingInvoiceItem) => item.balanceDue > 0);

        setPendingInvoices(mapped);
      }
    } catch (err) {
      console.error("Error loading pending invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = (prefilledVendorName?: string) => {
    setCreateError("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Transferencia Bancaria");
    setReferenceNumber("");
    setPaymentNotes("");
    setPaymentCurrency("USD");
    
    // Pick first bank account by default
    if (bankAccounts.length > 0) {
      setSelectedBankAccountId(bankAccounts[0].id);
    } else {
      setSelectedBankAccountId("");
    }

    if (prefilledVendorName) {
      const v = vendors.find((vend) => vend.name.toLowerCase() === prefilledVendorName.toLowerCase());
      setSelectedVendorId(v?.id || "");
      setSelectedVendorName(prefilledVendorName);
      loadVendorPendingInvoices(prefilledVendorName);
    } else {
      setSelectedVendorId("");
      setSelectedVendorName("");
      setPendingInvoices([]);
    }

    setShowCreateModal(true);
  };

  // Toggle select invoice
  const toggleSelectInvoice = (id: string) => {
    setPendingInvoices((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextSelected = !item.isSelected;
          return {
            ...item,
            isSelected: nextSelected,
            amountToPay: nextSelected ? item.balanceDue : 0,
          };
        }
        return item;
      })
    );
  };

  // Update amount to pay for an invoice
  const updateInvoiceAmount = (id: string, newAmount: number) => {
    setPendingInvoices((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const clamped = Math.max(0, Math.min(newAmount, item.balanceDue));
          return {
            ...item,
            amountToPay: clamped,
            isSelected: clamped > 0,
          };
        }
        return item;
      })
    );
  };

  // Total amount to be paid
  const totalAmountToPay = useMemo(() => {
    return pendingInvoices
      .filter((inv) => inv.isSelected)
      .reduce((sum, inv) => sum + (Number(inv.amountToPay) || 0), 0);
  }, [pendingInvoices]);

  // Save new Payment
  const handleSavePayment = async () => {
    setCreateError("");

    if (!selectedVendorName) {
      setCreateError("Selecciona un proveedor.");
      return;
    }

    const selectedLines = pendingInvoices.filter((inv) => inv.isSelected && inv.amountToPay > 0);
    if (selectedLines.length === 0) {
      setCreateError("Selecciona al menos una factura e ingresa un monto a pagar mayor a cero.");
      return;
    }

    if (totalAmountToPay <= 0) {
      setCreateError("El monto total a pagar debe ser mayor a 0.");
      return;
    }

    setCreating(true);

    try {
      const selectedBank = bankAccounts.find((b) => b.id === selectedBankAccountId);

      const payload = {
        vendorId: selectedVendorId || null,
        vendorName: selectedVendorName,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || null,
        bankAccountId: selectedBankAccountId || null,
        paidAccount: selectedBank ? `${selectedBank.name} (${selectedBank.accountNumber})` : "1100 - Bancos Nacionales",
        currency: paymentCurrency,
        amount: Math.round(totalAmountToPay * 100) / 100,
        notes: paymentNotes.trim() || null,
        lines: selectedLines.map((inv) => ({
          purchaseInvoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          originalAmount: inv.total,
          balanceBefore: inv.balanceDue,
          amountPaid: inv.amountToPay,
          balanceRemaining: Math.max(0, inv.balanceDue - inv.amountToPay),
        })),
      };

      const res = await fetch("/api/vendor-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setCreateError(data.error || "Ocurrió un error al registrar el pago.");
        return;
      }

      setSuccessToast(`¡Pago ${data.data.paymentNumber} registrado con éxito! Asiento contable generado.`);
      setTimeout(() => setSuccessToast(""), 5000);

      setShowCreateModal(false);
      await loadData();

      // Show voucher immediately
      setActiveVoucher(data.data);
    } catch (err: any) {
      console.error("Save payment error:", err);
      setCreateError(err.message || "Error al conectar con el servidor.");
    } finally {
      setCreating(false);
    }
  };

  // Void payment
  const handleConfirmVoid = async () => {
    if (!paymentToVoid) return;
    setVoiding(true);

    try {
      const res = await fetch(`/api/vendor-payments/${paymentToVoid.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ANULAR",
          reason: voidReason.trim() || "Anulación solicitada por el usuario",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo anular el pago.");
        return;
      }

      setSuccessToast(`Pago ${paymentToVoid.paymentNumber} anulado. Saldos bancarios y de facturas restablecidos.`);
      setTimeout(() => setSuccessToast(""), 5000);

      setPaymentToVoid(null);
      setVoidReason("");
      await loadData();
    } catch (err: any) {
      console.error("Void error:", err);
      alert("Error al anular el pago.");
    } finally {
      setVoiding(false);
    }
  };

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = p.paymentNumber.toLowerCase().includes(q);
        const matchVendor = p.vendorName.toLowerCase().includes(q);
        const matchRef = p.referenceNumber?.toLowerCase().includes(q);
        const matchLines = p.lines?.some((l) => l.invoiceNumber.toLowerCase().includes(q));
        if (!matchNumber && !matchVendor && !matchRef && !matchLines) return false;
      }

      // Vendor Filter
      if (selectedVendorFilter !== "ALL" && p.vendorName.toLowerCase() !== selectedVendorFilter.toLowerCase()) {
        return false;
      }

      // Status Filter
      if (selectedStatusFilter !== "ALL" && p.status !== selectedStatusFilter) {
        return false;
      }

      // Date Range
      if (dateFromFilter && p.paymentDate < dateFromFilter) return false;
      if (dateToFilter && p.paymentDate > dateToFilter) return false;

      return true;
    });
  }, [payments, searchQuery, selectedVendorFilter, selectedStatusFilter, dateFromFilter, dateToFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const active = payments.filter((p) => p.status === "APLICADO");
    const totalPaid = active.reduce((sum, p) => sum + p.amount, 0);
    const countActive = active.length;

    const transfers = active.filter((p) => p.paymentMethod.toLowerCase().includes("transfer"));
    const checks = active.filter((p) => p.paymentMethod.toLowerCase().includes("cheque"));
    const cash = active.filter((p) => p.paymentMethod.toLowerCase().includes("efectivo"));

    return {
      totalPaid,
      countActive,
      transfersTotal: transfers.reduce((sum, p) => sum + p.amount, 0),
      transfersCount: transfers.length,
      checksTotal: checks.reduce((sum, p) => sum + p.amount, 0),
      checksCount: checks.length,
      cashTotal: cash.reduce((sum, p) => sum + p.amount, 0),
      cashCount: cash.length,
    };
  }, [payments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-100" />
          <span className="text-xs font-semibold">{successToast}</span>
          <button onClick={() => setSuccessToast("")} className="text-white/80 hover:text-white ml-2">
            <X className="w-4 h-4" />
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
            <span>Regresar a Proveedores</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Cuentas por Pagar</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Pagos a Proveedores</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Pagos a Proveedores
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5]">
                Cuentas por Pagar (AP)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de desembolsos, abonos parciales, cancelaciones de facturas y comprobantes de egreso.
            </p>
          </div>

          {/* Global Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadData();
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
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar Pago / Abono</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Desembolsado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Desembolsado (Período)</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#f6821f] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalPaid, "USD")}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.countActive} pagos activos aplicados
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f6821f]" />
        </div>

        {/* Transferencias ACH */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Transferencias ACH</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.transfersTotal, "USD")}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.transfersCount} transacciones bancarias
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        {/* Cheques Emitidos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cheques Emitidos</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.checksTotal, "USD")}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.checksCount} cheques corporativos
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Efectivo / Caja */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Efectivo / Caja</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.cashTotal, "USD")}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.cashCount} egresos de caja registrados
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por N° pago, proveedor, cheque, factura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#f6821f] transition"
            />
          </div>

          {/* Vendor Filter */}
          <div>
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#f6821f] font-medium text-slate-700"
            >
              <option value="ALL">Todos los proveedores</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#f6821f] font-medium text-slate-700"
            >
              <option value="ALL">Todos los estados</option>
              <option value="APLICADO">Aplicados</option>
              <option value="ANULADO">Anulados</option>
            </select>
          </div>

          {/* Date Range quick select */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              title="Fecha inicial"
              className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#f6821f] text-slate-700"
            />
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              title="Fecha final"
              className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#f6821f] text-slate-700"
            />
          </div>
        </div>

        {(searchQuery || selectedVendorFilter !== "ALL" || selectedStatusFilter !== "ALL" || dateFromFilter || dateToFilter) && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">Filtros activos:</span>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedVendorFilter("ALL");
                setSelectedStatusFilter("ALL");
                setDateFromFilter("");
                setDateToFilter("");
              }}
              className="text-[11px] font-bold text-[#f6821f] hover:underline cursor-pointer"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* PAYMENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#f6821f] mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Cargando pagos a proveedores...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center space-y-3 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron pagos</h3>
            <p className="text-xs text-slate-500">
              No hay registros que coincidan con los filtros aplicados o aún no has emitido pagos a proveedores.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar primer pago</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">N° Comprobante</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Proveedor</th>
                  <th className="py-3.5 px-4">Método &amp; Ref.</th>
                  <th className="py-3.5 px-4">Cuenta de Pago</th>
                  <th className="py-3.5 px-4">Facturas Aplicadas</th>
                  <th className="py-3.5 px-4 text-right">Monto Pagado</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const isVoid = p.status === "ANULADO";
                  return (
                    <tr
                      key={p.id}
                      className={`transition ${isVoid ? "bg-rose-50/20 opacity-60" : "hover:bg-slate-50/80"}`}
                    >
                      {/* Correlativo */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="font-mono text-xs">{p.paymentNumber}</span>
                      </td>

                      {/* Fecha */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {p.paymentDate}
                      </td>

                      {/* Proveedor */}
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div>{p.vendorName}</div>
                        {p.vendor?.macolaCode && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Macola: {p.vendor.macolaCode}
                          </span>
                        )}
                      </td>

                      {/* Método y Ref */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{p.paymentMethod}</div>
                        {p.referenceNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ref: {p.referenceNumber}
                          </span>
                        )}
                      </td>

                      {/* Cuenta de egreso */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="max-w-[180px] truncate text-[11px]" title={p.paidAccount}>
                          {p.paidAccount}
                        </div>
                      </td>

                      {/* Facturas aplicadas */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {p.lines.map((l) => (
                            <span
                              key={l.id}
                              className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-700"
                              title={`Abonado: $${l.amountPaid.toFixed(2)} | Restante: $${l.balanceRemaining.toFixed(2)}`}
                            >
                              {l.invoiceNumber}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Monto pagado */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        <span className={isVoid ? "line-through text-slate-400" : "text-emerald-700"}>
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isVoid ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ANULADO
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            APLICADO
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveVoucher(p)}
                            title="Ver / Imprimir Comprobante de Egreso"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {!isVoid && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentToVoid(p);
                                setVoidReason("");
                              }}
                              title="Anular pago y revertir facturas"
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* ================= MODAL: REGISTRAR NUEVO PAGO A PROVEEDOR ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 lg:p-8 space-y-6 my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registrar Pago a Proveedor</h2>
                <p className="text-xs text-slate-500">
                  Selecciona las facturas a cancelar o abonar y emite el comprobante de egreso bancario
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Row 1: Proveedor & Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Proveedor *
                  </label>
                  <select
                    value={selectedVendorName}
                    onChange={(e) => {
                      const vName = e.target.value;
                      setSelectedVendorName(vName);
                      const found = vendors.find((v) => v.name === vName);
                      setSelectedVendorId(found?.id || "");
                      loadVendorPendingInvoices(vName);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#f6821f] font-medium"
                  >
                    <option value="">-- Selecciona un proveedor --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name} {v.macolaCode ? `(${v.macolaCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#f6821f] text-slate-800"
                  />
                </div>
              </div>

              {/* Row 2: Cuenta bancaria, Método, Referencia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Cuenta de Egreso (Banco / Caja) *
                  </label>
                  <select
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#f6821f] text-xs"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.accountNumber}) - Saldo: ${b.bookBalance.toLocaleString()} {b.currency}
                      </option>
                    ))}
                    {bankAccounts.length === 0 && (
                      <option value="">1100 - Bancos Nacionales (General)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Método de Pago *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#f6821f] text-xs font-medium"
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria (ACH)</option>
                    <option value="Cheque">Cheque Corporativo</option>
                    <option value="Efectivo">Efectivo / Caja Chica</option>
                    <option value="Tarjeta de Crédito">Tarjeta de Crédito Empresarial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    N° de Referencia / N° de Cheque
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. TRF-88401 o CHQ-1049"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#f6821f]"
                  />
                </div>
              </div>

              {/* PENDING INVOICES LIST FOR THIS VENDOR */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#f6821f]" />
                    <span>Facturas Pendientes de Pago ({pendingInvoices.length})</span>
                  </h3>
                  {pendingInvoices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = pendingInvoices.every((i) => i.isSelected);
                        setPendingInvoices((prev) =>
                          prev.map((i) => ({
                            ...i,
                            isSelected: !allSelected,
                            amountToPay: !allSelected ? i.balanceDue : 0,
                          }))
                        );
                      }}
                      className="text-[11px] font-bold text-[#f6821f] hover:underline cursor-pointer"
                    >
                      {pendingInvoices.every((i) => i.isSelected) ? "Deseleccionar todas" : "Seleccionar todas"}
                    </button>
                  )}
                </div>

                {loadingInvoices ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#f6821f] mx-auto mb-2" />
                    <span className="text-xs text-slate-500">Cargando facturas pendientes...</span>
                  </div>
                ) : !selectedVendorName ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    Por favor selecciona un proveedor arriba para cargar sus facturas pendientes.
                  </div>
                ) : pendingInvoices.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">¡Este proveedor está completamente al día!</p>
                    <p className="text-slate-400">No tiene facturas de compra pendientes de pago.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                          <th className="py-2.5 px-3">N° Factura</th>
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Vencimiento</th>
                          <th className="py-2.5 px-3 text-right">Total Factura</th>
                          <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                          <th className="py-2.5 px-3 text-right w-36">Monto a Pagar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendingInvoices.map((inv) => {
                          const isOverdue = new Date(inv.dueDate) < new Date();
                          return (
                            <tr
                              key={inv.id}
                              className={`transition cursor-pointer ${inv.isSelected ? "bg-[#fff7ed]/50" : "hover:bg-slate-50"}`}
                              onClick={() => toggleSelectInvoice(inv.id)}
                            >
                              <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={inv.isSelected}
                                  onChange={() => toggleSelectInvoice(inv.id)}
                                  className="w-4 h-4 rounded text-[#f6821f] focus:ring-[#f6821f] border-slate-300 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                {inv.invoiceNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {inv.issueDate}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className={isOverdue ? "text-rose-600 font-semibold" : "text-slate-600"}>
                                  {inv.dueDate} {isOverdue && "(Vencida)"}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600">
                                {formatCurrency(inv.total, inv.currency)}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                {formatCurrency(inv.balanceDue, inv.currency)}
                              </td>
                              <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-slate-400 text-xs">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={inv.balanceDue}
                                    value={inv.amountToPay}
                                    onChange={(e) => updateInvoiceAmount(inv.id, parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 text-right text-xs font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:border-[#f6821f]"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notas / Observaciones del Pago
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Pago de factura correspondiente al lote de tintas flexográficas..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#f6821f]"
                />
              </div>

              {/* Bottom Summary Bar */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Facturas a abonar:</span>
                  <div className="text-xs font-bold text-slate-800">
                    {pendingInvoices.filter((i) => i.isSelected).length} seleccionadas
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total a Pagar:</span>
                  <div className="text-2xl font-black text-[#ea580c]">
                    {formatCurrency(totalAmountToPay, paymentCurrency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={creating || totalAmountToPay <= 0}
                className="px-5 py-2.5 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Procesando pago...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar y Emitir Pago</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: COMPROBANTE DE EGRESO IMPRIMIBLE ================= */}
      {activeVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 lg:p-8 space-y-6 my-8 animate-in zoom-in-95 duration-150">
            {/* Voucher Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-800">
                  {activeVoucher.paymentNumber}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeVoucher.status === "APLICADO"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {activeVoucher.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVoucher(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* VOUCHER DOCUMENT CANVAS */}
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-6 text-xs text-slate-800">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    {companySettings?.nombreLegal || "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL"}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    RTN: {companySettings?.taxId || "05019008183490"} | {companySettings?.direccion || "ZIP Búfalo, Villanueva, Cortés"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tel: {companySettings?.telefono || "+504 9452-2666"} | {companySettings?.email || "contabilidad@waynetrademarkhn.com"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                    Comprobante de Egreso
                  </div>
                  <div className="font-mono text-base font-black text-slate-900 mt-0.5">
                    {activeVoucher.paymentNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Fecha: {activeVoucher.paymentDate}
                  </div>
                </div>
              </div>

              {/* Beneficiary & Payment Info */}
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Beneficiario / Proveedor:</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{activeVoucher.vendorName}</div>
                  {activeVoucher.vendor?.macolaCode && (
                    <span className="text-[10px] text-slate-500 font-mono">Código Macola: {activeVoucher.vendor.macolaCode}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Detalles del Desembolso:</span>
                  <div className="font-medium text-slate-800 mt-0.5">
                    <strong>Método:</strong> {activeVoucher.paymentMethod}
                  </div>
                  {activeVoucher.referenceNumber && (
                    <div className="font-mono text-slate-600 text-[11px]">
                      <strong>Ref / Cheque:</strong> {activeVoucher.referenceNumber}
                    </div>
                  )}
                  <div className="text-slate-500 text-[11px]">
                    <strong>Cuenta:</strong> {activeVoucher.paidAccount}
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div>
                <div className="text-xs font-bold text-slate-800 mb-2">Liquidación de Facturas Abonadas / Canceladas:</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/70 text-slate-600 font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Factura</th>
                        <th className="py-2.5 px-3 text-right">Monto Original</th>
                        <th className="py-2.5 px-3 text-right">Saldo Anterior</th>
                        <th className="py-2.5 px-3 text-right">Abono Aplicado</th>
                        <th className="py-2.5 px-3 text-right">Saldo Restante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeVoucher.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{l.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(l.originalAmount, activeVoucher.currency)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(l.balanceBefore, activeVoucher.currency)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(l.amountPaid, activeVoucher.currency)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-800">{formatCurrency(l.balanceRemaining, activeVoucher.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-500">
                          Total Pagado:
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm text-[#ea580c] font-black">
                          {formatCurrency(activeVoucher.amount, activeVoucher.currency)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {activeVoucher.notes && (
                <div className="text-[11px] text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">
                  <strong>Concepto / Notas:</strong> {activeVoucher.notes}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-200 text-center">
                <div className="space-y-1">
                  <div className="border-t border-slate-400 mx-4 pt-1"></div>
                  <span className="text-[10px] font-bold text-slate-700 block">Elaborado por</span>
                  <span className="text-[9px] text-slate-400 block">Tesorería / Cuentas por Pagar</span>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-400 mx-4 pt-1"></div>
                  <span className="text-[10px] font-bold text-slate-700 block">Aprobado por</span>
                  <span className="text-[9px] text-slate-400 block">Gerencia Administrativa</span>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-400 mx-4 pt-1"></div>
                  <span className="text-[10px] font-bold text-slate-700 block">Recibí Conforme</span>
                  <span className="text-[9px] text-slate-400 block">Firma y Sello del Proveedor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMAR ANULACIÓN DE PAGO ================= */}
      {paymentToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">¿Anular Pago {paymentToVoid.paymentNumber}?</h3>
                <span className="text-xs text-slate-500">Esta acción no se puede deshacer.</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Al anular este pago de <strong>{formatCurrency(paymentToVoid.amount, paymentToVoid.currency)}</strong> emitido a <strong>{paymentToVoid.vendorName}</strong>:
            </p>

            <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
              <li>Se restablecerá el saldo pendiente de las facturas afectadas.</li>
              <li>Se reintegrará el importe a la cuenta bancaria de egreso.</li>
              <li>El asiento contable quedará marcado como <strong>ANULADO</strong>.</li>
            </ul>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo de la anulación:</label>
              <input
                type="text"
                placeholder="Ej. Cheque devuelto, error de digitación, transferencia rechazada..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentToVoid(null)}
                disabled={voiding}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={voiding}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {voiding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Anulando...</span>
                  </>
                ) : (
                  <span>Confirmar Anulación</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
