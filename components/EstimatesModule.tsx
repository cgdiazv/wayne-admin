"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calculator,
  Plus,
  Search,
  RefreshCw,
  Printer,
  Download,
  Factory,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Boxes,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  DollarSign,
  ChevronRight,
  X,
  BookOpen,
} from "lucide-react";
import { CardSkeleton, TableRowsSkeleton } from "@/components/Skeleton";

export interface EstimateItem {
  id?: string;
  rawMaterialId?: string | null;
  rawMaterialSku: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  title: string;
  customerId?: string | null;
  customerName: string;
  customerRtn?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  date: string;
  validUntil?: string | null;
  currency: string;
  status: "BORRADOR" | "APROBADA" | "EN_PRODUCCION" | "RECHAZADA" | string;
  productId?: string | null;
  productSku: string;
  productName: string;
  targetQuantity: number;
  unitOfMeasure: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalEstimatedCost: number;
  unitCost: number;
  marginPercent: number;
  suggestedPrice: number;
  taxRate: number;
  tax: number;
  totalAmount: number;
  incomeAccountId?: string | null;
  incomeAccountCode?: string | null;
  incomeAccountName?: string | null;
  costAccountId?: string | null;
  costAccountCode?: string | null;
  costAccountName?: string | null;
  inventoryAccountId?: string | null;
  inventoryAccountCode?: string | null;
  inventoryAccountName?: string | null;
  workOrderId?: string | null;
  workOrderNumber?: string | null;
  notes?: string | null;
  items: EstimateItem[];
  createdAt: string;
}

interface EstimatesModuleProps {
  onBackToDashboard?: () => void;
  inventory?: Array<{
    id: string;
    sku: string;
    description: string;
    cost: number;
    price: number;
    quantity: number;
  }>;
  customers?: Array<{
    id: string;
    name: string;
    rtn?: string | null;
    email?: string | null;
    phone?: string | null;
    macolaCode?: string | null;
    address?: string | null;
    currency?: string;
  }>;
  accounts?: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
  }>;
  companySettings?: any;
  formatCurrency?: (val: number) => string;
  onEmitWorkOrder?: (estimate: Estimate) => void;
  onNavigateToAccounts?: () => void;
}

export default function EstimatesModule({
  onBackToDashboard,
  inventory = [],
  customers = [],
  accounts = [],
  companySettings,
  formatCurrency = (v) => `$${v.toFixed(2)}`,
  onEmitWorkOrder,
  onNavigateToAccounts,
}: EstimatesModuleProps) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);

  // Form State for New Estimate
  const [form, setForm] = useState({
    estimateNumber: "",
    title: "",
    customerId: "",
    customerName: "",
    customerRtn: "",
    customerEmail: "",
    customerPhone: "",
    date: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
    currency: "USD",
    status: "BORRADOR",
    productSku: "BOX-MST-024",
    productName: "Cajas Corrugadas Master Box Cerveza 24pk",
    targetQuantity: 1000,
    unitOfMeasure: "UND",
    laborCost: 150.0,
    overheadCost: 75.0,
    marginPercent: 35.0,
    taxRate: 15.0,
    incomeAccountId: "",
    incomeAccountCode: "4100",
    incomeAccountName: "Ventas / Ingresos de Manufactura",
    costAccountId: "",
    costAccountCode: "5100",
    costAccountName: "Costo de Ventas y Fabricación",
    inventoryAccountId: "",
    inventoryAccountCode: "1105",
    inventoryAccountName: "Inventario en Proceso / Terminado",
    notes: "",
    items: [] as Array<{
      rawMaterialId?: string;
      rawMaterialSku: string;
      description: string;
      quantity: number;
      unitCost: number;
    }>,
  });

  // Load data
  const loadEstimates = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/estimates");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEstimates(data.data);
      }
    } catch (err: any) {
      console.error("Error loading estimates:", err);
      setErrorMsg("No se pudieron cargar las estimaciones.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadEstimates();
  }, []);

  // Filtered accounts for smart dropdowns
  const incomeAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.type === "Income" || a.type === "Ingreso" || a.code.startsWith("4")
    );
  }, [accounts]);

  const costAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.type === "Expense" ||
        a.type === "Gasto" ||
        a.type === "Cost" ||
        a.code.startsWith("5")
    );
  }, [accounts]);

  const assetAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.type === "Asset" || a.type === "Activo" || a.code.startsWith("1")
    );
  }, [accounts]);

  // Open New Modal with smart defaults
  const openNewModal = () => {
    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const nextNumber = `EST-${new Date().getFullYear()}-${randomSuffix}`;
    const defaultCust = customers[0] || null;

    // Intelligent default accounts
    const defIncome = incomeAccounts[0] || { code: "4100", name: "Ventas / Ingresos de Manufactura" };
    const defCost = costAccounts[0] || { code: "5100", name: "Costo de Ventas y Fabricación" };
    const defAsset = assetAccounts.find((a) => a.code.includes("1105") || a.name.toLowerCase().includes("inventario")) ||
      assetAccounts[0] || { code: "1105", name: "Inventario en Proceso / Terminado" };

    setForm({
      estimateNumber: nextNumber,
      title: "Estimación Técnica para Fabricación de Empaque",
      customerId: defaultCust?.id || "",
      customerName: defaultCust?.name || "Cervecería Hondureña S.A.",
      customerRtn: defaultCust?.rtn || "05019001234567",
      customerEmail: defaultCust?.email || "compras@cerveceria.hn",
      customerPhone: defaultCust?.phone || "+504 2550-1000",
      date: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
      currency: "USD",
      status: "BORRADOR",
      productSku: "BOX-MST-024",
      productName: "Cajas Corrugadas Master Box Cerveza 24pk",
      targetQuantity: 1000,
      unitOfMeasure: "UND",
      laborCost: 150.0,
      overheadCost: 75.0,
      marginPercent: 35.0,
      taxRate: 15.0,
      incomeAccountId: defIncome.id || "",
      incomeAccountCode: defIncome.code || "4100",
      incomeAccountName: defIncome.name || "Ventas / Ingresos de Manufactura",
      costAccountId: defCost.id || "",
      costAccountCode: defCost.code || "5100",
      costAccountName: defCost.name || "Costo de Ventas y Fabricación",
      inventoryAccountId: defAsset.id || "",
      inventoryAccountCode: defAsset.code || "1105",
      inventoryAccountName: defAsset.name || "Inventario en Proceso / Terminado",
      notes: "Estimación basada en corrida estándar con cartón corrugado e impresión flexográfica.",
      items: [
        {
          rawMaterialSku: inventory[0]?.sku || "MAT-FLX-01",
          description: inventory[0]?.description || "Lámina de Cartón Corrugado",
          quantity: 1050,
          unitCost: inventory[0]?.cost || 0.65,
        },
      ],
    });
    setShowNewModal(true);
  };

  // Add Item to Estimate Form
  const handleAddItem = () => {
    const firstInv = inventory[0];
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          rawMaterialSku: firstInv?.sku || "INS-001",
          description: firstInv?.description || "Insumo de Producción",
          quantity: 1,
          unitCost: firstInv?.cost || 10,
        },
      ],
    }));
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Update item field
  const handleItemChange = (index: number, field: string, value: any) => {
    setForm((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };

      // If SKU changed, update description and unitCost automatically
      if (field === "rawMaterialSku") {
        const matching = inventory.find((inv) => inv.sku === value);
        if (matching) {
          nextItems[index].description = matching.description;
          nextItems[index].unitCost = matching.cost;
          nextItems[index].rawMaterialId = matching.id;
        }
      }
      return { ...prev, items: nextItems };
    });
  };

  // Live calculations for the Form
  const formCalculations = useMemo(() => {
    const materialCost = form.items.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0),
      0
    );
    const labor = Number(form.laborCost) || 0;
    const overhead = Number(form.overheadCost) || 0;
    const totalCost = materialCost + labor + overhead;
    const qty = Number(form.targetQuantity) || 1;
    const unitCost = qty > 0 ? totalCost / qty : 0;

    const margin = Number(form.marginPercent) || 0;
    const suggestedPrice = Math.round(totalCost * (1 + margin / 100) * 100) / 100;
    const taxRate = Number(form.taxRate) || 15;
    const tax = Math.round(suggestedPrice * (taxRate / 100) * 100) / 100;
    const totalAmount = Math.round((suggestedPrice + tax) * 100) / 100;
    const unitPrice = qty > 0 ? suggestedPrice / qty : 0;

    return {
      materialCost,
      labor,
      overhead,
      totalCost,
      unitCost,
      suggestedPrice,
      tax,
      totalAmount,
      unitPrice,
    };
  }, [form]);

  // Submit New Estimate
  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Error al crear estimación");
      }
      setSuccessMsg(`¡Estimación ${data.data.estimateNumber} guardada exitosamente!`);
      setShowNewModal(false);
      loadEstimates(true);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar");
    } finally {
      setActionLoading(false);
    }
  };

  // Change Status
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/estimates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setEstimates((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
        );
        if (selectedEstimate && selectedEstimate.id === id) {
          setSelectedEstimate({ ...selectedEstimate, status: newStatus });
        }
        setSuccessMsg(`Estado actualizado a ${newStatus}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered list
  const filteredEstimates = useMemo(() => {
    return estimates.filter((e) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        e.estimateNumber.toLowerCase().includes(q) ||
        e.customerName.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.productName.toLowerCase().includes(q) ||
        e.productSku.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [estimates, searchTerm, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = estimates.length;
    const totalAmountSum = estimates.reduce((s, e) => s + (e.totalAmount || 0), 0);
    const approved = estimates.filter((e) => e.status === "APROBADA");
    const inProduction = estimates.filter((e) => e.status === "EN_PRODUCCION");
    const avgMargin =
      estimates.length > 0
        ? Math.round(
            (estimates.reduce((s, e) => s + (e.marginPercent || 0), 0) / estimates.length) * 10
          ) / 10
        : 0;

    return {
      total,
      totalAmountSum,
      approvedCount: approved.length,
      approvedSum: approved.reduce((s, e) => s + (e.totalAmount || 0), 0),
      inProductionCount: inProduction.length,
      avgMargin,
    };
  }, [estimates]);

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fff7ed] to-orange-100 text-[#f6821f] border border-orange-200 flex items-center justify-center shadow-xs">
            <Calculator className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Estimaciones &amp; Cotizaciones a Clientes
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff7ed] text-[#f6821f] border border-orange-200">
                Cotizaciones Clientes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea cotizaciones y presupuestos para clientes calculando insumos, mano de obra y margen comercial, con enlace directo al Plan Contable y emisión a Producción.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToAccounts && (
            <button
              type="button"
              onClick={onNavigateToAccounts}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Plan de Cuentas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadEstimates()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#f6821f]" : ""}`} />
          </button>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#f6821f]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Estimación</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cotizado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Monto Total Estimado</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#f6821f] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalAmountSum)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{metrics.total} presupuestos registrados</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f6821f]" />
        </div>

        {/* Aprobadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Estimaciones Aprobadas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(metrics.approvedSum)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {metrics.approvedCount} aprobadas para fabricación
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* En Producción */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700">En Planta / Producción</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">
              {metrics.inProductionCount} OTs
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Con orden de trabajo emitida</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        {/* Margen Promedio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-700">Margen Promedio Sugerido</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">
              {metrics.avgMargin}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Rentabilidad meta sobre costo</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
            {[
              { id: "ALL", label: `Todas (${estimates.length})` },
              { id: "BORRADOR", label: `Borrador (${estimates.filter((e) => e.status === "BORRADOR").length})` },
              { id: "APROBADA", label: `Aprobadas (${estimates.filter((e) => e.status === "APROBADA").length})` },
              { id: "EN_PRODUCCION", label: `En Producción (${estimates.filter((e) => e.status === "EN_PRODUCCION").length})` },
              { id: "RECHAZADA", label: `Rechazadas (${estimates.filter((e) => e.status === "RECHAZADA").length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-[#fff7ed] text-[#f6821f] font-bold border border-orange-200 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N°, cliente, SKU o producto..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">N° ESTIMACIÓN</th>
                <th className="p-3.5">FECHA / VENCE</th>
                <th className="p-3.5">CLIENTE</th>
                <th className="p-3.5">PRODUCTO &amp; CORRIDA</th>
                <th className="p-3.5 text-right">COSTO TOTAL</th>
                <th className="p-3.5 text-right">PRECIO VENTA</th>
                <th className="p-3.5 text-center">ESTADO</th>
                <th className="p-3.5 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableRowsSkeleton rows={4} cols={8} />
              ) : filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600">No se encontraron estimaciones</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Crea tu primera estimación técnica con desglose de materiales, MOD y CIF.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEstimates.map((est) => (
                  <tr key={est.id} className="hover:bg-slate-50/80 transition group">
                    {/* Número */}
                    <td className="p-3.5 font-bold font-mono text-slate-900">
                      <button
                        type="button"
                        onClick={() => setSelectedEstimate(est)}
                        className="text-[#f6821f] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>{est.estimateNumber}</span>
                      </button>
                    </td>

                    {/* Fechas */}
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">
                      <div>{est.date}</div>
                      {est.validUntil && (
                        <div className="text-[10px] text-slate-400">Vence: {est.validUntil}</div>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{est.customerName}</div>
                      {est.customerEmail && (
                        <div className="text-[10px] text-slate-400">{est.customerEmail}</div>
                      )}
                    </td>

                    {/* Producto */}
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{est.productName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {est.targetQuantity.toLocaleString()} {est.unitOfMeasure} • SKU: {est.productSku}
                      </div>
                    </td>

                    {/* Costo Total */}
                    <td className="p-3.5 text-right font-mono">
                      <div className="font-bold text-slate-800">
                        {formatCurrency(est.totalEstimatedCost)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatCurrency(est.unitCost)} / {est.unitOfMeasure}
                      </div>
                    </td>

                    {/* Precio Sugerido */}
                    <td className="p-3.5 text-right font-mono">
                      <div className="font-black text-slate-900">
                        {formatCurrency(est.totalAmount)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold">
                        +{est.marginPercent}% margen
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          est.status === "APROBADA"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : est.status === "EN_PRODUCCION"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : est.status === "RECHAZADA"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {est.status === "EN_PRODUCCION" ? "En Producción" : est.status}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botón Crear Job si está Aprobada o Borrador */}
                        {est.status !== "EN_PRODUCCION" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onEmitWorkOrder) {
                                onEmitWorkOrder(est);
                              } else {
                                setSelectedEstimate(est);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#f6821f] font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-orange-200 shadow-2xs"
                            title="Crear Job en Producción a partir de esta estimación"
                          >
                            <Factory className="w-3 h-3" />
                            <span>Crear Job</span>
                          </button>
                        )}

                        {est.status === "EN_PRODUCCION" && est.workOrderNumber && (
                          <span
                            className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200"
                            title="Orden de Trabajo ya emitida en planta"
                          >
                            {est.workOrderNumber}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedEstimate(est)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition text-[11px]"
                        >
                          Detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: NUEVA ESTIMACIÓN ================= */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#f6821f] border border-orange-200 flex items-center justify-center shadow-xs">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Nueva Estimación / Cotización para Cliente
                  </h2>
                  <p className="text-xs text-slate-500">
                    Calcula insumos, mano de obra, margen comercial y genera la cotización conectada a Cuentas y Producción.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleCreateEstimate} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Sección 1: Datos Comerciales */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#f6821f]" />
                  <span>1. Datos del Cliente &amp; Documento</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">N° de Estimación *</label>
                    <input
                      type="text"
                      required
                      value={form.estimateNumber}
                      onChange={(e) => setForm({ ...form, estimateNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:border-[#f6821f] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cliente *</label>
                    <input
                      type="text"
                      required
                      list="customers-list"
                      value={form.customerName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = customers.find((c) => c.name.toLowerCase() === val.toLowerCase());
                        setForm({
                          ...form,
                          customerName: val,
                          customerId: match?.id || "",
                          customerRtn: match?.rtn || form.customerRtn,
                          customerEmail: match?.email || form.customerEmail,
                          customerPhone: match?.phone || form.customerPhone,
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-[#f6821f] focus:outline-none"
                      placeholder="Seleccionar o escribir cliente..."
                    />
                    <datalist id="customers-list">
                      {customers.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fecha Emisión *</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:border-[#f6821f] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Título de la Estimación</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:border-[#f6821f] focus:outline-none"
                      placeholder="Ej. Tiraje 10,000 Cajas con Impresión 4 Tintas..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Validez Hasta</label>
                    <input
                      type="date"
                      value={form.validUntil}
                      onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:border-[#f6821f] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Producto a Fabricar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-[#f6821f]" />
                  <span>2. Especificación de Fabricación</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SKU Producto *</label>
                    <input
                      type="text"
                      required
                      value={form.productSku}
                      onChange={(e) => setForm({ ...form, productSku: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 uppercase font-bold focus:border-[#f6821f] focus:outline-none"
                      placeholder="BOX-MST-024"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      value={form.productName}
                      onChange={(e) => setForm({ ...form, productName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:border-[#f6821f] focus:outline-none"
                      placeholder="Cajas Corrugadas Master Box..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cantidad Corrida *</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={form.targetQuantity}
                        onChange={(e) => setForm({ ...form, targetQuantity: Number(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:border-[#f6821f] focus:outline-none"
                      />
                      <select
                        value={form.unitOfMeasure}
                        onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                        className="px-2 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-xs"
                      >
                        <option value="UND">UND</option>
                        <option value="MILLAR">MILLAR</option>
                        <option value="BOBINA">BOBINA</option>
                        <option value="ROLLO">ROLLO</option>
                        <option value="KG">KG</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 3: Insumos y Materias Primas */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#f6821f]" />
                    <span>3. Insumos &amp; Materias Primas Requeridas</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agregar Insumo</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 items-center"
                    >
                      <div className="col-span-3">
                        <select
                          value={item.rawMaterialSku}
                          onChange={(e) => handleItemChange(idx, "rawMaterialSku", e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-[11px]"
                        >
                          <option value="">Seleccionar SKU...</option>
                          {inventory.map((inv) => (
                            <option key={inv.id} value={inv.sku}>
                              {inv.sku} - {inv.description.slice(0, 25)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="Descripción del insumo..."
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value) || 0)}
                          placeholder="Cant."
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(idx, "unitCost", Number(e.target.value) || 0)}
                          placeholder="Costo U."
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center px-3 py-2 bg-orange-50/60 rounded-xl border border-orange-100 text-slate-700 font-bold text-xs">
                    <span>Subtotal Materias Primas:</span>
                    <span className="font-mono text-slate-900 font-black">
                      {formatCurrency(formCalculations.materialCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 4: MOD, CIF y Margen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Costos Indirectos y Mano de Obra */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#f6821f]" />
                    <span>4. Costos de Transformación</span>
                  </span>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mano de Obra Directa (MOD Estimada) ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={form.laborCost}
                      onChange={(e) => setForm({ ...form, laborCost: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:border-[#f6821f] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Costos Indirectos de Fabricación (CIF) ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={form.overheadCost}
                      onChange={(e) => setForm({ ...form, overheadCost: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:border-[#f6821f] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-800">
                    <span>Costo Total Estimado:</span>
                    <span className="font-mono text-slate-900 font-black text-sm">
                      {formatCurrency(formCalculations.totalCost)}
                    </span>
                  </div>
                </div>

                {/* Margen y Precios */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>5. Rentabilidad &amp; Cotización</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Margen Meta (%)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={form.marginPercent}
                        onChange={(e) => setForm({ ...form, marginPercent: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-emerald-700 font-black focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">ISV Impuesto (%)</label>
                      <input
                        type="number"
                        value={form.taxRate}
                        onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) || 15 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:border-[#f6821f] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>Precio Unitario Sugerido:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(formCalculations.unitPrice)} / {form.unitOfMeasure}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>Subtotal Cotizado:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(formCalculations.suggestedPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>Impuesto ISV (15%):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(formCalculations.tax)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                      <span>Total Presupuesto:</span>
                      <span className="font-mono text-[#f6821f]">
                        {formatCurrency(formCalculations.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 5: Conexión Automática con el Plan de Cuentas */}
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>6. Conexión Automática con el Plan de Cuentas Contables</span>
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    Partida Doble
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-blue-950 mb-1">
                      Cuenta de Ingreso (Ventas)
                    </label>
                    <select
                      value={form.incomeAccountCode}
                      onChange={(e) => {
                        const acc = accounts.find((a) => a.code === e.target.value);
                        setForm({
                          ...form,
                          incomeAccountCode: e.target.value,
                          incomeAccountId: acc?.id || "",
                          incomeAccountName: acc?.name || "Ventas de Fabricación",
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500"
                    >
                      {incomeAccounts.length > 0 ? (
                        incomeAccounts.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} - {a.name}
                          </option>
                        ))
                      ) : (
                        <option value="4100">4100 - Ventas / Ingresos por Fabricación</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-blue-950 mb-1">
                      Cuenta de Costo (Fabricación)
                    </label>
                    <select
                      value={form.costAccountCode}
                      onChange={(e) => {
                        const acc = accounts.find((a) => a.code === e.target.value);
                        setForm({
                          ...form,
                          costAccountCode: e.target.value,
                          costAccountId: acc?.id || "",
                          costAccountName: acc?.name || "Costo de Ventas y Manufactura",
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500"
                    >
                      {costAccounts.length > 0 ? (
                        costAccounts.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} - {a.name}
                          </option>
                        ))
                      ) : (
                        <option value="5100">5100 - Costo de Ventas y Fabricación</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-blue-950 mb-1">
                      Cuenta Inventario / WIP
                    </label>
                    <select
                      value={form.inventoryAccountCode}
                      onChange={(e) => {
                        const acc = accounts.find((a) => a.code === e.target.value);
                        setForm({
                          ...form,
                          inventoryAccountCode: e.target.value,
                          inventoryAccountId: acc?.id || "",
                          inventoryAccountName: acc?.name || "Inventario Producto Terminado",
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500"
                    >
                      {assetAccounts.length > 0 ? (
                        assetAccounts.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} - {a.name}
                          </option>
                        ))
                      ) : (
                        <option value="1105">1105 - Inventario en Proceso / Terminado</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notas Técnicas y Observaciones</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Instrucciones para el supervisor de planta o condiciones comerciales..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#f6821f]"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-bold transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Guardar Estimación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETALLE DE ESTIMACIÓN ================= */}
      {selectedEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#f6821f] border border-orange-200 flex items-center justify-center shadow-xs">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      Estimación {selectedEstimate.estimateNumber}
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedEstimate.status === "APROBADA"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : selectedEstimate.status === "EN_PRODUCCION"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : selectedEstimate.status === "RECHAZADA"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {selectedEstimate.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Emitida el {selectedEstimate.date} para {selectedEstimate.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEstimate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Product Info Banner (Light theme) */}
              <div className="bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-slate-50 p-4 rounded-2xl border border-orange-200/80 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#ea580c] bg-orange-100/80 px-2 py-0.5 rounded-md inline-block mb-1">
                    Producto a Cotizar
                  </span>
                  <h3 className="text-base font-black text-slate-900">{selectedEstimate.productName}</h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    SKU: <span className="font-bold text-slate-800">{selectedEstimate.productSku}</span> • Corrida programada:{" "}
                    <span className="font-bold text-slate-800">{selectedEstimate.targetQuantity.toLocaleString()} {selectedEstimate.unitOfMeasure}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold tracking-wider">
                    Precio Sugerido
                  </span>
                  <span className="text-2xl font-black text-[#f6821f] tracking-tight">
                    {formatCurrency(selectedEstimate.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Financial & Cost Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">1. Materias Primas</span>
                  <p className="text-base font-mono font-black text-slate-900 mt-1">
                    {formatCurrency(selectedEstimate.materialCost)}
                  </p>
                  <p className="text-[10px] text-slate-400">{selectedEstimate.items?.length || 0} insumos listados</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">2. Mano de Obra (MOD)</span>
                  <p className="text-base font-mono font-black text-slate-900 mt-1">
                    {formatCurrency(selectedEstimate.laborCost)}
                  </p>
                  <p className="text-[10px] text-slate-400">Operadores de máquina y flexo</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">3. CIF Indirectos</span>
                  <p className="text-base font-mono font-black text-slate-900 mt-1">
                    {formatCurrency(selectedEstimate.overheadCost)}
                  </p>
                  <p className="text-[10px] text-slate-400">Energía, amortización, solventes</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100/80 px-4 py-2 font-bold text-slate-700 text-xs">
                  Desglose de Insumos y Materiales
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5">DESCRIPCIÓN</th>
                      <th className="p-2.5 text-right">CANTIDAD</th>
                      <th className="p-2.5 text-right">COSTO UNIT.</th>
                      <th className="p-2.5 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedEstimate.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{it.rawMaterialSku}</td>
                        <td className="p-2.5 text-slate-600">{it.description}</td>
                        <td className="p-2.5 text-right font-mono">{it.quantity.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(it.unitCost)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(it.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Conexión Cuentas Contables */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2">
                <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cuentas del Catálogo Contable Vinculadas</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">CUENTA INGRESOS</span>
                    <span className="font-mono font-bold text-blue-800">
                      {selectedEstimate.incomeAccountCode || "4100"}
                    </span>
                    <span className="text-[10px] text-slate-600 block truncate">
                      {selectedEstimate.incomeAccountName || "Ventas de Manufactura"}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">CUENTA COSTOS</span>
                    <span className="font-mono font-bold text-amber-800">
                      {selectedEstimate.costAccountCode || "5100"}
                    </span>
                    <span className="text-[10px] text-slate-600 block truncate">
                      {selectedEstimate.costAccountName || "Costo de Ventas y Fabricación"}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">CUENTA INVENTARIO</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {selectedEstimate.inventoryAccountCode || "1105"}
                    </span>
                    <span className="text-[10px] text-slate-600 block truncate">
                      {selectedEstimate.inventoryAccountName || "Inventario Producto Terminado"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Si ya tiene OT */}
              {selectedEstimate.workOrderNumber && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold">Orden de Trabajo en Planta:</span>{" "}
                      <span className="font-mono font-black">{selectedEstimate.workOrderNumber}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Activa en Producción
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {selectedEstimate.status === "BORRADOR" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedEstimate.id, "APROBADA")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Aprobar Estimación
                  </button>
                )}

                {selectedEstimate.status !== "EN_PRODUCCION" && (
                  <button
                    type="button"
                    onClick={() => {
                      const est = selectedEstimate;
                      setSelectedEstimate(null);
                      if (onEmitWorkOrder) onEmitWorkOrder(est);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#f6821f]/20"
                  >
                    <Factory className="w-3.5 h-3.5" />
                    <span>Crear Job</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEstimate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
