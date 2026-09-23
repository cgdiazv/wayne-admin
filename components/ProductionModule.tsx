"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Factory,
  Plus,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Boxes,
  ArrowRight,
  Layers,
  Download,
  X,
  Play,
  Check,
  Building2,
  Calendar,
  User,
  Sliders,
  Sparkles,
  Info,
  ChevronRight,
} from "lucide-react";
import { CardSkeleton, TableRowsSkeleton } from "@/components/Skeleton";

export interface BomItem {
  id?: string;
  rawMaterialId?: string | null;
  rawMaterialSku: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface BillOfMaterials {
  id: string;
  code: string;
  name: string;
  productId?: string | null;
  productSku: string;
  productName: string;
  outputQuantity: number;
  unitOfMeasure: string;
  laborCost: number;
  overheadCost: number;
  active: boolean;
  notes?: string | null;
  items: BomItem[];
  createdAt: string;
}

export interface WorkOrderItem {
  id?: string;
  rawMaterialId?: string | null;
  rawMaterialSku: string;
  description: string;
  plannedQuantity: number;
  consumedQuantity: number;
  unitCost: number;
  totalCost: number;
  lotNumber?: string | null;
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  bomId?: string | null;
  bom?: BillOfMaterials | null;
  productId?: string | null;
  productSku: string;
  productName: string;
  targetQuantity: number;
  producedQuantity: number;
  unitOfMeasure: string;
  status: "BORRADOR" | "EN_PROCESO" | "COMPLETADA" | "CANCELADA" | string;
  startDate: string;
  completionDate?: string | null;
  supervisor?: string | null;
  productionLine?: string | null;
  notes?: string | null;
  assignedLotNumber?: string | null;
  totalRawCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalCost: number;
  unitCostFinal: number;
  journalEntryId?: string | null;
  items: WorkOrderItem[];
  createdAt: string;
}

interface ProductionModuleProps {
  onBackToDashboard?: () => void;
  inventory?: Array<{
    id: string;
    sku: string;
    description: string;
    cost: number;
    price: number;
    quantity: number;
    trackingType?: string;
    lots?: Array<{ id: string; lotNumber: string; quantity: number }>;
  }>;
  companySettings?: any;
  formatCurrency?: (val: number) => string;
  activeTab?: "work-orders" | "bom-recipes";
  onTabChange?: (tab: "work-orders" | "bom-recipes") => void;
}

export default function ProductionModule({
  onBackToDashboard,
  inventory = [],
  companySettings,
  formatCurrency = (v) => `$${v.toFixed(2)}`,
  activeTab: controlledActiveTab,
  onTabChange,
}: ProductionModuleProps) {
  // Navigation inside Production: "work-orders" | "bom-recipes"
  const [internalTab, setInternalTab] = useState<"work-orders" | "bom-recipes">("work-orders");
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const setActiveTab = (tab: "work-orders" | "bom-recipes") => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Data states
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [showNewWOModal, setShowNewWOModal] = useState(false);
  const [showNewBOMModal, setShowNewBOMModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forms
  const [newWOForm, setNewWOForm] = useState({
    orderNumber: "",
    bomId: "",
    productSku: "",
    productName: "",
    productId: "",
    targetQuantity: 1000,
    unitOfMeasure: "UND",
    startDate: new Date().toISOString().split("T")[0],
    completionDate: "",
    supervisor: "Ing. Carlos Mendoza (Planta Zip Búfalo)",
    productionLine: "Línea Flexografía 1 (6 Colores)",
    notes: "",
    assignedLotNumber: "",
    totalLaborCost: 0,
    totalOverheadCost: 0,
    items: [] as Array<{
      rawMaterialId?: string;
      rawMaterialSku: string;
      description: string;
      plannedQuantity: number;
      unitCost: number;
      lotNumber?: string;
    }>,
  });

  const [newBOMForm, setNewBOMForm] = useState({
    code: "",
    name: "",
    productId: "",
    productSku: "",
    productName: "",
    outputQuantity: 1000,
    unitOfMeasure: "UND",
    laborCost: 120.0,
    overheadCost: 50.0,
    notes: "",
    items: [
      {
        rawMaterialId: "",
        rawMaterialSku: "",
        description: "",
        quantity: 1,
        unitCost: 0,
      },
    ],
  });

  // Complete Production Form
  const [completeForm, setCompleteForm] = useState({
    producedQuantity: 0,
    assignedLotNumber: "",
    consumedItems: [] as Array<{
      id: string;
      rawMaterialSku: string;
      description: string;
      plannedQuantity: number;
      consumedQuantity: number;
      unitCost: number;
      lotNumber: string;
    }>,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Print Ref
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Load Initial Data
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [woRes, bomRes] = await Promise.all([
        fetch("/api/production/work-orders").then((r) => r.json()),
        fetch("/api/production/bom").then((r) => r.json()),
      ]);

      if (woRes.success && Array.isArray(woRes.data)) {
        setWorkOrders(woRes.data);
      }
      if (bomRes.success && Array.isArray(bomRes.data)) {
        setBoms(bomRes.data);
      }
    } catch (err: any) {
      console.error("Error loading production data:", err);
      setErrorMsg("Error al conectar con la base de datos de producción");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pre-generate next order number
  const nextOrderNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = workOrders.length + 1;
    return `OT-${year}-${count.toString().padStart(4, "0")}`;
  }, [workOrders]);

  // Pre-generate next BOM code
  const nextBomCode = useMemo(() => {
    const count = boms.length + 1;
    return `REC-${count.toString().padStart(3, "0")}`;
  }, [boms]);

  // Available finished products vs raw materials from inventory
  const finishedProducts = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.sku.startsWith("PT-") ||
        i.description.toLowerCase().includes("caja") ||
        i.description.toLowerCase().includes("etiqueta") ||
        i.description.toLowerCase().includes("empaque") ||
        !i.sku.startsWith("MP-")
    );
  }, [inventory]);

  const rawMaterials = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.sku.startsWith("MP-") ||
        i.description.toLowerCase().includes("tinta") ||
        i.description.toLowerCase().includes("carton") ||
        i.description.toLowerCase().includes("papel") ||
        i.description.toLowerCase().includes("solvente") ||
        i.description.toLowerCase().includes("adhesivo") ||
        i.trackingType === "LOT"
    );
  }, [inventory]);

  // Open New Work Order Modal
  const openNewWorkOrderModal = () => {
    const defaultLot = `LOT-PRD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    setNewWOForm({
      orderNumber: nextOrderNumber,
      bomId: "",
      productSku: finishedProducts[0]?.sku || "",
      productName: finishedProducts[0]?.description || "",
      productId: finishedProducts[0]?.id || "",
      targetQuantity: 1000,
      unitOfMeasure: "UND",
      startDate: new Date().toISOString().split("T")[0],
      completionDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split("T")[0],
      supervisor: "Ing. Carlos Mendoza (Planta Zip Búfalo)",
      productionLine: "Línea Flexografía 1 (6 Colores)",
      notes: "Producción programada según especificaciones de calidad ISO 9001",
      assignedLotNumber: defaultLot,
      totalLaborCost: 150.0,
      totalOverheadCost: 65.0,
      items: [],
    });
    setShowNewWOModal(true);
  };

  // When a BOM recipe is selected in New WO Modal, populate items & scale quantities
  const handleSelectBOMInWO = (bomId: string, targetQty: number) => {
    const selectedBom = boms.find((b) => b.id === bomId);
    if (!selectedBom) {
      setNewWOForm((prev) => ({ ...prev, bomId: "", items: [] }));
      return;
    }

    const scale = targetQty / (selectedBom.outputQuantity || 1);
    const scaledItems = selectedBom.items.map((it) => {
      const invItem = inventory.find((inv) => inv.sku === it.rawMaterialSku || inv.id === it.rawMaterialId);
      const availableLot = invItem?.lots && invItem.lots.length > 0 ? invItem.lots[0].lotNumber : "";
      return {
        rawMaterialId: it.rawMaterialId || undefined,
        rawMaterialSku: it.rawMaterialSku,
        description: it.description,
        plannedQuantity: Number((it.quantity * scale).toFixed(2)),
        unitCost: it.unitCost,
        lotNumber: availableLot,
      };
    });

    setNewWOForm((prev) => ({
      ...prev,
      bomId: selectedBom.id,
      productSku: selectedBom.productSku,
      productName: selectedBom.productName,
      productId: selectedBom.productId || "",
      unitOfMeasure: selectedBom.unitOfMeasure,
      totalLaborCost: Number((selectedBom.laborCost * scale).toFixed(2)),
      totalOverheadCost: Number((selectedBom.overheadCost * scale).toFixed(2)),
      items: scaledItems,
    }));
  };

  // Create Work Order Submit
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/production/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWOForm),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Error al crear la orden de trabajo");
      }
      setSuccessMsg(`¡Orden de Trabajo ${data.data.orderNumber} creada exitosamente!`);
      setShowNewWOModal(false);
      loadData(true);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar la orden");
    } finally {
      setActionLoading(false);
    }
  };

  // Create BOM Submit
  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/production/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBOMForm),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Error al crear la receta");
      }
      setSuccessMsg(`¡Receta ${data.data.name} guardada correctamente!`);
      setShowNewBOMModal(false);
      loadData(true);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar la receta");
    } finally {
      setActionLoading(false);
    }
  };

  // Start Work Order (Pass from BORRADOR to EN_PROCESO)
  const handleStartWorkOrder = async (wo: WorkOrder) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/production/work-orders/${wo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EN_PROCESO" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccessMsg(`Orden ${wo.orderNumber} iniciada en planta.`);
      loadData(true);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Complete Work Order Modal
  const openCompleteModal = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setCompleteForm({
      producedQuantity: wo.targetQuantity,
      assignedLotNumber: wo.assignedLotNumber || `LOT-PRD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      consumedItems: wo.items.map((it) => ({
        id: it.id || "",
        rawMaterialSku: it.rawMaterialSku,
        description: it.description,
        plannedQuantity: it.plannedQuantity,
        consumedQuantity: it.consumedQuantity || it.plannedQuantity,
        unitCost: it.unitCost,
        lotNumber: it.lotNumber || "",
      })),
    });
    setShowCompleteModal(true);
  };

  // Finalize Production (COMPLETADA, Inventory Discharge & Journal Entry)
  const handleFinalizeProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/production/work-orders/${selectedWO.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETADA",
          producedQuantity: completeForm.producedQuantity,
          assignedLotNumber: completeForm.assignedLotNumber,
          consumedItems: completeForm.consumedItems,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSuccessMsg(
        `¡Producción de la Orden ${selectedWO.orderNumber} completada! Se ingresaron ${completeForm.producedQuantity} unds a inventario y se generó el asiento contable.`
      );
      setShowCompleteModal(false);
      loadData(true);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al completar la producción");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        wo.orderNumber.toLowerCase().includes(q) ||
        wo.productSku.toLowerCase().includes(q) ||
        wo.productName.toLowerCase().includes(q) ||
        (wo.supervisor && wo.supervisor.toLowerCase().includes(q)) ||
        (wo.assignedLotNumber && wo.assignedLotNumber.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "ALL" || wo.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workOrders, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = workOrders.length;
    const inProgress = workOrders.filter((w) => w.status === "EN_PROCESO").length;
    const completed = workOrders.filter((w) => w.status === "COMPLETADA").length;
    const draft = workOrders.filter((w) => w.status === "BORRADOR").length;
    const totalCostCompleted = workOrders
      .filter((w) => w.status === "COMPLETADA")
      .reduce((sum, w) => sum + (w.totalCost || 0), 0);

    return { total, inProgress, completed, draft, totalCostCompleted };
  }, [workOrders]);

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-700 hover:text-red-900 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer mr-2"
              >
                <span>← Dashboard</span>
              </button>
            )}
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-6 h-6 text-[#f6821f]" />
              <span>Control de Producción y Órdenes de Trabajo</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5]">
              Manufactura & Transformación
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de recetas (BOM), transformación de materias primas por lote y entrada de producto terminado a inventario.
          </p>
        </div>

        {/* Tab switchers & action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("work-orders")}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "work-orders"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Órdenes de Trabajo ({workOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bom-recipes")}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "bom-recipes"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Fórmulas / BOM ({boms.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-xs"
            title="Sincronizar"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#f6821f]" : ""}`} />
          </button>

          {activeTab === "work-orders" ? (
            <button
              type="button"
              onClick={openNewWorkOrderModal}
              className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#f6821f]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva Orden de Trabajo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNewBOMForm({
                  code: nextBomCode,
                  name: "",
                  productId: finishedProducts[0]?.id || "",
                  productSku: finishedProducts[0]?.sku || "",
                  productName: finishedProducts[0]?.description || "",
                  outputQuantity: 1000,
                  unitOfMeasure: "UND",
                  laborCost: 120.0,
                  overheadCost: 50.0,
                  notes: "Fórmula de producción flexográfica estandarizada",
                  items: [
                    {
                      rawMaterialId: rawMaterials[0]?.id || "",
                      rawMaterialSku: rawMaterials[0]?.sku || "",
                      description: rawMaterials[0]?.description || "",
                      quantity: 1,
                      unitCost: rawMaterials[0]?.cost || 0,
                    },
                  ],
                });
                setShowNewBOMModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#f6821f]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva Receta / BOM</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Órdenes Emitidas</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#f6821f] flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.total}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{stats.draft} en estado borrador / programadas</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#f6821f]" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">En Proceso en Planta</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">{stats.inProgress}</span>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Líneas de ensamble y flexo activas</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Completadas e Ingresadas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">{stats.completed}</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Stock disponible con lote asignado</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-700">Costo de Fabricación Acum.</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
              {formatCurrency(stats.totalCostCompleted)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Materia prima + MOD + CIF transferido a libros</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
        </div>
      </div>

      {/* ================= TAB 1: ÓRDENES DE TRABAJO (WORK ORDERS) ================= */}
      {activeTab === "work-orders" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto text-xs font-medium overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "ALL" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todas ({workOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("BORRADOR")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === "BORRADOR" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Borrador ({workOrders.filter((w) => w.status === "BORRADOR").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("EN_PROCESO")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === "EN_PROCESO" ? "bg-amber-500 text-white font-bold shadow-xs" : "text-amber-700 hover:bg-amber-50"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>En Proceso ({workOrders.filter((w) => w.status === "EN_PROCESO").length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("COMPLETADA")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === "COMPLETADA" ? "bg-emerald-600 text-white font-bold shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completadas ({workOrders.filter((w) => w.status === "COMPLETADA").length})</span>
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Buscar por N.º de OT, producto, SKU o lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Master Work Orders Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">N° Orden</th>
                    <th className="p-3.5">Producto Terminado</th>
                    <th className="p-3.5 text-right">Cant. Programada</th>
                    <th className="p-3.5 text-right">Cant. Producida</th>
                    <th className="p-3.5">Lote Asignado</th>
                    <th className="p-3.5">Línea / Supervisor</th>
                    <th className="p-3.5 text-right">Costo Total</th>
                    <th className="p-3.5 text-center">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <TableRowsSkeleton rows={5} cols={9} />
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No se encontraron órdenes de trabajo registradas con ese criterio.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((wo) => (
                      <tr key={wo.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          <span className="px-2 py-1 rounded-lg bg-orange-50 text-[#f6821f] border border-orange-200 font-bold">
                            {wo.orderNumber}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{wo.productName}</p>
                          <span className="text-[11px] font-mono text-slate-500">SKU: {wo.productSku}</span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                          {wo.targetQuantity.toLocaleString("es-HN")} {wo.unitOfMeasure}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                          {wo.producedQuantity > 0
                            ? `${wo.producedQuantity.toLocaleString("es-HN")} ${wo.unitOfMeasure}`
                            : "—"}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600">
                          {wo.assignedLotNumber ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">
                              {wo.assignedLotNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">Por asignar</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <p className="font-medium text-slate-800">{wo.productionLine || "Planta Búfalo"}</p>
                          <span className="text-[10px] text-slate-400">{wo.supervisor || "Supervisor de Turno"}</span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(wo.totalCost)}
                          {wo.unitCostFinal > 0 && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              ({formatCurrency(wo.unitCostFinal)} / u)
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {wo.status === "BORRADOR" && (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                              BORRADOR
                            </span>
                          )}
                          {wo.status === "EN_PROCESO" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200 animate-pulse">
                              EN PROCESO
                            </span>
                          )}
                          {wo.status === "COMPLETADA" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 flex items-center gap-1 justify-center">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>COMPLETADA</span>
                            </span>
                          )}
                          {wo.status === "CANCELADA" && (
                            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold text-[10px] border border-red-200">
                              CANCELADA
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {wo.status === "BORRADOR" && (
                              <button
                                type="button"
                                onClick={() => handleStartWorkOrder(wo)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Iniciar producción en planta"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Iniciar</span>
                              </button>
                            )}
                            {wo.status === "EN_PROCESO" && (
                              <button
                                type="button"
                                onClick={() => openCompleteModal(wo)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Finalizar producción e ingresar stock"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completar</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWO(wo);
                                setShowDetailModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] cursor-pointer"
                            >
                              Ver Detalle
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
        </div>
      )}

      {/* ================= TAB 2: RECETAS / FÓRMULAS DE FABRICACIÓN (BOM) ================= */}
      {activeTab === "bom-recipes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {boms.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
                <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No hay recetas de fabricación creadas aún.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Crea una lista de materiales (BOM) para asociar las materias primas a tus productos de manufactura.
                </p>
              </div>
            ) : (
              boms.map((bom) => {
                const rawTotal = bom.items.reduce((s, it) => s + (it.totalCost || 0), 0);
                const totalRecipeCost = rawTotal + (bom.laborCost || 0) + (bom.overheadCost || 0);
                const unitEstimated = bom.outputQuantity > 0 ? totalRecipeCost / bom.outputQuantity : 0;

                return (
                  <div
                    key={bom.id}
                    className="bg-white border border-slate-200 hover:border-[#f6821f] transition-all rounded-2xl p-5 shadow-xs flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-[#f6821f] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {bom.code}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          ACTIVA
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#f6821f] transition">
                        {bom.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Produce: <strong className="text-slate-800">{bom.productName}</strong> ({bom.outputQuantity}{" "}
                        {bom.unitOfMeasure})
                      </p>

                      {/* Components Preview */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Materias Primas ({bom.items.length} componentes):
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1 text-xs">
                          {bom.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-slate-600 bg-slate-50 p-1.5 rounded">
                              <span className="truncate pr-2">
                                <strong>{it.quantity}x</strong> {it.description}
                              </span>
                              <span className="font-mono text-slate-800 font-semibold shrink-0">
                                {formatCurrency(it.totalCost)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Costo Est. Unitario:</span>
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {formatCurrency(unitEstimated)} / {bom.unitOfMeasure}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Quick instantiate WO with this BOM
                          openNewWorkOrderModal();
                          handleSelectBOMInWO(bom.id, bom.outputQuantity);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#f6821f] font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-orange-200"
                      >
                        <span>Emitir OT</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: NUEVA ORDEN DE TRABAJO ================= */}
      {showNewWOModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Factory className="w-5 h-5 text-[#f6821f]" />
                <h3 className="font-bold text-base text-slate-900">Programar Nueva Orden de Trabajo (OT)</h3>
              </div>
              <button
                onClick={() => setShowNewWOModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">N° de Orden de Trabajo *</label>
                  <input
                    type="text"
                    required
                    value={newWOForm.orderNumber}
                    onChange={(e) => setNewWOForm({ ...newWOForm, orderNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargar de Receta / BOM (Opcional)</label>
                  <select
                    value={newWOForm.bomId}
                    onChange={(e) => handleSelectBOMInWO(e.target.value, newWOForm.targetQuantity)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-medium"
                  >
                    <option value="">-- Seleccionar Receta Guardada --</option>
                    {boms.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.productName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Producto Terminado a Fabricar *</label>
                  <select
                    value={newWOForm.productSku}
                    onChange={(e) => {
                      const sel = inventory.find((i) => i.sku === e.target.value);
                      setNewWOForm({
                        ...newWOForm,
                        productSku: e.target.value,
                        productName: sel ? sel.description : e.target.value,
                        productId: sel ? sel.id : "",
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold"
                    required
                  >
                    <option value="">Selecciona el artículo...</option>
                    {finishedProducts.map((p) => (
                      <option key={p.id} value={p.sku}>
                        {p.sku} - {p.description} (Stock actual: {p.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cant. Programada *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newWOForm.targetQuantity}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      setNewWOForm({ ...newWOForm, targetQuantity: val });
                      if (newWOForm.bomId) handleSelectBOMInWO(newWOForm.bomId, val);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={newWOForm.startDate}
                    onChange={(e) => setNewWOForm({ ...newWOForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Estimada de Entrega</label>
                  <input
                    type="date"
                    value={newWOForm.completionDate}
                    onChange={(e) => setNewWOForm({ ...newWOForm, completionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Línea de Producción</label>
                  <input
                    type="text"
                    value={newWOForm.productionLine}
                    onChange={(e) => setNewWOForm({ ...newWOForm, productionLine: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supervisor Responsable</label>
                  <input
                    type="text"
                    value={newWOForm.supervisor}
                    onChange={(e) => setNewWOForm({ ...newWOForm, supervisor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lote Asignado al Producto Final</label>
                <input
                  type="text"
                  value={newWOForm.assignedLotNumber}
                  onChange={(e) => setNewWOForm({ ...newWOForm, assignedLotNumber: e.target.value })}
                  placeholder="Ej: LOT-PRD-2026-089"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-bold text-slate-800"
                />
              </div>

              {/* Components breakdown */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">Materias Primas e Insumos a Consumir</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewWOForm((prev) => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          {
                            rawMaterialId: rawMaterials[0]?.id,
                            rawMaterialSku: rawMaterials[0]?.sku || "",
                            description: rawMaterials[0]?.description || "",
                            plannedQuantity: 1,
                            unitCost: rawMaterials[0]?.cost || 0,
                            lotNumber: rawMaterials[0]?.lots?.[0]?.lotNumber || "",
                          },
                        ],
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-[11px] cursor-pointer"
                  >
                    + Agregar Insumo
                  </button>
                </div>

                <div className="space-y-2">
                  {newWOForm.items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="col-span-5">
                        <select
                          value={it.rawMaterialSku}
                          onChange={(e) => {
                            const raw = inventory.find((i) => i.sku === e.target.value);
                            const updated = [...newWOForm.items];
                            updated[idx] = {
                              ...updated[idx],
                              rawMaterialSku: e.target.value,
                              description: raw ? raw.description : e.target.value,
                              rawMaterialId: raw?.id,
                              unitCost: raw?.cost || 0,
                              lotNumber: raw?.lots?.[0]?.lotNumber || "",
                            };
                            setNewWOForm({ ...newWOForm, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                        >
                          <option value="">Seleccionar insumo...</option>
                          {rawMaterials.map((r) => (
                            <option key={r.id} value={r.sku}>
                              {r.sku} - {r.description} (${r.cost})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Cant."
                          step="0.01"
                          value={it.plannedQuantity}
                          onChange={(e) => {
                            const updated = [...newWOForm.items];
                            updated[idx].plannedQuantity = Number(e.target.value) || 0;
                            setNewWOForm({ ...newWOForm, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-right font-mono"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Lote a descontar (ej: LOT-MP-01)"
                          value={it.lotNumber || ""}
                          onChange={(e) => {
                            const updated = [...newWOForm.items];
                            updated[idx].lotNumber = e.target.value;
                            setNewWOForm({ ...newWOForm, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 font-mono text-[11px]"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setNewWOForm((prev) => ({
                              ...prev,
                              items: prev.items.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-slate-400 hover:text-red-600 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {newWOForm.items.length === 0 && (
                    <p className="text-center text-slate-400 py-3 text-xs">
                      No hay materias primas asignadas a esta orden.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewWOModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Emitir Orden de Trabajo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NUEVA RECETA / BOM ================= */}
      {showNewBOMModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Boxes className="w-5 h-5 text-[#f6821f]" />
                <h3 className="font-bold text-base text-slate-900">Crear Fórmula / Receta (Bill of Materials)</h3>
              </div>
              <button onClick={() => setShowNewBOMModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBOM} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código de la Fórmula *</label>
                  <input
                    type="text"
                    required
                    value={newBOMForm.code}
                    onChange={(e) => setNewBOMForm({ ...newBOMForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre Descriptivo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Fabricación Cajas Corrugadas 12x12"
                    value={newBOMForm.name}
                    onChange={(e) => setNewBOMForm({ ...newBOMForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Producto Terminado Resultante *</label>
                  <select
                    value={newBOMForm.productSku}
                    onChange={(e) => {
                      const sel = inventory.find((i) => i.sku === e.target.value);
                      setNewBOMForm({
                        ...newBOMForm,
                        productSku: e.target.value,
                        productName: sel ? sel.description : e.target.value,
                        productId: sel ? sel.id : "",
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-900"
                    required
                  >
                    <option value="">Selecciona el producto...</option>
                    {finishedProducts.map((p) => (
                      <option key={p.id} value={p.sku}>
                        {p.sku} - {p.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rendimiento Base</label>
                  <input
                    type="number"
                    min="1"
                    value={newBOMForm.outputQuantity}
                    onChange={(e) => setNewBOMForm({ ...newBOMForm, outputQuantity: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Recipe Components */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">Insumos y Materias Primas por Lote</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBOMForm((prev) => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          {
                            rawMaterialId: rawMaterials[0]?.id,
                            rawMaterialSku: rawMaterials[0]?.sku || "",
                            description: rawMaterials[0]?.description || "",
                            quantity: 1,
                            unitCost: rawMaterials[0]?.cost || 0,
                          },
                        ],
                      }));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-[11px] cursor-pointer"
                  >
                    + Agregar Fila
                  </button>
                </div>

                <div className="space-y-2">
                  {newBOMForm.items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="col-span-7">
                        <select
                          value={it.rawMaterialSku}
                          onChange={(e) => {
                            const raw = inventory.find((i) => i.sku === e.target.value);
                            const updated = [...newBOMForm.items];
                            updated[idx] = {
                              ...updated[idx],
                              rawMaterialSku: e.target.value,
                              description: raw ? raw.description : e.target.value,
                              rawMaterialId: raw?.id || "",
                              unitCost: raw?.cost || 0,
                            };
                            setNewBOMForm({ ...newBOMForm, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                        >
                          <option value="">Selecciona materia prima...</option>
                          {rawMaterials.map((r) => (
                            <option key={r.id} value={r.sku}>
                              {r.sku} - {r.description} (${r.cost})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Cantidad requerida"
                          value={it.quantity}
                          onChange={(e) => {
                            const updated = [...newBOMForm.items];
                            updated[idx].quantity = Number(e.target.value) || 0;
                            setNewBOMForm({ ...newBOMForm, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-right font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setNewBOMForm((prev) => ({
                              ...prev,
                              items: prev.items.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-slate-400 hover:text-red-600 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewBOMModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Guardando..." : "Guardar Receta / BOM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COMPLETAR PRODUCCIÓN (DESCARGA INVENTARIO) ================= */}
      {showCompleteModal && selectedWO && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Cierre y Alta de Producción: OT #{selectedWO.orderNumber}
                  </h3>
                  <span className="text-xs text-slate-500">{selectedWO.productName}</span>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFinalizeProduction} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  Acción irreversible de inventario y contabilidad:
                </p>
                <p className="text-[11px] text-amber-800">
                  Al completar esta orden, se descontarán las materias primas del stock físico (restando a los lotes indicados), se
                  ingresarán las unidades terminadas al inventario con su nuevo número de lote, y se generará el asiento contable de manufactura.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cantidad Terminada Fabricada *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={completeForm.producedQuantity}
                    onChange={(e) => setCompleteForm({ ...completeForm, producedQuantity: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lote del Producto Terminado *</label>
                  <input
                    type="text"
                    required
                    value={completeForm.assignedLotNumber}
                    onChange={(e) => setCompleteForm({ ...completeForm, assignedLotNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Verify consumed quantities & lots */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">
                  Verificar Consumo Real de Materia Prima y Lote a Descargar:
                </span>
                <div className="space-y-2">
                  {completeForm.consumedItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        <span className="font-bold text-slate-900 block">{item.description}</span>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {item.rawMaterialSku}</span>
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Cant. Consumida</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.consumedQuantity}
                          onChange={(e) => {
                            const updated = [...completeForm.consumedItems];
                            updated[idx].consumedQuantity = Number(e.target.value) || 0;
                            setCompleteForm({ ...completeForm, consumedItems: updated });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 font-mono font-bold text-right"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Lote a Rebajar</label>
                        <input
                          type="text"
                          value={item.lotNumber}
                          placeholder="Lote de origen"
                          onChange={(e) => {
                            const updated = [...completeForm.consumedItems];
                            updated[idx].lotNumber = e.target.value;
                            setCompleteForm({ ...completeForm, consumedItems: updated });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{actionLoading ? "Procesando Inventario..." : "Confirmar Cierre de Producción"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETALLE / HOJA DE PRODUCCIÓN ================= */}
      {showDetailModal && selectedWO && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#f6821f]" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Hoja de Producción: OT #{selectedWO.orderNumber}</h3>
                  <span className="text-xs text-slate-500">Wayne Trademark Printing & Packaging</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir OT</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref={printAreaRef} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Header Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Producto</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">{selectedWO.productName}</span>
                  <span className="font-mono text-slate-500 text-[11px]">SKU: {selectedWO.productSku}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Cantidades</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    Prog: {selectedWO.targetQuantity} {selectedWO.unitOfMeasure}
                  </span>
                  <span className="font-mono text-emerald-700 font-bold block text-[11px]">
                    Prod: {selectedWO.producedQuantity} {selectedWO.unitOfMeasure}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Fechas</span>
                  <span className="text-slate-800 block mt-0.5">Inicio: {selectedWO.startDate}</span>
                  <span className="text-slate-500 block text-[11px]">Cierre: {selectedWO.completionDate || "En proceso"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Lote Asignado</span>
                  <span className="font-mono font-bold text-[#f6821f] text-sm block mt-0.5">
                    {selectedWO.assignedLotNumber || "Pendiente"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 bg-slate-200 text-slate-800">
                    {selectedWO.status}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
                  Desglose de Materias Primas Consumidas
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Descripción Insumo</th>
                      <th className="p-3 text-right">Cant. Programada</th>
                      <th className="p-3 text-right">Cant. Consumida</th>
                      <th className="p-3">Lote Origen</th>
                      <th className="p-3 text-right">Costo Unit.</th>
                      <th className="p-3 text-right">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedWO.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-3 font-mono font-bold text-slate-800">{it.rawMaterialSku}</td>
                        <td className="p-3 text-slate-700">{it.description}</td>
                        <td className="p-3 text-right font-mono">{it.plannedQuantity}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{it.consumedQuantity}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">{it.lotNumber || "—"}</td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(it.unitCost)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(it.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cost Summary Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="space-y-1">
                  <span className="text-slate-500 font-semibold block text-xs">Mano de Obra & Costos Indirectos:</span>
                  <p className="text-[11px] text-slate-400">
                    MOD: {formatCurrency(selectedWO.totalLaborCost)} | CIF: {formatCurrency(selectedWO.totalOverheadCost)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium block">Costo Total de Producción:</span>
                  <span className="text-xl font-mono font-black text-slate-900 block">
                    {formatCurrency(selectedWO.totalCost)}
                  </span>
                  {selectedWO.unitCostFinal > 0 && (
                    <span className="text-xs font-mono text-[#f6821f] font-bold">
                      Costo Unitario Real: {formatCurrency(selectedWO.unitCostFinal)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs cursor-pointer"
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
