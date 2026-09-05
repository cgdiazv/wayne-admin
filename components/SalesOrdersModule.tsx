"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { CardSkeleton, TableRowsSkeleton } from "@/components/Skeleton";
import {
  PackageCheck,
  Plus,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
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
  Truck,
  Layers,
  ShoppingBag,
  Boxes,
  FileCheck,
  ArrowRight,
  Info,
  X,
} from "lucide-react";

export interface SalesOrderItem {
  id?: string;
  productName: string;
  sku?: string | null;
  description?: string | null;
  quantityOrdered: number;
  quantityCommitted: number;
  quantityShipped: number;
  quantityInvoiced: number;
  rate: number;
  amount: number;
  notes?: string | null;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  quoteId?: string | null;
  quoteNumber?: string | null;
  customerPoNumber?: string | null;
  customerId?: string | null;
  customerName: string;
  customerRtn?: string | null;
  customerAddress?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  paymentTerms: string;
  currency: string;
  salesRepId?: string | null;
  salesRepName?: string | null;
  warehouse: string;
  notes?: string | null;
  shippingNotes?: string | null;
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  status: "BORRADOR" | "CONFIRMADO" | "EN_PREPARACION" | "DESPACHADO_PARCIAL" | "DESPACHADO" | "FACTURADO" | "CANCELADO" | string;
  salesInvoiceId?: string | null;
  invoiceNumber?: string | null;
  salesInvoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    total: number;
    status: string;
  } | null;
  quote?: {
    id: string;
    quoteNumber: string;
    status: string;
  } | null;
  items: SalesOrderItem[];
  createdAt: string;
}

interface SalesOrdersModuleProps {
  onBack?: () => void;
  onOpenInvoiceEditor?: (prefilledData: any) => void;
  onNavigateToInvoices?: () => void;
  onNavigateToQuotes?: () => void;
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
  companySettings?: any;
}

export default function SalesOrdersModule({
  onBack,
  onOpenInvoiceEditor,
  onNavigateToInvoices,
  onNavigateToQuotes,
  customers = [],
  inventory = [],
  salesReps = [],
  companySettings,
}: SalesOrdersModuleProps) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [nextOrderNumber, setNextOrderNumber] = useState("PV-2026-0001");

  // Alertas
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Modales
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [converting, setConverting] = useState(false);

  // Formulario
  const initialFormState = {
    id: "",
    orderNumber: "",
    customerPoNumber: "",
    quoteId: "",
    quoteNumber: "",
    customerId: "",
    customerName: "",
    customerRtn: "",
    customerAddress: "",
    customerEmail: "",
    customerPhone: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
    paymentTerms: "Neto 30 días",
    currency: "USD",
    salesRepId: "",
    salesRepName: "",
    warehouse: "Bodega Principal Zip Búfalo",
    notes: "Pedido para producción y empaque flexográfico.",
    shippingNotes: "Entregar en muelle de recepción con remisión formal.",
    discount: 0,
    taxRate: 15,
    status: "CONFIRMADO",
    items: [
      {
        productName: "",
        sku: "",
        description: "",
        quantityOrdered: 1,
        quantityCommitted: 1,
        quantityShipped: 0,
        quantityInvoiced: 0,
        rate: 0,
        amount: 0,
        notes: "",
      },
    ],
  };

  const [formData, setFormData] = useState(initialFormState);
  const printSlipRef = useRef<HTMLDivElement>(null);

  // Cargar pedidos desde API
  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/sales-orders");
      const json = await res.json();
      if (json.success) {
        setOrders(json.data || []);
        if (json.nextOrderNumber) {
          setNextOrderNumber(json.nextOrderNumber);
        }
      } else {
        setErrorAlert(json.error || "No se pudieron cargar los pedidos.");
      }
    } catch (err: any) {
      console.error("Error al cargar pedidos:", err);
      setErrorAlert("Error de conexión al obtener pedidos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Limpiar alertas automáticamente
  useEffect(() => {
    if (successAlert) {
      const timer = setTimeout(() => setSuccessAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successAlert]);

  useEffect(() => {
    if (errorAlert) {
      const timer = setTimeout(() => setErrorAlert(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorAlert]);

  // Cálculos de métricas
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const confirmados = orders.filter((o) => o.status === "CONFIRMADO").length;
    const enBodega = orders.filter((o) => o.status === "EN_PREPARACION").length;
    const despachados = orders.filter((o) => o.status === "DESPACHADO" || o.status === "DESPACHADO_PARCIAL").length;
    const facturados = orders.filter((o) => o.status === "FACTURADO").length;
    const montoTotal = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const montoDespachadoSinFacturar = orders
      .filter((o) => o.status === "DESPACHADO" || o.status === "DESPACHADO_PARCIAL")
      .reduce((acc, o) => acc + (o.total || 0), 0);

    return {
      totalCount,
      confirmados,
      enBodega,
      despachados,
      facturados,
      montoTotal,
      montoDespachadoSinFacturar,
    };
  }, [orders]);

  // Filtrar pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        order.orderNumber.toLowerCase().includes(search) ||
        (order.customerPoNumber && order.customerPoNumber.toLowerCase().includes(search)) ||
        order.customerName.toLowerCase().includes(search) ||
        (order.quoteNumber && order.quoteNumber.toLowerCase().includes(search)) ||
        (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(search)) ||
        order.items.some(
          (it) =>
            it.productName.toLowerCase().includes(search) ||
            (it.sku && it.sku.toLowerCase().includes(search))
        );

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  // Manejo del formulario de creación / edición
  const handleOpenCreate = () => {
    setFormData({
      ...initialFormState,
      orderNumber: nextOrderNumber,
    });
    setShowEditorModal(true);
  };

  const handleOpenEdit = (order: SalesOrder) => {
    setFormData({
      id: order.id,
      orderNumber: order.orderNumber,
      customerPoNumber: order.customerPoNumber || "",
      quoteId: order.quoteId || "",
      quoteNumber: order.quoteNumber || "",
      customerId: order.customerId || "",
      customerName: order.customerName,
      customerRtn: order.customerRtn || "",
      customerAddress: order.customerAddress || "",
      customerEmail: order.customerEmail || "",
      customerPhone: order.customerPhone || "",
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate || "",
      paymentTerms: order.paymentTerms,
      currency: order.currency,
      salesRepId: order.salesRepId || "",
      salesRepName: order.salesRepName || "",
      warehouse: order.warehouse || "Bodega Principal Zip Búfalo",
      notes: order.notes || "",
      shippingNotes: order.shippingNotes || "",
      discount: order.discount || 0,
      taxRate: order.taxRate || 15,
      status: order.status,
      items: order.items.map((it) => ({
        productName: it.productName,
        sku: it.sku || "",
        description: it.description || "",
        quantityOrdered: it.quantityOrdered,
        quantityCommitted: it.quantityCommitted,
        quantityShipped: it.quantityShipped,
        quantityInvoiced: it.quantityInvoiced,
        rate: it.rate,
        amount: it.amount,
        notes: it.notes || "",
      })),
    });
    setShowEditorModal(true);
  };

  // Actualizar totales de formulario
  const calculateFormTotals = (
    items: typeof formData.items,
    discountVal: number,
    taxRateVal: number
  ) => {
    const subtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
    const taxableBase = Math.max(0, subtotal - Number(discountVal || 0));
    const tax = Number(((taxableBase * Number(taxRateVal || 0)) / 100).toFixed(2));
    const total = Number((taxableBase + tax).toFixed(2));
    return { subtotal, tax, total };
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };

    if (field === "quantityOrdered" || field === "rate") {
      const q = field === "quantityOrdered" ? Number(value) : Number(item.quantityOrdered);
      const r = field === "rate" ? Number(value) : Number(item.rate);
      item.amount = Number((q * r).toFixed(2));
      item.quantityCommitted = q;
    }

    newItems[index] = item;
    const totals = calculateFormTotals(newItems, formData.discount, formData.taxRate);
    setFormData((prev) => ({
      ...prev,
      items: newItems,
      ...totals,
    }));
  };

  const handleAddItem = () => {
    const newItems = [
      ...formData.items,
      {
        productName: "",
        sku: "",
        description: "",
        quantityOrdered: 1,
        quantityCommitted: 1,
        quantityShipped: 0,
        quantityInvoiced: 0,
        rate: 0,
        amount: 0,
        notes: "",
      },
    ];
    setFormData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    const totals = calculateFormTotals(newItems, formData.discount, formData.taxRate);
    setFormData((prev) => ({
      ...prev,
      items: newItems,
      ...totals,
    }));
  };

  const handleSelectInventoryItem = (index: number, invItem: any) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      productName: invItem.description,
      sku: invItem.sku,
      description: invItem.description,
      rate: invItem.price || 0,
      amount: Number((newItems[index].quantityOrdered * (invItem.price || 0)).toFixed(2)),
    };
    const totals = calculateFormTotals(newItems, formData.discount, formData.taxRate);
    setFormData((prev) => ({
      ...prev,
      items: newItems,
      ...totals,
    }));
  };

  const handleSelectCustomer = (customer: any) => {
    setFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email || "",
      customerPhone: customer.phone || "",
      customerAddress: customer.address || "",
    }));
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      setErrorAlert("Debe indicar el nombre del cliente.");
      return;
    }
    if (formData.items.some((it) => !it.productName.trim())) {
      setErrorAlert("Todos los ítems deben tener un nombre o descripción.");
      return;
    }

    try {
      const isEditing = Boolean(formData.id);
      const url = isEditing ? `/api/sales-orders/${formData.id}` : "/api/sales-orders";
      const method = isEditing ? "PUT" : "POST";

      const totals = calculateFormTotals(formData.items, formData.discount, formData.taxRate);

      const payload = {
        ...formData,
        ...totals,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        setSuccessAlert(json.message || "Pedido guardado exitosamente.");
        setShowEditorModal(false);
        fetchOrders();
      } else {
        setErrorAlert(json.error || "Error al guardar el pedido.");
      }
    } catch (err: any) {
      console.error("Error al guardar pedido:", err);
      setErrorAlert("Ocurrió un error inesperado al guardar.");
    }
  };

  // Cambio de estado rápido
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/sales-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessAlert(json.message || `Estado actualizado a ${newStatus}.`);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(json.data);
        }
      } else {
        setErrorAlert(json.error || "No se pudo actualizar el estado.");
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      setErrorAlert("Error al actualizar el estado del pedido.");
    }
  };

  // Facturar pedido con 1 clic
  const handleConvertToInvoice = async (order: SalesOrder) => {
    try {
      setConverting(true);
      const res = await fetch(`/api/sales-orders/${order.id}/convert-to-invoice`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessAlert(json.message);
        setShowConvertModal(false);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder({
            ...selectedOrder,
            status: "FACTURADO",
            invoiceNumber: json.data?.invoiceNumber,
            salesInvoiceId: json.data?.invoice?.id,
          });
        }
      } else {
        setErrorAlert(json.error || "No se pudo facturar el pedido.");
      }
    } catch (err) {
      console.error("Error al convertir a factura:", err);
      setErrorAlert("Ocurrió un error al emitir la factura.");
    } finally {
      setConverting(false);
    }
  };

  // Renderizador de Badges de Estado
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "BORRADOR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Borrador
          </span>
        );
      case "CONFIRMADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Check className="w-3 h-3 text-blue-600" />
            Confirmado
          </span>
        );
      case "EN_PREPARACION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Boxes className="w-3 h-3 text-amber-600 animate-pulse" />
            En Almacén
          </span>
        );
      case "DESPACHADO_PARCIAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="w-3 h-3 text-purple-600" />
            Despacho Parcial
          </span>
        );
      case "DESPACHADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3 h-3 text-indigo-600" />
            Despachado
          </span>
        );
      case "FACTURADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileCheck className="w-3 h-3 text-emerald-600" />
            Facturado
          </span>
        );
      case "CANCELADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {successAlert && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-medium shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successAlert}</span>
          </div>
          <button onClick={() => setSuccessAlert(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorAlert && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-xs font-medium shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorAlert}</span>
          </div>
          <button onClick={() => setErrorAlert(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
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
            <span>Regresar a Dashboard</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">Ventas</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">Historial de Pedidos de Venta</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Historial de Pedidos de Venta
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff7ed] text-[#f6821f] border border-[#ffedd5]">
                Ciclo Comercial y Almacén
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestione las órdenes de venta confirmadas por clientes, controle el alistamiento en bodega (Picking & Packing) y facture con 1 clic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#f6821f]" : ""}`} />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07116] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f6821f]/20 transition cursor-pointer"
            >
              <span className="text-sm leading-none">+</span>
              <span>Nuevo Pedido de Venta</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            {/* Card 1: Total Pedidos */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Pedidos Activos
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  ${metrics.montoTotal.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  {metrics.totalCount} pedidos registrados
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#f6821f]">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: En Preparación Almacén */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  En Almacén / Surtido
                </span>
                <h3 className="text-xl font-black text-amber-600 mt-1">
                  {metrics.enBodega} pedidos
                </h3>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Preparando empaque en bodega
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Boxes className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Despachados Listos para Facturar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Despachados sin Facturar
                </span>
                <h3 className="text-xl font-black text-indigo-600 mt-1">
                  ${metrics.montoDespachadoSinFacturar.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  {metrics.despachados} con remisión entregada
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Truck className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Facturados */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Facturados y Cerrados
                </span>
                <h3 className="text-xl font-black text-emerald-600 mt-1">
                  {metrics.facturados} pedidos
                </h3>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Con Factura SAR emitida
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= BARRA DE FILTROS & BÚSQUEDA ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Búsqueda */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N.º pedido, O.C. cliente o artículo..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#f6821f] transition"
            />
          </div>

          {/* Selector de pestañas / estados */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "Todos", count: orders.length },
              { id: "CONFIRMADO", label: "Confirmados", count: metrics.confirmados },
              { id: "EN_PREPARACION", label: "En Almacén", count: metrics.enBodega },
              { id: "DESPACHADO", label: "Despachados", count: metrics.despachados },
              { id: "FACTURADO", label: "Facturados", count: metrics.facturados },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === tab.id ? "bg-white/20 text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= TABLA DE PEDIDOS ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-4">Pedido / O.C. Cliente</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Fecha Emisión</th>
                  <th className="py-3 px-4">Fecha Prometida</th>
                  <th className="py-3 px-4">Almacén</th>
                  <th className="py-3 px-4 text-center">Ítems</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <TableRowsSkeleton rows={6} cols={9} />
              </tbody>
            </table>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
              <PackageCheck className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron pedidos de venta</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay pedidos que coincidan con los filtros aplicados. Puede crear un nuevo pedido o convertir una cotización aprobada.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Primer Pedido</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-4">Pedido / O.C. Cliente</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Fecha Emisión</th>
                  <th className="py-3 px-4">Fecha Prometida</th>
                  <th className="py-3 px-4">Almacén</th>
                  <th className="py-3 px-4 text-center">Ítems</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition group">
                    {/* Pedido / O.C. Cliente */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{order.orderNumber}</span>
                        {order.quoteNumber && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                            Cot: {order.quoteNumber}
                          </span>
                        )}
                      </div>
                      {order.customerPoNumber ? (
                        <span className="text-[11px] font-semibold text-orange-600 flex items-center gap-1 mt-0.5">
                          <span>O.C.:</span> {order.customerPoNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic block mt-0.5">Sin O.C. cliente</span>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{order.customerName}</div>
                      {order.customerRtn && (
                        <span className="text-[10px] text-slate-400 block font-mono">RTN: {order.customerRtn}</span>
                      )}
                    </td>

                    {/* Fechas */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{order.orderDate}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {order.expectedDeliveryDate ? (
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {order.expectedDeliveryDate}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Por definir</span>
                      )}
                    </td>

                    {/* Almacén */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="truncate max-w-[140px] block" title={order.warehouse}>
                        {order.warehouse}
                      </span>
                    </td>

                    {/* Ítems */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-[11px]">
                        {order.items.length}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                      ${order.total.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      <span className="text-[10px] font-normal text-slate-500">{order.currency}</span>
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4 text-center">{renderStatusBadge(order.status)}</td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botón Ver / Detalle */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                          title="Ver detalle del pedido y hoja de despacho"
                        >
                          Ver Detalle
                        </button>

                        {/* Botón Facturar si está despachado o confirmado */}
                        {order.status !== "FACTURADO" && order.status !== "CANCELADO" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowConvertModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition cursor-pointer flex items-center gap-1"
                            title="Generar Factura SAR con 1 clic"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>Facturar</span>
                          </button>
                        )}

                        {order.status === "FACTURADO" && order.invoiceNumber && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {order.invoiceNumber}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREAR / EDITAR PEDIDO ================= */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#fff7ed] border border-orange-200 flex items-center justify-center text-[#f6821f]">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {formData.id ? `Editar Pedido ${formData.orderNumber}` : "Registrar Nuevo Pedido de Venta"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Complete la información comercial y de despacho del cliente.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 space-y-6">
              {/* Bloque 1: Cabecera */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* N.º Pedido */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    N.º Pedido de Venta *
                  </label>
                  <input
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f6821f]"
                  />
                </div>

                {/* N.º Orden de Compra Cliente (PO) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    N.º O.C. del Cliente (Customer PO) *
                  </label>
                  <input
                    type="text"
                    value={formData.customerPoNumber}
                    onChange={(e) => setFormData({ ...formData, customerPoNumber: e.target.value })}
                    placeholder="Ej. OC-CERV-2026-891"
                    className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#f6821f]"
                  />
                </div>

                {/* Cotización de Referencia */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cotización Vinculada (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.quoteNumber}
                    onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })}
                    placeholder="Ej. COT-2026-0001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#f6821f]"
                  />
                </div>

                {/* Cliente */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cliente / Razón Social *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                      placeholder="Nombre o empresa del cliente"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#f6821f]"
                    />
                    {customers.length > 0 && (
                      <select
                        onChange={(e) => {
                          const cust = customers.find((c) => c.id === e.target.value);
                          if (cust) handleSelectCustomer(cust);
                        }}
                        value={formData.customerId}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#f6821f] max-w-[150px]"
                      >
                        <option value="">Elegir de lista...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* RTN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RTN del Cliente</label>
                  <input
                    type="text"
                    value={formData.customerRtn}
                    onChange={(e) => setFormData({ ...formData, customerRtn: e.target.value })}
                    placeholder="05019000000000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#f6821f]"
                  />
                </div>

                {/* Fecha Pedido */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha del Pedido</label>
                  <input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#f6821f]"
                  />
                </div>

                {/* Fecha Prometida de Entrega */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha Prometida de Entrega
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#f6821f]"
                  />
                </div>

                {/* Almacén */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Almacén de Despacho</label>
                  <select
                    value={formData.warehouse}
                    onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#f6821f]"
                  >
                    <option value="Bodega Principal Zip Búfalo">Bodega Principal Zip Búfalo</option>
                    <option value="Bodega de Producto Terminado Planta 1">Bodega de Producto Terminado Planta 1</option>
                    <option value="Bodega Flexografía Villanueva">Bodega Flexografía Villanueva</option>
                  </select>
                </div>
              </div>

              {/* Bloque 2: Tabla de Ítems */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Productos & Materiales Ordenados
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#f6821f]" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                        <th className="py-2.5 px-3">Artículo / SKU</th>
                        <th className="py-2.5 px-3">Descripción</th>
                        <th className="py-2.5 px-3 w-28 text-center">Cant. Ordenada</th>
                        <th className="py-2.5 px-3 w-28 text-right">Precio Unit.</th>
                        <th className="py-2.5 px-3 w-32 text-right">Monto</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={it.productName}
                              onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                              placeholder="Nombre del producto"
                              required
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#f6821f]"
                            />
                            {inventory.length > 0 && (
                              <select
                                onChange={(e) => {
                                  const inv = inventory.find((x) => x.id === e.target.value);
                                  if (inv) handleSelectInventoryItem(idx, inv);
                                }}
                                className="w-full mt-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500"
                              >
                                <option value="">Copiar desde inventario...</option>
                                {inventory.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.sku} - {inv.description} (${inv.price})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={it.description || ""}
                              onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                              placeholder="Especificaciones o arte"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#f6821f]"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={it.quantityOrdered}
                              onChange={(e) => handleItemChange(idx, "quantityOrdered", e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-[#f6821f]"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.rate}
                              onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-slate-800 focus:outline-none focus:border-[#f6821f]"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-900 font-mono">
                            ${Number(it.amount || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bloque 3: Notas y Totales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Instrucciones de Despacho para Bodega
                    </label>
                    <textarea
                      rows={2}
                      value={formData.shippingNotes}
                      onChange={(e) => setFormData({ ...formData, shippingNotes: e.target.value })}
                      placeholder="Empaque, paletizado, horarios de entrega..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#f6821f]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notas Internas</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Comentarios de ventas o crédito..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#f6821f]"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-bold font-mono">
                      ${formData.items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Descuento ($):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.discount}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const totals = calculateFormTotals(formData.items, val, formData.taxRate);
                        setFormData((prev) => ({ ...prev, discount: val, ...totals }));
                      }}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tasa ISV:</span>
                    <select
                      value={formData.taxRate}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const totals = calculateFormTotals(formData.items, formData.discount, val);
                        setFormData((prev) => ({ ...prev, taxRate: val, ...totals }));
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    >
                      <option value={15}>15% ISV General</option>
                      <option value={18}>18% ISV Licores/Cigarrillos</option>
                      <option value={0}>0% Exento / Exonerado</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                    <span>Total del Pedido:</span>
                    <span className="text-emerald-700 font-mono">
                      ${calculateFormTotals(formData.items, formData.discount, formData.taxRate).total.toFixed(2)}{" "}
                      {formData.currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción del modal */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07116] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer"
                >
                  {formData.id ? "Guardar Cambios" : "Confirmar y Crear Pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETALLE Y HOJA DE DESPACHO ================= */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Header del Modal */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedOrder.orderNumber}</h2>
                    {renderStatusBadge(selectedOrder.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    O.C. Cliente:{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedOrder.customerPoNumber || "Sin O.C."}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Imprimir Remisión</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido imprimible de la Remisión / Packing Slip */}
            <div ref={printSlipRef} className="p-6 space-y-6">
              {/* Encabezado Corporativo */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-black text-slate-900 text-sm tracking-wide">
                    WAYNE TRADEMARK DE HONDURAS, S.A.
                  </h3>
                  <p className="text-xs text-slate-500">
                    Zip Búfalo, Edificio 1B, Villanueva, Cortés • Tel: +504 2516-4300
                  </p>
                  <p className="text-xs font-semibold text-orange-600 mt-1">
                    HOJA DE DESPACHO Y CONTROL DE ALMACÉN (PACKING SLIP)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-800 block">
                    N.º: {selectedOrder.orderNumber}
                  </span>
                  <span className="text-[11px] text-slate-500 block">Fecha: {selectedOrder.orderDate}</span>
                  {selectedOrder.expectedDeliveryDate && (
                    <span className="text-[11px] text-indigo-700 font-semibold block">
                      Entrega Prometida: {selectedOrder.expectedDeliveryDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Datos de Entrega */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                    Cliente / Entregar a:
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedOrder.customerName}</p>
                  {selectedOrder.customerRtn && <p className="text-slate-600">RTN: {selectedOrder.customerRtn}</p>}
                  {selectedOrder.customerAddress && (
                    <p className="text-slate-500 mt-0.5">{selectedOrder.customerAddress}</p>
                  )}
                  {selectedOrder.customerPhone && (
                    <p className="text-slate-500">Tel: {selectedOrder.customerPhone}</p>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
                    Detalles Operativos:
                  </span>
                  <p className="text-slate-700 mt-0.5">
                    <span className="font-semibold">O.C. Cliente:</span> {selectedOrder.customerPoNumber || "N/A"}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Almacén:</span> {selectedOrder.warehouse}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold">Términos:</span> {selectedOrder.paymentTerms}
                  </p>
                  {selectedOrder.invoiceNumber && (
                    <p className="text-emerald-700 font-bold mt-1">
                      Factura Asociada: {selectedOrder.invoiceNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Instrucciones de Envío */}
              {selectedOrder.shippingNotes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <Truck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Instrucciones de Despacho y Transporte:</span>
                    <p className="text-[11px] mt-0.5">{selectedOrder.shippingNotes}</p>
                  </div>
                </div>
              )}

              {/* Tabla de Artículos a Despachar */}
              <div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                      <th className="py-2 px-3 w-8 text-center">✓</th>
                      <th className="py-2 px-3">Producto / SKU</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-3 text-center">Cant. Ordenada</th>
                      <th className="py-2 px-3 text-center">Cant. Despachada</th>
                      <th className="py-2 px-3 text-right">Precio</th>
                      <th className="py-2 px-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedOrder.items.map((it, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center">
                          <input type="checkbox" defaultChecked={it.quantityShipped > 0} className="rounded" />
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {it.productName}
                          {it.sku && <span className="text-[10px] text-slate-400 block font-mono">{it.sku}</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{it.description || "—"}</td>
                        <td className="py-2 px-3 text-center font-bold">{it.quantityOrdered}</td>
                        <td className="py-2 px-3 text-center font-bold text-indigo-600">
                          {it.quantityShipped || it.quantityOrdered}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">${it.rate.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">${it.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 font-bold text-xs bg-slate-50">
                      <td colSpan={6} className="py-2.5 px-3 text-right text-slate-600">
                        Total Pedido:
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                        ${selectedOrder.total.toFixed(2)} {selectedOrder.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Firmas de Control */}
              <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs text-slate-600">
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-800">Preparado por Almacén</p>
                  <p className="text-[10px] text-slate-400 mt-1">Firma / Bodega Central</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-800">Transporte / Chofer</p>
                  <p className="text-[10px] text-slate-400 mt-1">Nombre y Placa de Camión</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-800">Recibido Conforme Cliente</p>
                  <p className="text-[10px] text-slate-400 mt-1">Firma, Sello y Fecha</p>
                </div>
              </div>
            </div>

            {/* Footer con Transición de Estados */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Avanzar Estado:</span>
                {selectedOrder.status === "BORRADOR" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "CONFIRMADO")}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer"
                  >
                    Confirmar Pedido
                  </button>
                )}

                {selectedOrder.status === "CONFIRMADO" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "EN_PREPARACION")}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Pasar a Bodega</span>
                  </button>
                )}

                {selectedOrder.status === "EN_PREPARACION" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "DESPACHADO")}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Marcar Despachado</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.status !== "FACTURADO" && selectedOrder.status !== "CANCELADO" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowConvertModal(true);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Facturar Este Pedido</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMAR CONVERSIÓN A FACTURA ================= */}
      {showConvertModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-200 shrink-0">
                <FileCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Facturar Pedido de Venta</h3>
                <p className="text-xs text-slate-500">{selectedOrder.orderNumber}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold text-slate-900">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">O.C. Cliente:</span>
                <span className="font-semibold text-orange-600">{selectedOrder.customerPoNumber || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total a Facturar:</span>
                <span className="font-black text-slate-900 font-mono">
                  ${selectedOrder.total.toFixed(2)} {selectedOrder.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Productos:</span>
                <span>{selectedOrder.items.length} ítems despachados</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-800">Contabilización Automática NIIF / SAR:</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Se generará inmediatamente la Factura Fiscal y su correspondiente Asiento Contable de partida doble en el Libro Diario (Débito a Cuentas por Cobrar 1200 y Crédito a Ventas 4000 e ISV 2150).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                disabled={converting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleConvertToInvoice(selectedOrder)}
                disabled={converting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                {converting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Emitiendo Factura...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Confirmar y Emitir Factura SAR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
