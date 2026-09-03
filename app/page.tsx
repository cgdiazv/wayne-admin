"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  isActive: boolean;
};

type Customer = {
  id: string;
  macolaCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
};

type Vendor = {
  id: string;
  macolaCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
};

type InventoryItem = {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  cost: number;
  price: number;
};

type NavItem = "dashboard" | "plan-cuentas" | "transacciones" | "macola-sync" | "clientes" | "proveedores" | "inventario" | "configuracion";

export default function AdminDashboard() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<NavItem>("dashboard");
  const [contabilidadOpen, setContabilidadOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPnL, setShowPnL] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Quick Actions Bar State & Config
  const quickActions = [
    { id: "crear-factura", label: "Crear factura" },
    { id: "registrar-gasto", label: "Registrar gasto" },
    { id: "agregar-deposito", label: "Agregar depósito bancario" },
    { id: "agregar-cliente", label: "Agregar cliente" },
    { id: "crear-estado-cuenta", label: "Crear estado de cuenta" },
    { id: "registrar-pago", label: "Registrar pago" },
    { id: "crear-orden-compra", label: "Crear orden de compra" },
    { id: "pagar-facturas", label: "Pagar facturas" },
    { id: "agregar-proveedor", label: "Agregar proveedor" },
  ];

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const [customerForm, setCustomerForm] = useState({
    name: "",
    macolaCode: "",
    email: "",
    phone: "",
    address: "",
    currency: "USD",
  });

  const [vendorForm, setVendorForm] = useState({
    name: "",
    macolaCode: "",
    email: "",
    phone: "",
    address: "",
    currency: "USD",
  });

  const handleQuickAction = (id: string) => {
    setModalError("");
    setModalSuccess("");
    setActiveModal(id);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al crear cliente");
      }
      setModalSuccess("¡Cliente agregado exitosamente a la base de datos!");
      setCustomerForm({ name: "", macolaCode: "", email: "", phone: "", address: "", currency: "USD" });
      await loadDashboardData();
      setTimeout(() => {
        setActiveModal(null);
        setModalSuccess("");
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || "Error al registrar cliente");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al crear proveedor");
      }
      setModalSuccess("¡Proveedor agregado exitosamente a la base de datos!");
      setVendorForm({ name: "", macolaCode: "", email: "", phone: "", address: "", currency: "USD" });
      await loadDashboardData();
      setTimeout(() => {
        setActiveModal(null);
        setModalSuccess("");
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || "Error al registrar proveedor");
    } finally {
      setModalLoading(false);
    }
  };

  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Fetch all live data from Next.js API routes
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [accRes, cusRes, venRes, invRes] = await Promise.all([
        fetch("/api/accounts").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/vendors").then((r) => r.json()),
        fetch("/api/inventory").then((r) => r.json()),
      ]);

      if (accRes.success) setAccounts(accRes.data || []);
      if (cusRes.success) setCustomers(cusRes.data || []);
      if (venRes.success) setVendors(venRes.data || []);
      if (invRes.success) setInventory(invRes.data || []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Calculations
  const totalInventoryUnits = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalInventoryValuation = inventory.reduce((sum, item) => sum + (item.quantity || 0) * (item.cost || 0), 0);

  // Filters
  const filteredAccounts = accounts.filter(
    (a) => a.code.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.macolaCode && c.macolaCode.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.macolaCode && v.macolaCode.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredInventory = inventory.filter(
    (i) =>
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* ===================== SIDEBAR ===================== */}
      <aside
        className={`${
          sidebarCollapsed ? "w-20" : "w-64"
        } shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-30 sticky top-0 h-screen`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#fff7ed] border border-[#f6821f]/30 flex items-center justify-center font-bold text-[#f6821f] text-lg shrink-0 shadow-xs">
              W
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <h1 className="font-bold text-sm text-slate-900 leading-tight">Wayne Admin</h1>
                <p className="text-[11px] text-slate-500 truncate">Wayne Trademark Honduras</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition hidden md:block"
            title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sidebarCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-medium">
          {/* Dashboard Item */}
          <button
            onClick={() => setCurrentView("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              currentView === "dashboard"
                ? "bg-[#fff7ed] text-[#f6821f] font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          {/* Contabilidad Section (Collapsible Dropdown matching screenshot) */}
          <div className="pt-2">
            <button
              onClick={() => setContabilidadOpen(!contabilidadOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-slate-700 hover:bg-slate-100 ${
                currentView.includes("cuentas") || currentView === "transacciones" || currentView === "macola-sync"
                  ? "font-semibold text-slate-900"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <div className="w-4 h-4 rounded-full bg-[#f6821f]/15 text-[#f6821f] flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                {!sidebarCollapsed && <span>Contabilidad</span>}
              </div>
              {!sidebarCollapsed && (
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    contabilidadOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* Sub-items */}
            {contabilidadOpen && !sidebarCollapsed && (
              <div className="pl-9 pr-2 py-1 space-y-0.5 border-l-2 border-slate-100 ml-5 mt-1">
                <button
                  onClick={() => setCurrentView("plan-cuentas")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    currentView === "plan-cuentas"
                      ? "bg-[#fff7ed] text-[#f6821f] font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Plan de cuentas
                </button>
                <button
                  onClick={() => setCurrentView("transacciones")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    currentView === "transacciones"
                      ? "bg-[#fff7ed] text-[#f6821f] font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Transacciones bancarias
                </button>
                <button
                  onClick={() => setCurrentView("macola-sync")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    currentView === "macola-sync"
                      ? "bg-[#fff7ed] text-[#f6821f] font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Transacciones de integración
                </button>
              </div>
            )}
          </div>

          {/* Clientes */}
          <button
            onClick={() => setCurrentView("clientes")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              currentView === "clientes"
                ? "bg-[#fff7ed] text-[#f6821f] font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {!sidebarCollapsed && <span>Clientes ({customers.length})</span>}
          </button>

          {/* Proveedores */}
          <button
            onClick={() => setCurrentView("proveedores")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              currentView === "proveedores"
                ? "bg-[#fff7ed] text-[#f6821f] font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {!sidebarCollapsed && <span>Proveedores ({vendors.length})</span>}
          </button>

          {/* Inventario */}
          <button
            onClick={() => setCurrentView("inventario")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              currentView === "inventario"
                ? "bg-[#fff7ed] text-[#f6821f] font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {!sidebarCollapsed && <span>Inventario ({inventory.length})</span>}
          </button>

          {/* Configuración */}
          <button
            onClick={() => setCurrentView("configuracion")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              currentView === "configuracion"
                ? "bg-[#fff7ed] text-[#f6821f] font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!sidebarCollapsed && <span>Configuración</span>}
          </button>
        </nav>

        {/* Footer / User Profile */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#f6821f] text-white flex items-center justify-center font-bold text-xs shrink-0">
                WA
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <p className="font-semibold text-slate-800 text-xs truncate">Administrador</p>
                  <p className="text-[10px] text-slate-500 truncate">admin@waynetrademarkhn.com</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ===================== MAIN WORKSPACE ===================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer md:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 capitalize">
                  {currentView === "dashboard" && "Resumen Ejecutivo"}
                  {currentView === "plan-cuentas" && "Contabilidad / Plan de Cuentas"}
                  {currentView === "transacciones" && "Contabilidad / Transacciones Bancarias"}
                  {currentView === "macola-sync" && "Contabilidad / Transacciones de Integración"}
                  {currentView === "clientes" && "Directorio de Clientes"}
                  {currentView === "proveedores" && "Directorio de Proveedores"}
                  {currentView === "inventario" && "Control Maestro de Inventario"}
                  {currentView === "configuracion" && "Configuración del Sistema"}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Conectado
                </span>
              </div>
              <p className="text-xs text-slate-500">Wayne Trademark Honduras</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden sm:block">
              <input
                type="text"
                placeholder="Buscar registros..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20 shadow-xs"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button
              onClick={loadDashboardData}
              title="Sincronizar datos"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer text-xs font-medium flex items-center gap-1.5 shadow-xs"
            >
              <svg className={`w-3.5 h-3.5 text-[#f6821f] ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 w-full">
          {/* ================= VIEW: DASHBOARD ================= */}
          {currentView === "dashboard" && (
            <>
              {/* Quick Actions Bar (Crear acciones) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs w-full">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
                  <span className="font-bold text-slate-800 text-xs shrink-0 tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f6821f]"></span>
                    Crear acciones
                  </span>
                  <div className="h-4 w-px bg-slate-200 shrink-0"></div>
                  <div className="flex items-center gap-2 shrink-0">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-[#f6821f] text-slate-700 hover:text-[#f6821f] hover:bg-[#fff7ed]/50 text-xs font-medium transition cursor-pointer shadow-2xs whitespace-nowrap bg-white"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Metric Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl">
                {/* Plan de cuentas */}
                <div
                  onClick={() => setCurrentView("plan-cuentas")}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#f6821f] transition cursor-pointer shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan de Cuentas</span>
                    <span className="p-2 rounded-xl bg-[#fff7ed] text-[#f6821f]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{accounts.length}</div>
                  <p className="text-xs text-slate-500 mt-1">Cuentas contables activas</p>
                </div>

                {/* Clientes */}
                <div
                  onClick={() => setCurrentView("clientes")}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#f6821f] transition cursor-pointer shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clientes</span>
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{customers.length}</div>
                  <p className="text-xs text-slate-500 mt-1">Con códigos de Macola</p>
                </div>

                {/* Proveedores */}
                <div
                  onClick={() => setCurrentView("proveedores")}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#f6821f] transition cursor-pointer shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proveedores</span>
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{vendors.length}</div>
                  <p className="text-xs text-slate-500 mt-1">Socios comerciales registrados</p>
                </div>

                {/* Valoración Inventario */}
                <div
                  onClick={() => setCurrentView("inventario")}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#f6821f] transition cursor-pointer shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valoración Inventario</span>
                    <span className="p-2 rounded-xl bg-[#fff7ed] text-[#f6821f]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-[#f6821f]">
                    ${totalInventoryValuation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{totalInventoryUnits} unidades en stock</p>
                </div>
              </div>

              {/* ================= SECTION: RESUMEN DE LA EMPRESA ================= */}
              <div className="space-y-3 max-w-6xl">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Resumen de la empresa</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1: Pérdidas y Ganancias */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">PÉRDIDAS Y GANANCIAS</span>
                        <button
                          onClick={() => setShowPnL(!showPnL)}
                          className="text-xs font-medium text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
                        >
                          {showPnL ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 leading-snug mb-8">
                        Consulta lo que ganas y lo que gastas en todas tus cuentas
                      </h3>

                      {showPnL && (
                        <div className="space-y-6 my-4">
                          <div>
                            <div className="text-xl font-bold text-slate-900 mb-1">$9.611</div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-600 font-medium w-16">Ingreso</span>
                              <div className="flex-1">
                                <div className="h-6 rounded-sm bg-[#00c853] w-[70%] transition-all"></div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-xl font-bold text-slate-900 mb-1">$6.611</div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-600 font-medium w-16">Gastos</span>
                              <div className="flex-1">
                                <div className="h-6 rounded-sm bg-[#00796b] w-[95%] transition-all"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-6">
                      <button className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-medium transition cursor-pointer hover:bg-slate-50 text-center">
                        Transfiere transacciones automática
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Gastos */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="mb-2">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">GASTOS</span>
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 leading-snug mb-8">
                        Ve a dónde va tu dinero
                      </h3>

                      <div className="flex items-center justify-center gap-8 my-6">
                        {/* Donut Chart */}
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="13"
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth="5"
                            />
                          </svg>
                        </div>

                        {/* Legend */}
                        <div className="space-y-2 text-xs text-slate-400 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>--</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>--</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>--</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>--</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>--</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-medium transition cursor-pointer hover:bg-slate-50 text-center">
                        Transfiere transacciones automática
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">Accesos Rápidos de Contabilidad</h2>
                    <span className="text-xs text-[#f6821f] font-medium cursor-pointer hover:underline" onClick={() => setCurrentView("plan-cuentas")}>
                      Ver todo →
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <button
                      onClick={() => setCurrentView("plan-cuentas")}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#f6821f] text-left transition cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800 block mb-1">Plan de cuentas</span>
                      <span className="text-slate-500 text-[11px] block">Catálogo y códigos contables</span>
                    </button>
                    <button
                      onClick={() => setCurrentView("transacciones")}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#f6821f] text-left transition cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800 block mb-1">Transacciones bancarias</span>
                      <span className="text-slate-500 text-[11px] block">Libro diario y movimientos</span>
                    </button>
                    <button
                      onClick={() => setCurrentView("macola-sync")}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#f6821f] text-left transition cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800 block mb-1">Integración Macola</span>
                      <span className="text-slate-500 text-[11px] block">Estado de migración</span>
                    </button>
                    <button
                      onClick={() => setCurrentView("inventario")}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#f6821f] text-left transition cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800 block mb-1">Inventario</span>
                      <span className="text-slate-500 text-[11px] block">Costos y precios por SKU</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">Infraestructura del Sistema</h2>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">Motor de Base de Datos</span>
                      <span className="text-emerald-700 font-mono font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">PostgreSQL 17.6</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">Cliente ORM</span>
                      <span className="text-[#f6821f] font-mono font-medium bg-[#fff7ed] px-2 py-0.5 rounded border border-[#fed7aa]">Prisma 6.19.3</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">Organización</span>
                      <span className="text-slate-800 font-medium">Wayne Trademark Honduras</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= VIEW: PLAN DE CUENTAS ================= */}
          {currentView === "plan-cuentas" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-sm text-slate-900">Plan de Cuentas Contables ({filteredAccounts.length})</h2>
                  <p className="text-xs text-slate-500">Catálogo estándar con numeración 1000–6000</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Código</th>
                      <th className="p-3.5">Nombre de la Cuenta</th>
                      <th className="p-3.5">Tipo</th>
                      <th className="p-3.5">Moneda</th>
                      <th className="p-3.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono text-[#f6821f] font-semibold">{acc.code}</td>
                        <td className="p-3.5 font-medium text-slate-900">{acc.name}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                            {acc.type}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium">{acc.currency}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${acc.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                            {acc.isActive ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">No se encontraron cuentas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= VIEW: TRANSACCIONES BANCARIAS ================= */}
          {currentView === "transacciones" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-slate-900">Transacciones Bancarias &amp; Libro Diario</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Control de cobros, pagos a proveedores y transferencias</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Módulo de Registro
                </span>
              </div>

              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#fff7ed] text-[#f6821f] flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm text-slate-800">Módulo en Preparación</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  El libro diario se nutre de las cuentas configuradas en el <strong>Plan de cuentas</strong> y los registros de clientes y proveedores.
                </p>
              </div>
            </div>
          )}

          {/* ================= VIEW: TRANSACCIONES DE INTEGRACIÓN ================= */}
          {currentView === "macola-sync" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-slate-900">Transacciones de Integración Macola</h2>
                  <p className="text-xs text-slate-500">Historial y estado de sincronización de datos con Macola</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Sincronización Habilitada
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">Sincronización de Clientes Macola</span>
                    <span className="text-slate-500 text-[11px]">{customers.length} registros con código tracking</span>
                  </div>
                  <span className="text-emerald-700 font-medium">Sincronizado</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">Sincronización de Proveedores Macola</span>
                    <span className="text-slate-500 text-[11px]">{vendors.length} registros con código tracking</span>
                  </div>
                  <span className="text-emerald-700 font-medium">Sincronizado</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">Catálogo Maestro de SKUs</span>
                    <span className="text-slate-500 text-[11px]">{inventory.length} artículos enlazados</span>
                  </div>
                  <span className="text-emerald-700 font-medium">Sincronizado</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: CLIENTES ================= */}
          {currentView === "clientes" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-sm text-slate-900">Directorio de Clientes ({filteredCustomers.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Código Macola</th>
                      <th className="p-3.5">Nombre de Empresa / Cliente</th>
                      <th className="p-3.5">Correo Electrónico</th>
                      <th className="p-3.5">Teléfono</th>
                      <th className="p-3.5">Dirección</th>
                      <th className="p-3.5">Moneda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono text-[#f6821f] font-semibold">{c.macolaCode || "—"}</td>
                        <td className="p-3.5 font-medium text-slate-900">{c.name}</td>
                        <td className="p-3.5 text-slate-500">{c.email || "—"}</td>
                        <td className="p-3.5 text-slate-500">{c.phone || "—"}</td>
                        <td className="p-3.5 text-slate-500 truncate max-w-xs">{c.address || "—"}</td>
                        <td className="p-3.5 font-medium">{c.currency}</td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">No se encontraron clientes</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= VIEW: PROVEEDORES ================= */}
          {currentView === "proveedores" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-sm text-slate-900">Directorio de Proveedores ({filteredVendors.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Código Macola</th>
                      <th className="p-3.5">Proveedor</th>
                      <th className="p-3.5">Correo</th>
                      <th className="p-3.5">Teléfono</th>
                      <th className="p-3.5">Dirección</th>
                      <th className="p-3.5">Moneda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVendors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono text-[#f6821f] font-semibold">{v.macolaCode || "—"}</td>
                        <td className="p-3.5 font-medium text-slate-900">{v.name}</td>
                        <td className="p-3.5 text-slate-500">{v.email || "—"}</td>
                        <td className="p-3.5 text-slate-500">{v.phone || "—"}</td>
                        <td className="p-3.5 text-slate-500 truncate max-w-xs">{v.address || "—"}</td>
                        <td className="p-3.5 font-medium">{v.currency}</td>
                      </tr>
                    ))}
                    {filteredVendors.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">No se encontraron proveedores</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= VIEW: INVENTARIO ================= */}
          {currentView === "inventario" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-sm text-slate-900">Control Maestro de Inventario ({filteredInventory.length})</h2>
                  <p className="text-xs text-slate-500">Catálogo de SKUs, existencias y costos unitarios</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">SKU</th>
                      <th className="p-3.5">Descripción del Artículo</th>
                      <th className="p-3.5 text-right">Existencias</th>
                      <th className="p-3.5 text-right">Costo Unitario</th>
                      <th className="p-3.5 text-right">Precio de Venta</th>
                      <th className="p-3.5 text-right">Valoración Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-mono text-[#f6821f] font-semibold">{item.sku}</td>
                        <td className="p-3.5 font-medium text-slate-900">{item.description}</td>
                        <td className="p-3.5 text-right font-mono font-medium">{item.quantity}</td>
                        <td className="p-3.5 text-right font-mono font-medium">${item.cost.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-medium">${item.price.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono text-slate-900 font-bold">
                          ${(item.quantity * item.cost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">No se encontraron artículos en inventario</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= VIEW: CONFIGURACIÓN ================= */}
          {currentView === "configuracion" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h2 className="font-bold text-base text-slate-900">Configuración General</h2>
                <p className="text-xs text-slate-500">Parámetros de acceso y credenciales administrativas</p>
              </div>

              <div className="space-y-4 max-w-xl text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre de la Organización</label>
                  <input
                    type="text"
                    disabled
                    value="Wayne Trademark Honduras"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo de Administrador</label>
                  <input
                    type="email"
                    disabled
                    value="admin@waynetrademarkhn.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold cursor-pointer transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= MODAL OVERLAY ================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close button */}
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal: AGREGAR CLIENTE */}
            {activeModal === "agregar-cliente" && (
              <div>
                <div className="mb-4">
                  <span className="text-[11px] font-semibold text-[#f6821f] uppercase tracking-wider">Acción Rápida</span>
                  <h3 className="text-lg font-bold text-slate-900">Agregar Nuevo Cliente</h3>
                  <p className="text-xs text-slate-500">Registrar cliente con código Macola opcional en la base de datos.</p>
                </div>

                {modalError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    {modalError}
                  </div>
                )}
                {modalSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    {modalSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nombre de la Empresa / Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Distribuidora Textil S.A."
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Código Macola</label>
                      <input
                        type="text"
                        placeholder="Ej. CUS-009"
                        value={customerForm.macolaCode}
                        onChange={(e) => setCustomerForm({ ...customerForm, macolaCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Moneda</label>
                      <select
                        value={customerForm.currency}
                        onChange={(e) => setCustomerForm({ ...customerForm, currency: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="HNL">HNL (L)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        placeholder="contacto@cliente.com"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        placeholder="+504 2550-0000"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dirección Física</label>
                    <input
                      type="text"
                      placeholder="San Pedro Sula, Honduras"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-md shadow-[#f6821f]/20 disabled:opacity-50"
                    >
                      {modalLoading ? "Guardando..." : "Guardar Cliente"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal: AGREGAR PROVEEDOR */}
            {activeModal === "agregar-proveedor" && (
              <div>
                <div className="mb-4">
                  <span className="text-[11px] font-semibold text-[#f6821f] uppercase tracking-wider">Acción Rápida</span>
                  <h3 className="text-lg font-bold text-slate-900">Agregar Nuevo Proveedor</h3>
                  <p className="text-xs text-slate-500">Registrar proveedor con código Macola opcional en la base de datos.</p>
                </div>

                {modalError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    {modalError}
                  </div>
                )}
                {modalSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    {modalSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateVendor} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nombre del Proveedor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Suministros Industriales S.A."
                      value={vendorForm.name}
                      onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Código Macola</label>
                      <input
                        type="text"
                        placeholder="Ej. VEN-009"
                        value={vendorForm.macolaCode}
                        onChange={(e) => setVendorForm({ ...vendorForm, macolaCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Moneda</label>
                      <select
                        value={vendorForm.currency}
                        onChange={(e) => setVendorForm({ ...vendorForm, currency: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="HNL">HNL (L)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        placeholder="ventas@proveedor.com"
                        value={vendorForm.email}
                        onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        placeholder="+504 2550-1111"
                        value={vendorForm.phone}
                        onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dirección Física</label>
                    <input
                      type="text"
                      placeholder="Choloma, Cortés, Honduras"
                      value={vendorForm.address}
                      onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-md shadow-[#f6821f]/20 disabled:opacity-50"
                    >
                      {modalLoading ? "Guardando..." : "Guardar Proveedor"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal: OTRAS ACCIONES */}
            {activeModal !== "agregar-cliente" && activeModal !== "agregar-proveedor" && (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fff7ed] text-[#f6821f] border border-[#fed7aa] flex items-center justify-center mx-auto shadow-xs">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 capitalize">
                    {quickActions.find((a) => a.id === activeModal)?.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Acción configurada para Wayne Trademark Honduras. Este módulo se integrará con las cuentas contables y facturas del sistema.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-6 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold cursor-pointer transition shadow-md shadow-[#f6821f]/20"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
