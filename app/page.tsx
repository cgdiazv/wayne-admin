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

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "accounts" | "customers" | "vendors" | "inventory">("overview");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
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

  // Filtered views
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#fff7ed] border border-[#f6821f]/30 flex items-center justify-center font-bold text-[#f6821f] text-lg shadow-xs">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-900 tracking-tight">Wayne Admin</h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live &amp; Connected
              </span>
            </div>
            <p className="text-xs text-slate-500">Wayne Trademark Honduras</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            title="Refresh database records"
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition cursor-pointer text-xs font-medium flex items-center gap-1.5"
          >
            <svg className={`w-3.5 h-3.5 text-[#f6821f] ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Sync</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 transition cursor-pointer text-xs font-medium"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Accounts */}
          <div
            onClick={() => setActiveTab("accounts")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              activeTab === "accounts"
                ? "bg-white border-[#f6821f] ring-2 ring-[#f6821f]/20 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chart of Accounts</span>
              <span className="p-2 rounded-xl bg-[#fff7ed] text-[#f6821f]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{accounts.length}</div>
            <p className="text-xs text-slate-500 mt-1">General ledger master codes</p>
          </div>

          {/* Card 2: Customers */}
          <div
            onClick={() => setActiveTab("customers")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              activeTab === "customers"
                ? "bg-white border-[#f6821f] ring-2 ring-[#f6821f]/20 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customers</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{customers.length}</div>
            <p className="text-xs text-slate-500 mt-1">Macola integrated clients</p>
          </div>

          {/* Card 3: Vendors */}
          <div
            onClick={() => setActiveTab("vendors")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              activeTab === "vendors"
                ? "bg-white border-[#f6821f] ring-2 ring-[#f6821f]/20 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendors</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{vendors.length}</div>
            <p className="text-xs text-slate-500 mt-1">Suppliers &amp; Freight Partners</p>
          </div>

          {/* Card 4: Inventory */}
          <div
            onClick={() => setActiveTab("inventory")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              activeTab === "inventory"
                ? "bg-white border-[#f6821f] ring-2 ring-[#f6821f]/20 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Valuation</span>
              <span className="p-2 rounded-xl bg-[#fff7ed] text-[#f6821f]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </span>
            </div>
            <div className="text-3xl font-bold text-[#f6821f]">
              ${totalInventoryValuation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">{totalInventoryUnits} units across {inventory.length} SKUs</p>
          </div>
        </div>

        {/* Navigation Tabs & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1.5 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "overview" ? "bg-[#f6821f] text-white shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("accounts")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "accounts" ? "bg-[#f6821f] text-white shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Accounts ({accounts.length})
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "customers" ? "bg-[#f6821f] text-white shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Customers ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab("vendors")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "vendors" ? "bg-[#f6821f] text-white shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Vendors ({vendors.length})
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "inventory" ? "bg-[#f6821f] text-white shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Inventory ({inventory.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f] focus:ring-2 focus:ring-[#f6821f]/20 shadow-xs"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tab Content Display */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">System Infrastructure</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-slate-700 font-medium">Production Database Engine</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-mono font-medium">PostgreSQL 17.6 Connected</span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f6821f]"></span>
                    <span className="text-slate-700 font-medium">Prisma ORM Client</span>
                  </div>
                  <span className="text-xs text-[#f6821f] font-mono font-medium">v6.19.3 (Singleton Mode)</span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-slate-700 font-medium">Organization</span>
                  </div>
                  <span className="text-xs text-slate-600 font-medium">Wayne Trademark Honduras</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs uppercase font-semibold text-slate-500 tracking-wider mb-2">Available API Endpoints</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">GET/POST /api/accounts</div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">GET/POST /api/customers</div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">GET/POST /api/vendors</div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">GET/POST /api/inventory</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">CLI Import Utility</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Run batch migrations using the built-in command line utility:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300 space-y-1 overflow-x-auto shadow-inner">
                <div>npx tsx scripts/import-data.ts customers &lt;file.csv&gt;</div>
                <div>npx tsx scripts/import-data.ts vendors &lt;file.csv&gt;</div>
                <div>npx tsx scripts/import-data.ts inventory &lt;file.csv&gt;</div>
                <div>npx tsx scripts/import-data.ts accounts &lt;file.csv&gt;</div>
              </div>
              <p className="text-[11px] text-slate-500">
                Supports automatic Macola code upserting and duplicate avoidance.
              </p>
            </div>
          </div>
        )}

        {/* Tab Content: Accounts */}
        {activeTab === "accounts" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-slate-900">Chart of Accounts ({filteredAccounts.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Account Name</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Currency</th>
                    <th className="p-3.5">Status</th>
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
                          {acc.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">No accounts match your query</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Customers */}
        {activeTab === "customers" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-slate-900">Customers ({filteredCustomers.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Macola Code</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5">Address</th>
                    <th className="p-3.5">Currency</th>
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
                      <td colSpan={6} className="p-8 text-center text-slate-400">No customers found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Vendors */}
        {activeTab === "vendors" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-slate-900">Vendors ({filteredVendors.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Macola Code</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5">Address</th>
                    <th className="p-3.5">Currency</th>
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
                      <td colSpan={6} className="p-8 text-center text-slate-400">No vendors found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Inventory */}
        {activeTab === "inventory" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-slate-900">Inventory Master ({filteredInventory.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5 text-right">Qty</th>
                    <th className="p-3.5 text-right">Unit Cost</th>
                    <th className="p-3.5 text-right">Selling Price</th>
                    <th className="p-3.5 text-right">Total Valuation</th>
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
                      <td colSpan={6} className="p-8 text-center text-slate-400">No inventory items found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
