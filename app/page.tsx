"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  balance?: number;
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

type BankAccount = {
  id: string;
  name: string;
  accountNumber: string;
  type: string;
  currency: string;
  bankBalance: number;
  bookBalance: number;
  lastUpdated: string;
  status: string;
  color: string;
  pendingCount?: number;
};

type BankTransaction = {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  payee: string;
  type: string;
  amount: number;
  suggestedAccount: string;
  ruleApplied: string | null;
  status: string;
  bankAccount?: {
    id: string;
    name: string;
    accountNumber: string;
    color: string;
  };
};

type BankRule = {
  id: string;
  name: string;
  condition: string;
  targetAccount: string;
  autoConfirm: boolean;
  active: boolean;
};

type NavItem = "dashboard" | "plan-cuentas" | "transacciones" | "macola-sync" | "clientes" | "proveedores" | "inventario" | "reportes" | "configuracion";

export default function AdminDashboard() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<NavItem>("dashboard");
  const [contabilidadOpen, setContabilidadOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPnL, setShowPnL] = useState(true);
  const [showGastos, setShowGastos] = useState(true);
  const [hideConfirmWidget, setHideConfirmWidget] = useState<"pnl" | "gastos" | null>(null);
  const [visibleWidgets, setVisibleWidgets] = useState({
    pnl: true,
    gastos: true,
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Plan de cuentas dedicated states
  const [accountsSearch, setAccountsSearch] = useState("");
  const [accountsTypeFilter, setAccountsTypeFilter] = useState("Todo");
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    code: "",
    name: "",
    type: "Efectivo y equivalentes de efectivo",
    detailType: "Banco",
    isSubAccount: false,
    parentAccountId: "",
    description: "",
    isLocked: false,
    currency: "USD",
    balance: 0,
    isActive: true,
  });
  const [accountModalLoading, setAccountModalLoading] = useState(false);
  const [accountModalError, setAccountModalError] = useState("");
  const [accountModalSuccess, setAccountModalSuccess] = useState("");
  const [showBlockTooltip, setShowBlockTooltip] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showAccountTypeTooltip, setShowAccountTypeTooltip] = useState(false);

  // Banking & Automation State
  const [bankSubTab, setBankSubTab] = useState<"porRevisar" | "categorizadas" | "excluidas" | "reglas">("porRevisar");
  const [selectedBankId, setSelectedBankId] = useState<string>("all");
  const [showConnectBankModal, setShowConnectBankModal] = useState(false);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [bankSyncing, setBankSyncing] = useState(false);
  const [bankToastNotification, setBankToastNotification] = useState("");

  const [connectedBanks, setConnectedBanks] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [automationRules, setAutomationRules] = useState<BankRule[]>([]);

  // Connect bank modal form state
  const [connectBankForm, setConnectBankForm] = useState({
    institution: "Banco Ficohsa",
    accountType: "Cuenta de cheques empresarial",
    accountNumber: "",
    currency: "USD",
    syncFrequency: "Automática cada hora",
  });
  const [connectBankLoading, setConnectBankLoading] = useState(false);
  const [connectBankSuccess, setConnectBankSuccess] = useState("");

  // New rule modal form state
  const [newRuleForm, setNewRuleForm] = useState({
    name: "",
    condition: "",
    targetAccount: "5000 - Cost of Goods Sold (Costo de Ventas)",
    autoConfirm: false,
  });

  // Logo upload state & ref
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Check local storage for instant initial display
    try {
      const savedLogo = localStorage.getItem("wayne_company_logo");
      if (savedLogo) {
        setCompanyLogo(savedLogo);
      }
    } catch {
      // ignore storage error
    }

    // 2. Load persistent company data from PostgreSQL database
    fetch("/api/company")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setCompanySettings({
            nombre: res.data.nombre || "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
            direccion: res.data.direccion || "ZIP Búfalo, Villanueva, Cortés 21100",
            email: res.data.email || "R.mondragon@waynetrademarkhn.com",
            telefono: res.data.telefono || "+50494522666",
            sitioWeb: res.data.sitioWeb || "Ninguno indicado",
            sector: res.data.sector || "Manufactura y Producción Industrial (Manufacturing)",
            nombreLegal: res.data.nombreLegal || "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
            taxId: res.data.taxId || "05019008183490",
            tipoEmpresa: res.data.tipoEmpresa || "Sociedad anónima (pequeña empresa) con dos o más propietarios",
            domicilioLegal: res.data.domicilioLegal || "Zip Búfalo Edificio 1B, Villanueva, Cortés 21101",
            emailCliente: res.data.emailCliente || "R.mondragon@waynetrademarkhn.com",
            direccionCliente: res.data.direccionCliente || "Ninguno indicado",
          });

          if (res.data.logoUrl) {
            setCompanyLogo(res.data.logoUrl);
            try {
              localStorage.setItem("wayne_company_logo", res.data.logoUrl);
            } catch {
              // ignore
            }
          }
        }
      })
      .catch((err) => console.error("Error loading company settings from DB:", err));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("El archivo excede el tamaño máximo permitido de 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCompanyLogo(result);
        try {
          localStorage.setItem("wayne_company_logo", result);
        } catch {
          // ignore
        }

        // Persist logo to PostgreSQL database
        try {
          await fetch("/api/company", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logoUrl: result }),
          });
        } catch (err) {
          console.error("Error saving logo in DB:", err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setCompanyLogo(null);
    try {
      localStorage.removeItem("wayne_company_logo");
    } catch {
      // ignore
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Persist removal in PostgreSQL database
    try {
      await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: null }),
      });
    } catch (err) {
      console.error("Error removing logo from DB:", err);
    }
  };

  // Configuration module states (Matching screenshot)
  const COMPANY_TYPE_OPTIONS = [
    "Propietario único",
    "Sociedad colectiva o empresa privada de responsabilidad limitada",
    "Sociedad anónima (pequeña empresa) con dos o más propietarios",
    "Sociedad anónima con uno o más accionistas",
    "Organización sin fines de lucro",
    "Responsabilidad limitada",
    "Tengo dudas/otro/ninguno",
  ];

  const BUSINESS_SECTOR_OPTIONS = [
    "Manufactura y Producción Industrial (Manufacturing)",
    "Imprenta, Empaque y Artes Gráficas (Printing & Packaging)",
    "Maquila, Textil y Confección",
    "Comercio Mayorista y Distribución",
    "Comercio Minorista (Retail) y Tiendas",
    "Transporte, Logística y Almacenamiento",
    "Construcción, Ingeniería e Inmobiliaria",
    "Agricultura, Agroindustria, Silvicultura y Pesca",
    "Tecnología, Desarrollo de Software y Telecomunicaciones",
    "Servicios Profesionales, Científicos y Técnicos",
    "Servicios Financieros, Seguros y Contabilidad",
    "Salud, Farmacéutica y Equipos Médicos",
    "Hotelería, Turismo, Restaurantes y Catering",
    "Educación, Capacitación y Formación",
    "Energía, Minería, Petróleo, Gas y Renovables",
    "Medios de Comunicación, Publicidad y Marketing",
    "Servicios Administrativos, Seguridad y Apoyo Operativo",
    "Arte, Entretenimiento y Recreación",
    "Organizaciones Sin Fines de Lucro y Asociaciones",
    "Otro sector / No especificado",
  ];

  const [configSubTab, setConfigSubTab] = useState<
    "empresa" | "reportes" | "contabilidad" | "ventas" | "gastos" | "horas" | "monedas" | "avanzadas"
  >("empresa");

  const [companySettings, setCompanySettings] = useState({
    nombre: "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
    direccion: "ZIP Búfalo, Villanueva, Cortés 21100",
    email: "R.mondragon@waynetrademarkhn.com",
    telefono: "+50494522666",
    sitioWeb: "Ninguno indicado",
    sector: "Manufactura y Producción Industrial (Manufacturing)",
    // Legal
    nombreLegal: "WAYNE TRADEMARK PRINTING AND PACKAGING DE HONDURAS S DE RL",
    taxId: "05019008183490",
    tipoEmpresa: "Sociedad anónima (pequeña empresa) con dos o más propietarios",
    domicilioLegal: "Zip Búfalo Edificio 1B, Villanueva, Cortés 21101",
    // Contacto del cliente
    emailCliente: "R.mondragon@waynetrademarkhn.com",
    direccionCliente: "Ninguno indicado",
  });

  // Report customization state (Configuración -> Reportes)
  const [showReportBanner, setShowReportBanner] = useState(true);
  const [reportAccordions, setReportAccordions] = useState<{ [key: string]: boolean }>({
    encabezado: true,
    piePagina: false,
    filasAgrupadas: false,
    celdasVacias: false,
    lineasCuadricula: false,
    numero: false,
    ver: false,
  });
  // Encabezado controls
  const [reportHeaderLogo, setReportHeaderLogo] = useState(false);
  const [reportHeaderPeriod, setReportHeaderPeriod] = useState(false);
  const [reportHeaderLegalName, setReportHeaderLegalName] = useState(false);
  const [reportHeaderAlignment, setReportHeaderAlignment] = useState<"Izquierda" | "Centro" | "Derecha">("Centro");

  // Pie de página controls
  const [reportFooterDate, setReportFooterDate] = useState(false);
  const [reportFooterTime, setReportFooterTime] = useState(false);
  const [reportFooterMethod, setReportFooterMethod] = useState(false);
  const [reportFooterAlignment, setReportFooterAlignment] = useState<"Izquierda" | "Centro" | "Derecha">("Centro");

  // Número controls matching screenshot
  const [reportDivideBy1000, setReportDivideBy1000] = useState(false);
  const [reportHideZeroAmounts, setReportHideZeroAmounts] = useState(false);
  const [reportHideCurrencySymbol, setReportHideCurrencySymbol] = useState(false);
  const [reportNegativeNumberFormat, setReportNegativeNumberFormat] = useState<string>("-100");
  const [reportNegativeInRed, setReportNegativeInRed] = useState(false);
  const [reportDecimalMode, setReportDecimalMode] = useState<"round" | "decimals">("decimals");
  const [reportDecimalPlaces, setReportDecimalPlaces] = useState<number>(2);

  const [gridBorderSetting, setGridBorderSetting] = useState<string>("Predeterminado");
  const [reportEmptyCellFormat, setReportEmptyCellFormat] = useState<string>("hyphen");
  const [reportExpandSubaccounts, setReportExpandSubaccounts] = useState(true);
  const [reportShowGroupTotals, setReportShowGroupTotals] = useState(true);
  const [reportCompactView, setReportCompactView] = useState(true);
  const [reportWrapText, setReportWrapText] = useState(true);
  const [reportSavedNotification, setReportSavedNotification] = useState(false);

  const formatReportAmount = (amount: number) => {
    if (amount === 0) {
      if (reportHideZeroAmounts) {
        return "";
      }
      if (reportEmptyCellFormat === "hyphen") {
        return "-";
      }
      if (reportEmptyCellFormat === "blank") {
        return "";
      }
      // If "zero", fallthrough to format as 0.00 according to currency/decimal settings
    }
    let val = amount;
    if (reportDivideBy1000) {
      val = val / 1000;
    }
    const isNegative = val < 0;
    const absVal = Math.abs(val);

    const formattedNumber =
      reportDecimalMode === "round"
        ? Math.round(absVal).toLocaleString("en-US")
        : absVal.toLocaleString("en-US", {
            minimumFractionDigits: reportDecimalPlaces,
            maximumFractionDigits: reportDecimalPlaces,
          });

    const curr = reportHideCurrencySymbol ? "" : "$";

    if (!isNegative) {
      return `${curr}${formattedNumber}`;
    }

    if (reportNegativeNumberFormat === "(100)") {
      return `(${curr}${formattedNumber})`;
    } else if (reportNegativeNumberFormat === "-$100") {
      return `-${curr}${formattedNumber}`;
    } else if (reportNegativeNumberFormat === "100-") {
      return `${curr}${formattedNumber}-`;
    } else {
      return `${curr}-${formattedNumber}`;
    }
  };

  const getReportAmountClass = (amount: number) => {
    if (amount < 0 && reportNegativeInRed) {
      return "font-mono text-rose-600 font-semibold";
    }
    return "font-mono text-slate-900";
  };

  const toggleReportAccordion = (key: string) => {
    setReportAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Configuración de Ventas states matching screenshot
  const [salesSettings, setSalesSettings] = useState({
    // Contenido del formulario de ventas
    preferidofacturaCondiciones: "Net 30",
    metodoEntregaPreferido: "Ninguno",
    envio: false,
    numerosTransaccionesPersonalizados: true,
    fechaServicio: true,
    descuento: false,
    deposito: false,
    etiquetas: true,

    // Productos y servicios
    mostrarColumnaProductoServicio: true,
    mostrarColumnaSku: false,
    activarReglasPrecios: false,
    seguimientoCantidadPrecio: true,
    seguimientoExistenciasInventario: true,
    metodoValoracionInventario: "Seleccionar método",
    metodoRecepcionInventario: "Facturas de proveedores y gastos",
    reconocimientoIngresos: true,

    // Facturación progresiva
    facturacionProgresiva: false,

    // Mensajes
    mensajePredeterminado: "Mensaje de correo electrónico predeterminado que se envía con los formularios de ventas",

    // Recordatorios
    recordatoriosConfig: "Configurar mensajes de correo electrónico de recordatorios",

    // Encuesta posterior a la factura/comentarios
    solicitarSolicitudTrabajo: false,
    solicitarResenas: false,
    solicitarReferencia: false,
    frecuenciaEncuesta: "90 días",

    // Entrega en línea
    entregaEnLineaOpciones: "Opciones de envío por correo electrónico de los formularios de ventas",

    // Resúmenes
    mostrarTablaAntiguedad: true,
  });

  const [editingSalesSection, setEditingSalesSection] = useState<string | null>(null);
  const [salesSavedNotification, setSalesSavedNotification] = useState(false);

  // Configuración de Gastos states matching screenshot
  const [expenseSettings, setExpenseSettings] = useState({
    // Facturas y gastos
    mostrarTablaArticulosGasto: false,
    mostrarCampoEtiquetas: true,
    seguimientoGastosArticulosCliente: false,
    hacerGastosArticulosFacturables: false,
    condicionesPagoProveedores: "Net 30",

    // Órdenes de compra
    usarOrdenesCompra: true,

    // Mensajes
    mensajeOrdenesCompra: "Mensaje de correo electrónico predeterminado que se envía con las órdenes de compra",
  });

  const [editingExpenseSection, setEditingExpenseSection] = useState<string | null>(null);
  const [expenseSavedNotification, setExpenseSavedNotification] = useState(false);

  const [editingConfigKey, setEditingConfigKey] = useState<string | null>(null);
  const [editingConfigLabel, setEditingConfigLabel] = useState<string>("");
  const [editingConfigValue, setEditingConfigValue] = useState<string>("");

  const startEditConfig = (key: keyof typeof companySettings, label: string) => {
    setEditingConfigKey(key);
    setEditingConfigLabel(label);
    setEditingConfigValue(companySettings[key] === "Ninguno indicado" ? "" : companySettings[key]);
  };

  const saveConfigField = async () => {
    if (editingConfigKey) {
      const updatedValue = editingConfigValue.trim() || "Ninguno indicado";
      const fieldKey = editingConfigKey;

      // Optimistic update in UI
      setCompanySettings((prev) => ({
        ...prev,
        [fieldKey]: updatedValue,
      }));
      setEditingConfigKey(null);

      // Persist in PostgreSQL database
      try {
        await fetch("/api/company", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [fieldKey]: updatedValue }),
        });
      } catch (err) {
        console.error("Error updating company setting in DB:", err);
      }
    }
  };

  // Plan de cuentas personalization sidebar states (Matching screenshot)
  const [showConfigSidebar, setShowConfigSidebar] = useState(false);
  const [pageSize, setPageSize] = useState<number>(75);
  const [rowDensity, setRowDensity] = useState<"espacioso" | "acogedor" | "compacto">("acogedor");
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({
    rows: false,
    columns: false,
    preferences: false,
  });
  const toggleSection = (sec: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    code: true, // N.º
    type: true, // Tipo de cuenta
    detailType: true, // Tipo de detalles
    description: true, // Descripción
    currency: true, // Moneda
    bookBalance: true, // Saldo en libros
    bankBalance: true, // Saldo bancario
  });
  const [columnOrder, setColumnOrder] = useState<string[]>([
    "code",
    "type",
    "detailType",
    "description",
    "currency",
    "bookBalance",
    "bankBalance",
  ]);
  const [activateAccountNumbers, setActivateAccountNumbers] = useState(true);
  const [alternateRowColor, setAlternateRowColor] = useState(false);
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(true);
  const [showReportBadges, setShowReportBadges] = useState(false);

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
      const [accRes, cusRes, venRes, invRes, bankRes, txRes, ruleRes] = await Promise.all([
        fetch("/api/accounts").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/vendors").then((r) => r.json()),
        fetch("/api/inventory").then((r) => r.json()),
        fetch("/api/bank-accounts").then((r) => r.json()),
        fetch("/api/bank-transactions").then((r) => r.json()),
        fetch("/api/bank-rules").then((r) => r.json()),
      ]);

      if (accRes.success) setAccounts(accRes.data || []);
      if (cusRes.success) setCustomers(cusRes.data || []);
      if (venRes.success) setVendors(venRes.data || []);
      if (invRes.success) setInventory(invRes.data || []);
      if (bankRes.success) setConnectedBanks(bankRes.data || []);
      if (txRes.success) setBankTransactions(txRes.data || []);
      if (ruleRes.success) setAutomationRules(ruleRes.data || []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBankingData = async () => {
    try {
      const [bankRes, txRes, ruleRes] = await Promise.all([
        fetch("/api/bank-accounts").then((r) => r.json()),
        fetch("/api/bank-transactions").then((r) => r.json()),
        fetch("/api/bank-rules").then((r) => r.json()),
      ]);
      if (bankRes.success) setConnectedBanks(bankRes.data || []);
      if (txRes.success) setBankTransactions(txRes.data || []);
      if (ruleRes.success) setAutomationRules(ruleRes.data || []);
    } catch (err) {
      console.error("Error loading banking data:", err);
    }
  };

  const handleUpdateTransactionStatus = async (txId: string, newStatus: string, toastMsg?: string) => {
    setBankTransactions((prev) =>
      prev.map((item) => (item.id === txId ? { ...item, status: newStatus } : item))
    );
    try {
      await fetch(`/api/bank-transactions/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (toastMsg) {
        setBankToastNotification(toastMsg);
        setTimeout(() => setBankToastNotification(""), 4000);
      }
      loadBankingData();
    } catch (err) {
      console.error("Error updating transaction in DB:", err);
    }
  };

  const handleToggleRuleActive = async (ruleId: string, currentActive: boolean) => {
    const newActive = !currentActive;
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: newActive } : r))
    );
    try {
      await fetch(`/api/bank-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });
    } catch (err) {
      console.error("Error toggling rule in DB:", err);
    }
  };

  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    setAutomationRules((prev) => prev.filter((r) => r.id !== ruleId));
    try {
      await fetch(`/api/bank-rules/${ruleId}`, { method: "DELETE" });
      setBankToastNotification(`Regla "${ruleName}" eliminada de la base de datos.`);
      setTimeout(() => setBankToastNotification(""), 3500);
    } catch (err) {
      console.error("Error deleting rule in DB:", err);
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

  // Currency Formatter: $0,000.00
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Official Account Types and Subtypes Hierarchy
  const ACCOUNT_CATEGORIES: Record<string, string[]> = {
    ACTIVO: [
      "Efectivo y equivalentes de efectivo",
      "Cuentas por cobrar (C/C)",
      "Activos corrientes",
      "Activos fijos",
      "Activos no corrientes",
    ],
    RESPONSABILIDAD: [
      "Tarjeta de crédito",
      "Cuentas por pagar (C/P)",
      "Pasivos corrientes",
      "Pasivos no corrientes",
    ],
    "FONDOS PROPIOS": [
      "Fondos propios del propietario",
    ],
    INGRESOS: [
      "Ingresos",
      "Otros ingresos",
    ],
    GASTO: [
      "Costo de las ventas",
      "Gastos",
      "Otros gastos",
    ],
  };

  const DETAIL_TYPES_MAP: Record<string, string[]> = {
    "Efectivo y equivalentes de efectivo": [
      "Banco",
      "Caja chica",
      "Dinero en efectivo",
      "Dinero recibido sin depositar",
    ],
    "Cuentas por cobrar (C/C)": [
      "Cuentas por cobrar",
    ],
    "Activos corrientes": [
      "Inventario",
      "Pagos anticipados",
      "Gastos pagados por adelantado",
      "Otros activos corrientes",
    ],
    "Activos fijos": [
      "Maquinaria y equipo",
      "Mobiliario y enseres",
      "Vehículos",
      "Edificios",
      "Terrenos",
      "Depreciación acumulada",
    ],
    "Activos no corrientes": [
      "Activos intangibles",
      "Depósitos de garantía",
      "Inversiones a largo plazo",
      "Otros activos no corrientes",
    ],
    "Tarjeta de crédito": [
      "Tarjeta de crédito",
    ],
    "Cuentas por pagar (C/P)": [
      "Cuentas por pagar",
    ],
    "Pasivos corrientes": [
      "Nómina por pagar",
      "Impuestos sobre ventas por pagar",
      "Préstamos a corto plazo",
      "Otros pasivos corrientes",
    ],
    "Pasivos no corrientes": [
      "Hipotecas por pagar",
      "Préstamos a largo plazo",
      "Otros pasivos a largo plazo",
    ],
    "Fondos propios del propietario": [
      "Capital del propietario",
      "Aportaciones del propietario",
      "Retiros del propietario",
      "Ganancias retenidas",
    ],
    "Ingresos": [
      "Ventas de productos",
      "Ingresos por servicios",
      "Descuentos sobre ventas",
    ],
    "Otros ingresos": [
      "Ingresos por intereses",
      "Dividendos",
      "Ganancias cambiarias",
      "Otros ingresos varios",
    ],
    "Costo de las ventas": [
      "Costo de mercancía vendida",
      "Mano de obra directa",
      "Suministros y materiales",
    ],
    "Gastos": [
      "Publicidad y promoción",
      "Alquiler de oficinas",
      "Reparación y mantenimiento",
      "Sueldos y salarios",
      "Servicios públicos",
      "Seguros",
      "Gastos de viaje",
    ],
    "Otros gastos": [
      "Gastos por intereses",
      "Pérdidas cambiarias",
      "Cargos bancarios",
      "Otros gastos varios",
    ],
  };

  const getAccountClassification = (type: string, name: string) => {
    const t = (type || "").trim();
    const n = (name || "").toLowerCase();

    for (const [cat, subTypes] of Object.entries(ACCOUNT_CATEGORIES)) {
      if (subTypes.includes(t)) {
        return { category: cat, accountType: t };
      }
    }

    const upper = t.toUpperCase();
    if (upper === "ASSET" || upper === "ACTIVO") {
      if (n.includes("cash") || n.includes("checking") || n.includes("banco") || n.includes("caja")) {
        return { category: "ACTIVO", accountType: "Efectivo y equivalentes de efectivo" };
      }
      if (n.includes("receivable") || n.includes("cobrar") || n.includes("cliente")) {
        return { category: "ACTIVO", accountType: "Cuentas por cobrar (C/C)" };
      }
      if (n.includes("fijo") || n.includes("equipment") || n.includes("building") || n.includes("machinery")) {
        return { category: "ACTIVO", accountType: "Activos fijos" };
      }
      if (n.includes("non-current") || n.includes("largo plazo") || n.includes("no corriente")) {
        return { category: "ACTIVO", accountType: "Activos no corrientes" };
      }
      return { category: "ACTIVO", accountType: "Activos corrientes" };
    }

    if (upper === "LIABILITY" || upper === "PASIVO" || upper === "RESPONSABILIDAD") {
      if (n.includes("credit card") || n.includes("tarjeta")) {
        return { category: "RESPONSABILIDAD", accountType: "Tarjeta de crédito" };
      }
      if (n.includes("payable") || n.includes("pagar") || n.includes("proveedor")) {
        return { category: "RESPONSABILIDAD", accountType: "Cuentas por pagar (C/P)" };
      }
      if (n.includes("non-current") || n.includes("largo plazo") || n.includes("no corriente") || n.includes("mortgage")) {
        return { category: "RESPONSABILIDAD", accountType: "Pasivos no corrientes" };
      }
      return { category: "RESPONSABILIDAD", accountType: "Pasivos corrientes" };
    }

    if (upper === "EQUITY" || upper === "CAPITAL" || upper === "PATRIMONIO" || upper === "FONDOS PROPIOS") {
      return { category: "FONDOS PROPIOS", accountType: "Fondos propios del propietario" };
    }

    if (upper === "INCOME" || upper === "REVENUE" || upper === "INGRESO" || upper === "INGRESOS") {
      if (n.includes("other") || n.includes("otro") || n.includes("interest") || n.includes("interes")) {
        return { category: "INGRESOS", accountType: "Otros ingresos" };
      }
      return { category: "INGRESOS", accountType: "Ingresos" };
    }

    if (upper === "EXPENSE" || upper === "GASTO" || upper === "GASTOS") {
      if (n.includes("cost of") || n.includes("costo") || n.includes("cogs")) {
        return { category: "GASTO", accountType: "Costo de las ventas" };
      }
      if (n.includes("other") || n.includes("otro")) {
        return { category: "GASTO", accountType: "Otros gastos" };
      }
      return { category: "GASTO", accountType: "Gastos" };
    }

    return { category: "ACTIVO", accountType: "Activos corrientes" };
  };

  // Calculations
  const totalInventoryUnits = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalInventoryValuation = inventory.reduce((sum, item) => sum + (item.quantity || 0) * (item.cost || 0), 0);

  // Dynamic Income and Expenses from DB Accounts
  const incomeAccounts = accounts.filter((a) => {
    if (!a.isActive) return false;
    const t = (a.type || "").toLowerCase();
    const { category } = getAccountClassification(a.type, a.name);
    return t.includes("income") || t.includes("ingreso") || category === "INGRESOS";
  });
  const totalIncome = incomeAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const expenseAccounts = accounts.filter((a) => {
    if (!a.isActive) return false;
    const t = (a.type || "").toLowerCase();
    const { category } = getAccountClassification(a.type, a.name);
    return t.includes("expense") || t.includes("gasto") || category === "GASTO";
  });
  const totalExpenses = expenseAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // Proportions for Pérdidas y Ganancias bar chart
  const maxPnL = Math.max(totalIncome, totalExpenses, 1);
  const incomePercent = totalIncome > 0 ? Math.min(100, Math.max(8, (totalIncome / maxPnL) * 100)) : 0;
  const expensePercent = totalExpenses > 0 ? Math.min(100, Math.max(8, (totalExpenses / maxPnL) * 100)) : 0;

  // Donut chart color palette
  const expenseChartColors = ["#2563eb", "#0097a7", "#6b21a8", "#b91c1c", "#ea580c", "#10b981", "#6366f1", "#d97706"];

  // Calculate dynamic slices for Gastos Donut Chart
  let cumulativeExpenseOffset = 0;
  const expenseSlices = expenseAccounts.map((acc, index) => {
    const bal = Number(acc.balance) || 0;
    const pct = totalExpenses > 0 ? (bal / totalExpenses) * 100 : 0;
    const slice = {
      ...acc,
      color: expenseChartColors[index % expenseChartColors.length],
      percentage: pct,
      offset: cumulativeExpenseOffset,
    };
    cumulativeExpenseOffset += pct;
    return slice;
  });

  // Filters
  const filteredAccounts = accounts.filter((a) => {
    if (!showInactiveAccounts && !a.isActive) return false;
    const term = accountsSearch ? accountsSearch.toLowerCase() : search.toLowerCase();
    const matchesSearch = !term || a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term);
    const { category, accountType } = getAccountClassification(a.type, a.name);
    const matchesType =
      accountsTypeFilter === "Todo" ||
      category === accountsTypeFilter ||
      accountType === accountsTypeFilter;
    return matchesSearch && matchesType;
  });

  const displayedAccounts = filteredAccounts.slice(0, pageSize);

  const getDetailType = (type: string, name: string): string => {
    const n = (name || "").toLowerCase();
    const { accountType } = getAccountClassification(type, name);
    const list = DETAIL_TYPES_MAP[accountType] || [accountType];
    const match = list.find((item) => n.includes(item.toLowerCase()));
    return match || list[0];
  };

  const handleExportAccounts = () => {
    const headers = ["Codigo,Nombre,Tipo,Moneda,Estado"];
    const rows = filteredAccounts.map(
      (a) => `"${a.code}","${a.name.replace(/"/g, '""')}","${a.type}","${a.currency}","${a.isActive ? "Activa" : "Inactiva"}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `plan_de_cuentas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAccounts = () => {
    window.print();
  };

  const handleCreateAccount = async (
    e?: React.FormEvent,
    keepOpenAndNew: boolean = false
  ) => {
    if (e) e.preventDefault();
    setAccountModalLoading(true);
    setAccountModalError("");
    setAccountModalSuccess("");

    try {
      const { category } = getAccountClassification(newAccountForm.type, newAccountForm.name);
      const assignedCode =
        newAccountForm.code.trim() ||
        (category === "ACTIVO"
          ? `1${100 + accounts.length}`
          : category === "RESPONSABILIDAD"
          ? `2${100 + accounts.length}`
          : category === "FONDOS PROPIOS"
          ? `3${100 + accounts.length}`
          : category === "INGRESOS"
          ? `4${100 + accounts.length}`
          : `5${100 + accounts.length}`);

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: assignedCode,
          name: newAccountForm.name.trim(),
          type: newAccountForm.type,
          currency: newAccountForm.currency || "USD",
          balance: Number(newAccountForm.balance) || 0,
          isActive: newAccountForm.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al crear la cuenta contable");
      }

      setAccounts((prev) => [...prev, data.data].sort((a, b) => a.code.localeCompare(b.code)));
      setAccountModalSuccess("Cuenta contable creada exitosamente");

      if (keepOpenAndNew) {
        setTimeout(() => {
          setAccountModalSuccess("");
          setNewAccountForm({
            code: "",
            name: "",
            type: "Efectivo y equivalentes de efectivo",
            detailType: "Banco",
            isSubAccount: false,
            parentAccountId: "",
            description: "",
            isLocked: false,
            currency: "USD",
            balance: 0,
            isActive: true,
          });
        }, 600);
      } else {
        setTimeout(() => {
          setShowNewAccountModal(false);
          setAccountModalSuccess("");
          setNewAccountForm({
            code: "",
            name: "",
            type: "Efectivo y equivalentes de efectivo",
            detailType: "Banco",
            isSubAccount: false,
            parentAccountId: "",
            description: "",
            isLocked: false,
            currency: "USD",
            balance: 0,
            isActive: true,
          });
        }, 700);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setAccountModalError(msg);
    } finally {
      setAccountModalLoading(false);
    }
  };

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
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {companyLogo ? (
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 shadow-xs overflow-hidden">
                <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#fff7ed] border border-[#f6821f]/30 flex items-center justify-center font-bold text-[#f6821f] text-lg shrink-0 shadow-xs">
                W
              </div>
            )}
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

          {/* Reportes */}
          <button
            onClick={() => setCurrentView("reportes")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              currentView === "reportes"
                ? "bg-[#fff7ed] text-[#f6821f] font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!sidebarCollapsed && <span>Reportes</span>}
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
        <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center justify-between shadow-xs shrink-0">
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
              {/* Quick Actions Bar (Acciones) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs w-full">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
                  <span className="font-bold text-slate-800 text-xs shrink-0 tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f6821f]"></span>
                    Acciones
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
                    {formatCurrency(totalInventoryValuation)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{totalInventoryUnits} unidades en stock</p>
                </div>
              </div>

              {/* ================= SECTION: RESUMEN DE LA EMPRESA ================= */}
              <div className="space-y-3 max-w-6xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Resumen de la empresa</h2>
                  {(!visibleWidgets.pnl || !visibleWidgets.gastos) && (
                    <button
                      onClick={() => setVisibleWidgets({ pnl: true, gastos: true })}
                      className="text-xs font-semibold text-[#f6821f] hover:text-[#e07216] transition cursor-pointer flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Personalizar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1: Pérdidas y Ganancias */}
                  {visibleWidgets.pnl && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">PÉRDIDAS Y GANANCIAS</span>
                          <button
                            onClick={() => setHideConfirmWidget("pnl")}
                            className="text-xs font-medium text-[#f6821f] hover:text-[#e07216] transition cursor-pointer"
                          >
                            Ocultar
                          </button>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 leading-snug mb-8">
                          Consulta lo que ganas y lo que gastas en todas tus cuentas
                        </h3>

                      {showPnL && (
                        <div className="space-y-6 my-4">
                          <div>
                            <div className="text-xl font-bold text-slate-900 mb-1">{formatCurrency(totalIncome)}</div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-600 font-medium w-16">Ingreso</span>
                              <div className="flex-1">
                                <div
                                  className="h-6 rounded-sm bg-[#00c853] transition-all duration-500"
                                  style={{ width: `${incomePercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-xl font-bold text-slate-900 mb-1">{formatCurrency(totalExpenses)}</div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-600 font-medium w-16">Gastos</span>
                              <div className="flex-1">
                                <div
                                  className="h-6 rounded-sm bg-[#00796b] transition-all duration-500"
                                  style={{ width: `${expensePercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                  {/* Card 2: Gastos */}
                  {visibleWidgets.gastos && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">GASTOS</span>
                          <button
                            onClick={() => setHideConfirmWidget("gastos")}
                            className="text-xs font-medium text-[#f6821f] hover:text-[#e07216] transition cursor-pointer"
                          >
                            Ocultar
                          </button>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 leading-snug mb-4">
                          Ve a dónde va tu dinero
                        </h3>

                      {showGastos && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
                          {/* Dynamic Donut Chart */}
                          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                              {/* Background Base Track */}
                              <circle
                                cx="21"
                                cy="21"
                                r="15.9155"
                                fill="none"
                                stroke="#f1f5f9"
                                strokeWidth="7"
                              />
                              {totalExpenses > 0 ? (
                                expenseSlices.map((slice) => {
                                  const pct = slice.percentage;
                                  const dash = Math.max(0, pct > 2 ? pct - 1.5 : pct);
                                  const gap = 100 - dash;
                                  return (
                                    <circle
                                      key={slice.id}
                                      cx="21"
                                      cy="21"
                                      r="15.9155"
                                      fill="none"
                                      stroke={slice.color}
                                      strokeWidth="7"
                                      strokeDasharray={`${dash.toFixed(2)} ${gap.toFixed(2)}`}
                                      strokeDashoffset={(-slice.offset).toFixed(2)}
                                      className="transition-all duration-500"
                                    />
                                  );
                                })
                              ) : (
                                <circle
                                  cx="21"
                                  cy="21"
                                  r="15.9155"
                                  fill="none"
                                  stroke="#cbd5e1"
                                  strokeWidth="7"
                                />
                              )}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                              <span className="text-[10px] text-slate-400 font-medium leading-none">Total</span>
                              <span className="text-xs font-bold text-slate-900 mt-0.5">{formatCurrency(totalExpenses)}</span>
                            </div>
                          </div>

                          {/* Dynamic Legend with real categories from database */}
                          <div className="space-y-2 text-xs text-slate-700 font-medium w-full max-w-xs max-h-52 overflow-y-auto pr-1">
                            {expenseSlices.length > 0 ? (
                              expenseSlices.map((slice) => (
                                <div key={slice.id} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: slice.color }}
                                    ></span>
                                    <span className="truncate max-w-[140px]" title={slice.name}>
                                      {slice.name}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-semibold text-slate-900">
                                      {formatCurrency(slice.balance || 0)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 ml-1.5">
                                      ({slice.percentage.toFixed(0)}%)
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-slate-400 text-xs italic">
                                No hay cuentas de gasto registradas en la base de datos.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
                </div>

                {!visibleWidgets.pnl && !visibleWidgets.gastos && (
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
                    <p className="text-xs text-slate-500">Has ocultado los widgets del resumen de la empresa.</p>
                    <button
                      onClick={() => setVisibleWidgets({ pnl: true, gastos: true })}
                      className="px-4 py-2 rounded-xl border border-[#f6821f] text-[#f6821f] text-xs font-semibold hover:bg-[#fff7ed] transition cursor-pointer"
                    >
                      Personalizar y restaurar widgets
                    </button>
                  </div>
                )}
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
            <div className="space-y-4">
              {/* Header Action Bar (Matching screenshot) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentView("dashboard")}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer w-fit"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Regresar a Dashboard</span>
                </button>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    onClick={handleExportAccounts}
                    className="px-4 py-2 rounded-xl border border-[#f6821f] text-[#f6821f] hover:bg-[#fff7ed] text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    Generar reporte
                  </button>

                  <button
                    onClick={() => setShowNewAccountModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-[#f6821f]/20"
                  >
                    <span>Nueva cuenta</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Toolbar Row (Filters, search, print, export - Matching screenshot) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative min-w-[240px]">
                    <input
                      type="text"
                      placeholder="Filtrar por nombre o número"
                      value={accountsSearch}
                      onChange={(e) => setAccountsSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f]"
                    />
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Type Filter Select */}
                  <div className="relative">
                    <select
                      value={accountsTypeFilter}
                      onChange={(e) => setAccountsTypeFilter(e.target.value)}
                      className="pl-3 pr-8 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium appearance-none focus:outline-none focus:border-[#f6821f] cursor-pointer"
                    >
                      <option value="Todo">Todos los tipos</option>
                      <optgroup label="Categorías Principales">
                        <option value="ACTIVO">ACTIVO (Todo)</option>
                        <option value="RESPONSABILIDAD">RESPONSABILIDAD (Todo)</option>
                        <option value="FONDOS PROPIOS">FONDOS PROPIOS (Todo)</option>
                        <option value="INGRESOS">INGRESOS (Todo)</option>
                        <option value="GASTO">GASTO (Todo)</option>
                      </optgroup>
                      {Object.entries(ACCOUNT_CATEGORIES).map(([cat, types]) => (
                        <optgroup key={cat} label={cat}>
                          {types.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {(accountsSearch || accountsTypeFilter !== "Todo") && (
                    <button
                      onClick={() => {
                        setAccountsSearch("");
                        setAccountsTypeFilter("Todo");
                      }}
                      className="text-xs text-[#f6821f] hover:underline font-medium cursor-pointer"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600">

                  <button
                    onClick={handleExportAccounts}
                    title="Exportar a Excel / CSV"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  <button
                    onClick={handlePrintAccounts}
                    title="Imprimir plan de cuentas"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setShowConfigSidebar(true)}
                    title="Personalizar tabla"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      showConfigSidebar ? "text-[#f6821f] bg-[#fff7ed]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-sm text-slate-900">
                      Catálogo Contable ({displayedAccounts.length} de {filteredAccounts.length})
                    </h2>
                    <p className="text-xs text-slate-500">Plan estándar con cuentas activas en Wayne Trademark Honduras</p>
                  </div>
                  {filteredAccounts.length > pageSize && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Página de {pageSize} registros
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        {columnOrder.map((colKey) => {
                          if (!visibleColumns[colKey]) return null;
                          const cellPadding =
                            rowDensity === "espacioso"
                              ? "py-4 px-4"
                              : rowDensity === "compacto"
                              ? "py-2 px-3"
                              : "py-3 px-3.5";
                          switch (colKey) {
                            case "code":
                              return <th key="code" className={cellPadding}>N.º</th>;
                            case "type":
                              return <th key="type" className={cellPadding}>Tipo de cuenta</th>;
                            case "detailType":
                              return <th key="detailType" className={cellPadding}>Tipo de detalles</th>;
                            case "description":
                              return <th key="description" className={cellPadding}>Descripción</th>;
                            case "currency":
                              return <th key="currency" className={cellPadding}>Moneda</th>;
                            case "bookBalance":
                              return <th key="bookBalance" className={cellPadding}>Saldo contable</th>;
                            case "bankBalance":
                              return <th key="bankBalance" className={cellPadding}>Saldo bancario</th>;
                            default:
                              return null;
                          }
                        })}
                        <th
                          className={
                            rowDensity === "espacioso"
                              ? "py-4 px-4"
                              : rowDensity === "compacto"
                              ? "py-2 px-3"
                              : "py-3 px-3.5"
                          }
                        >
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedAccounts.map((acc, idx) => {
                        const cellPadding =
                          rowDensity === "espacioso"
                            ? "py-4 px-4"
                            : rowDensity === "compacto"
                            ? "py-1.5 px-3"
                            : "py-2.5 px-3.5";
                        const rowBg = alternateRowColor && idx % 2 === 1 ? "bg-slate-50/70" : "bg-white";
                        return (
                          <tr key={acc.id} className={`${rowBg} hover:bg-[#fff7ed]/50 transition`}>
                            {columnOrder.map((colKey) => {
                              if (!visibleColumns[colKey]) return null;
                              switch (colKey) {
                                case "code":
                                  return (
                                    <td key="code" className={`${cellPadding} font-mono font-semibold text-[#f6821f]`}>
                                      {activateAccountNumbers ? acc.code : "—"}
                                    </td>
                                  );
                                case "type": {
                                  const { category, accountType } = getAccountClassification(acc.type, acc.name);
                                  const isER = category === "INGRESOS" || category === "GASTO";
                                  return (
                                    <td key="type" className={cellPadding}>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                                          {accountType}
                                        </span>
                                        {showReportBadges && (
                                          <span className="px-1.5 py-0.5 text-[9px] rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                            {isER ? "ER" : "BG"}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                }
                                case "detailType":
                                  return (
                                    <td key="detailType" className={`${cellPadding} text-slate-600 font-medium`}>
                                      {getDetailType(acc.type, acc.name)}
                                    </td>
                                  );
                                case "description":
                                  return (
                                    <td key="description" className={`${cellPadding} font-medium text-slate-900`}>
                                      {acc.name}
                                    </td>
                                  );
                                case "currency":
                                  return (
                                    <td key="currency" className={`${cellPadding} font-medium text-slate-700`}>
                                      {acc.currency}
                                    </td>
                                  );
                                case "bookBalance":
                                  return (
                                    <td key="bookBalance" className={`${cellPadding} font-mono font-medium text-slate-800`}>
                                      {formatCurrency(acc.balance || 0)}
                                    </td>
                                  );
                                case "bankBalance":
                                  return (
                                    <td key="bankBalance" className={`${cellPadding} font-mono font-medium text-slate-500`}>
                                      {acc.name.toLowerCase().includes("banco") ||
                                      acc.name.toLowerCase().includes("caja") ||
                                      acc.name.toLowerCase().includes("checking") ||
                                      acc.name.toLowerCase().includes("cash")
                                        ? formatCurrency(acc.balance || 0)
                                        : "—"}
                                    </td>
                                  );
                                default:
                                  return null;
                              }
                            })}
                            <td className={cellPadding}>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  acc.isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {acc.isActive ? "Activa" : "Inactiva"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {displayedAccounts.length === 0 && (
                        <tr>
                          <td colSpan={columnOrder.filter((k) => visibleColumns[k]).length + 1} className="p-8 text-center text-slate-400">
                            No se encontraron cuentas contables
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: TRANSACCIONES BANCARIAS & FEEDS ================= */}
          {currentView === "transacciones" && (
            <div className="space-y-6">
              {/* Toast Notification */}
              {bankToastNotification && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in duration-200 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    <span className="font-semibold">{bankToastNotification}</span>
                  </div>
                  <button
                    onClick={() => setBankToastNotification("")}
                    className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Main Top Header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-slate-900">Transacciones Bancarias &amp; Feeds</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      En vivo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Conecta tus bancos institucionales y automatiza la descarga, conciliación y categorización de movimientos.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      setBankSyncing(true);
                      await loadBankingData();
                      setTimeout(() => {
                        setBankSyncing(false);
                        setBankToastNotification("Feeds bancarios sincronizados desde la base de datos.");
                        setTimeout(() => setBankToastNotification(""), 4000);
                      }, 600);
                    }}
                    disabled={bankSyncing}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <svg className={`w-3.5 h-3.5 text-slate-500 ${bankSyncing ? "animate-spin text-[#f6821f]" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{bankSyncing ? "Sincronizando..." : "Actualizar feeds"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBankSubTab("reglas")}
                    className="px-3.5 py-2 rounded-xl border border-[#f6821f] text-[#f6821f] hover:bg-[#fff7ed] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Reglas de automatización</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConnectBankModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Conectar cuenta bancaria</span>
                  </button>
                </div>
              </div>

              {/* Connected Bank Accounts Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card: Todas las cuentas */}
                <div
                  onClick={() => setSelectedBankId("all")}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    selectedBankId === "all"
                      ? "bg-slate-900 border-slate-900 text-white shadow-md"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBankId === "all" ? "text-slate-300" : "text-slate-500"}`}>
                      Visión General
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">Todas las Cuentas</h3>
                    <div className="text-xl font-extrabold mb-1">
                      {formatCurrency(connectedBanks.reduce((sum, b) => sum + (b.bankBalance || 0), 0))}
                    </div>
                    <p className={`text-[11px] ${selectedBankId === "all" ? "text-slate-300" : "text-slate-500"}`}>
                      {bankTransactions.filter((t) => t.status === "porRevisar").length} transacciones por revisar
                    </p>
                  </div>
                </div>

                {/* Individual Bank Cards */}
                {connectedBanks.map((bank) => {
                  const isSelected = selectedBankId === bank.id;
                  const pending = bankTransactions.filter(
                    (t) => (t.bankAccountId === bank.id || (t as unknown as { bankId?: string }).bankId === bank.id) && t.status === "porRevisar"
                  ).length;
                  return (
                    <div
                      key={bank.id}
                      onClick={() => setSelectedBankId(bank.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                        isSelected
                          ? "bg-white border-[#f6821f] ring-2 ring-[#f6821f]/20 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: bank.color }}
                          ></span>
                          <span className="font-bold text-xs text-slate-900 truncate max-w-[120px]">{bank.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">{bank.accountNumber}</span>
                      </div>

                      <div className="space-y-1 my-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-500">Saldo Banco:</span>
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(bank.bankBalance)}</span>
                        </div>
                        <div className="flex items-baseline justify-between text-[11px]">
                          <span className="text-[10px] text-slate-400">En Wayne:</span>
                          <span className="font-medium text-slate-600">{formatCurrency(bank.bookBalance)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{bank.lastUpdated}</span>
                        {pending > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-[#fff7ed] text-[#f6821f] border border-[#fed7aa]">
                            {pending} por revisar
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                            Al día ✓
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Sub-Tabs */}
              <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-semibold">
                <button
                  onClick={() => setBankSubTab("porRevisar")}
                  className={`pb-3 transition flex items-center gap-2 cursor-pointer border-b-2 ${
                    bankSubTab === "porRevisar"
                      ? "border-[#f6821f] text-[#f6821f]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>Por revisar</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    bankSubTab === "porRevisar" ? "bg-[#fff7ed] text-[#f6821f]" : "bg-slate-100 text-slate-600"
                  }`}>
                    {bankTransactions.filter(
                      (t) => t.status === "porRevisar" && (selectedBankId === "all" || t.bankAccountId === selectedBankId || (t as unknown as { bankId?: string }).bankId === selectedBankId)
                    ).length}
                  </span>
                </button>

                <button
                  onClick={() => setBankSubTab("categorizadas")}
                  className={`pb-3 transition flex items-center gap-2 cursor-pointer border-b-2 ${
                    bankSubTab === "categorizadas"
                      ? "border-[#f6821f] text-[#f6821f]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>Categorizadas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    bankSubTab === "categorizadas" ? "bg-[#fff7ed] text-[#f6821f]" : "bg-slate-100 text-slate-600"
                  }`}>
                    {bankTransactions.filter(
                      (t) => t.status === "categorizadas" && (selectedBankId === "all" || t.bankAccountId === selectedBankId || (t as unknown as { bankId?: string }).bankId === selectedBankId)
                    ).length}
                  </span>
                </button>

                <button
                  onClick={() => setBankSubTab("excluidas")}
                  className={`pb-3 transition flex items-center gap-2 cursor-pointer border-b-2 ${
                    bankSubTab === "excluidas"
                      ? "border-[#f6821f] text-[#f6821f]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>Excluidas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    bankSubTab === "excluidas" ? "bg-[#fff7ed] text-[#f6821f]" : "bg-slate-100 text-slate-600"
                  }`}>
                    {bankTransactions.filter(
                      (t) => t.status === "excluidas" && (selectedBankId === "all" || t.bankAccountId === selectedBankId || (t as unknown as { bankId?: string }).bankId === selectedBankId)
                    ).length}
                  </span>
                </button>

                <button
                  onClick={() => setBankSubTab("reglas")}
                  className={`pb-3 transition flex items-center gap-2 cursor-pointer border-b-2 ${
                    bankSubTab === "reglas"
                      ? "border-[#f6821f] text-[#f6821f]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>Reglas de automatización</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    bankSubTab === "reglas" ? "bg-[#fff7ed] text-[#f6821f]" : "bg-slate-100 text-slate-600"
                  }`}>
                    {automationRules.length}
                  </span>
                </button>
              </div>

              {/* TAB 1: POR REVISAR */}
              {bankSubTab === "porRevisar" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-3">
                  {/* Search & Filter bar */}
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type="text"
                        placeholder="Buscar por descripción, proveedor o cliente..."
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f6821f]"
                      />
                      <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Mostrando transacciones de: <strong className="text-slate-800">{selectedBankId === "all" ? "Todas las cuentas" : connectedBanks.find(b => b.id === selectedBankId)?.name}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Fecha</th>
                          <th className="py-3 px-4">Descripción en Extracto Bancario</th>
                          <th className="py-3 px-4">Beneficiario / Pagador</th>
                          <th className="py-3 px-4 text-right">Cobrado (+)</th>
                          <th className="py-3 px-4 text-right">Pagado (-)</th>
                          <th className="py-3 px-4">Cuenta Sugerida / Regla</th>
                          <th className="py-3 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bankTransactions
                          .filter((t) => t.status === "porRevisar")
                          .filter((t) => selectedBankId === "all" || t.bankAccountId === selectedBankId || (t as unknown as { bankId?: string }).bankId === selectedBankId)
                          .filter((t) => !bankSearch || t.description.toLowerCase().includes(bankSearch.toLowerCase()) || t.payee.toLowerCase().includes(bankSearch.toLowerCase()))
                          .map((tx) => {
                            const matchedBank = connectedBanks.find((b) => b.id === (tx.bankAccountId || (tx as unknown as { bankId?: string }).bankId));
                            return (
                              <tr key={tx.id} className="hover:bg-[#fff7ed]/40 transition">
                                <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">{tx.date}</td>
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-slate-900">{tx.description}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {tx.bankAccount?.name || matchedBank?.name || "Banco"} ({tx.bankAccount?.accountNumber || matchedBank?.accountNumber || ""})
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-700">{tx.payee}</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                                  {tx.type === "deposit" ? `+${formatCurrency(tx.amount)}` : "—"}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                                  {tx.type === "expense" ? `-${formatCurrency(tx.amount)}` : "—"}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="space-y-1">
                                    <span className="font-medium text-slate-800 block">{tx.suggestedAccount}</span>
                                    {tx.ruleApplied ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        ⚡ {tx.ruleApplied}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">Sugerencia inteligente</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateTransactionStatus(
                                          tx.id,
                                          "categorizadas",
                                          `Transacción "${tx.description.slice(0, 28)}..." coincidente y registrada en DB.`
                                        );
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold text-xs transition shadow-2xs cursor-pointer whitespace-nowrap"
                                    >
                                      Coincidir / Agregar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateTransactionStatus(
                                          tx.id,
                                          "excluidas",
                                          "Transacción excluida del feed bancario."
                                        );
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                        {bankTransactions.filter((t) => t.status === "porRevisar" && (selectedBankId === "all" || t.bankAccountId === selectedBankId || (t as unknown as { bankId?: string }).bankId === selectedBankId)).length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400">
                              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold text-xl">
                                ✓
                              </div>
                              <p className="font-semibold text-slate-700 text-sm">¡Estás al día!</p>
                              <p className="text-xs text-slate-500 mt-1">No hay transacciones bancarias pendientes de revisión.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: CATEGORIZADAS */}
              {bankSubTab === "categorizadas" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">Transacciones Conciliadas &amp; Registradas</h3>
                    <span className="text-xs text-slate-500">
                      {bankTransactions.filter((t) => t.status === "categorizadas").length} registradas
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Fecha</th>
                          <th className="py-3 px-4">Descripción</th>
                          <th className="py-3 px-4">Beneficiario</th>
                          <th className="py-3 px-4 text-right">Importe</th>
                          <th className="py-3 px-4">Cuenta Contable</th>
                          <th className="py-3 px-4 text-center">Estado</th>
                          <th className="py-3 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bankTransactions
                          .filter((t) => t.status === "categorizadas")
                          .map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-3 px-4 text-slate-800 whitespace-nowrap">{tx.date}</td>
                              <td className="py-3 px-4 font-semibold text-slate-900">{tx.description}</td>
                              <td className="py-3 px-4 text-slate-700">{tx.payee}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                {tx.type === "deposit" ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800">{tx.suggestedAccount}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ Añadida al libro
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateTransactionStatus(
                                      tx.id,
                                      "porRevisar",
                                      "Transacción devuelta a 'Por revisar'."
                                    );
                                  }}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Deshacer
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: EXCLUIDAS */}
              {bankSubTab === "excluidas" && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">Transacciones Excluidas</h3>
                    <span className="text-xs text-slate-500">
                      {bankTransactions.filter((t) => t.status === "excluidas").length} excluidas
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Fecha</th>
                          <th className="py-3 px-4">Descripción</th>
                          <th className="py-3 px-4 text-right">Importe</th>
                          <th className="py-3 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bankTransactions
                          .filter((t) => t.status === "excluidas")
                          .map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-3 px-4 text-slate-800">{tx.date}</td>
                              <td className="py-3 px-4 font-semibold text-slate-900">{tx.description}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(tx.amount)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateTransactionStatus(
                                      tx.id,
                                      "porRevisar",
                                      "Transacción restaurada a 'Por revisar'."
                                    );
                                  }}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Restaurar
                                </button>
                              </td>
                            </tr>
                          ))}
                        {bankTransactions.filter((t) => t.status === "excluidas").length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                              No hay transacciones excluidas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: REGLAS DE AUTOMATIZACIÓN */}
              {bankSubTab === "reglas" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Reglas de Automatización de Feeds</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Categoriza y concilia automáticamente depósitos y cobros recurrentes sin intervención manual.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewRuleModal(true)}
                      className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Crear regla de automatización</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Nombre de la Regla</th>
                          <th className="py-3 px-4">Condición de Detección</th>
                          <th className="py-3 px-4">Cuenta Asignada Automáticamente</th>
                          <th className="py-3 px-4 text-center">Auto-Confirmar</th>
                          <th className="py-3 px-4 text-center">Estado</th>
                          <th className="py-3 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {automationRules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4 font-bold text-slate-900">{rule.name}</td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{rule.condition}</td>
                            <td className="py-3 px-4 font-medium text-slate-800">{rule.targetAccount}</td>
                            <td className="py-3 px-4 text-center">
                              {rule.autoConfirm ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ⚡ Automático
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  Sugerencia
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleRuleActive(rule.id, rule.active)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                                  rule.active
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {rule.active ? "Activa" : "Pausada"}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(rule.id, rule.name)}
                                className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                        <td className="p-3.5 text-right font-mono font-medium">{formatCurrency(item.cost)}</td>
                        <td className="p-3.5 text-right font-mono font-medium">{formatCurrency(item.price)}</td>
                        <td className="p-3.5 text-right font-mono text-slate-900 font-bold">
                          {formatCurrency(item.quantity * item.cost)}
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

          {/* ================= VIEW: REPORTES ================= */}
          {currentView === "reportes" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="font-bold text-base text-slate-900">Centro de Reportes</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Informes financieros, contables y operativos de Wayne Trademark Honduras</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Período fiscal:</span>
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                      Año 2026 (Actual)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-5">
                  {/* Reporte 1: Pérdidas y Ganancias */}
                  <div className="p-5 rounded-xl border border-slate-200 hover:border-[#f6821f]/50 hover:shadow-xs transition bg-white flex flex-col justify-between group">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#f6821f] transition">Estado de Pérdidas y Ganancias</h3>
                      <p className="text-xs text-slate-500 mt-1">Desglose de ingresos brutos, gastos operacionales e ingresos netos del período.</p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Actualizado hoy</span>
                      <button className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer">Descargar PDF</button>
                    </div>
                  </div>

                  {/* Reporte 2: Balance General */}
                  <div className="p-5 rounded-xl border border-slate-200 hover:border-[#f6821f]/50 hover:shadow-xs transition bg-white flex flex-col justify-between group">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#f6821f] transition">Balance de Situación</h3>
                      <p className="text-xs text-slate-500 mt-1">Resumen patrimonial clasificado: Activos, Pasivos y Capital Contable.</p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Mensual</span>
                      <button className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer">Descargar PDF</button>
                    </div>
                  </div>

                  {/* Reporte 3: Valoración de Inventario */}
                  <div className="p-5 rounded-xl border border-slate-200 hover:border-[#f6821f]/50 hover:shadow-xs transition bg-white flex flex-col justify-between group">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#f6821f] transition">Valoración de Inventario</h3>
                      <p className="text-xs text-slate-500 mt-1">Existencias físicas, valor total en libros ({formatCurrency(totalInventoryValuation)}) y costos unitarios.</p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">En tiempo real</span>
                      <button className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer">Descargar Excel</button>
                    </div>
                  </div>

                  {/* Reporte 4: Cuentas por Cobrar (Clientes) */}
                  <div className="p-5 rounded-xl border border-slate-200 hover:border-[#f6821f]/50 hover:shadow-xs transition bg-white flex flex-col justify-between group">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#f6821f] transition">Antigüedad de Saldos Clientes</h3>
                      <p className="text-xs text-slate-500 mt-1">Detalle de facturación pendiente y estados de cuenta por cliente.</p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">{customers.length} clientes</span>
                      <button className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer">Descargar CSV</button>
                    </div>
                  </div>

                  {/* Reporte 5: Cuentas por Pagar (Proveedores) */}
                  <div className="p-5 rounded-xl border border-slate-200 hover:border-[#f6821f]/50 hover:shadow-xs transition bg-white flex flex-col justify-between group">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#f6821f] transition">Antigüedad de Saldos Proveedores</h3>
                      <p className="text-xs text-slate-500 mt-1">Obligaciones comerciales por vencer y programaciones de pago.</p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">{vendors.length} proveedores</span>
                      <button className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer">Descargar CSV</button>
                    </div>
                  </div>

                  {/* Reporte 6: Libro Mayor y Plan de Cuentas */}
                  <div className="p-5 rounded-xl border border-slate-200 hover:border-[#f6821f]/50 hover:shadow-xs transition bg-white flex flex-col justify-between group">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#f6821f] transition">Libro Mayor / Catálogo Contable</h3>
                      <p className="text-xs text-slate-500 mt-1">Estructura completa del catálogo contable y saldos acumulados por cuenta.</p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">{accounts.length} cuentas activas</span>
                      <button className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer">Descargar Excel</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: CONFIGURACIÓN ================= */}
          {currentView === "configuracion" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Main Body with Left Nav & Content */}
              <div className="flex flex-col md:flex-row min-h-[720px]">
                {/* Left Submenu Navigation matching screenshot */}
                <div className="w-full md:w-56 bg-slate-50/60 border-r border-slate-200 py-3 text-xs shrink-0">
                  <div className="space-y-0.5">
                    {[
                      { id: "empresa", label: "Empresa" },
                      { id: "reportes", label: "Reportes" },
                      { id: "contabilidad", label: "Contabilidad" },
                      { id: "ventas", label: "Ventas" },
                      { id: "gastos", label: "Gastos" },
                      { id: "horas", label: "Horas trabajadas" },
                      { id: "monedas", label: "Monedas" },
                      { id: "avanzadas", label: "Opciones avanzadas" },
                    ].map((tab) => {
                      const isActive = configSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setConfigSubTab(tab.id as any)}
                          className={`w-full text-left px-5 py-3 transition font-medium cursor-pointer ${
                            isActive
                              ? "bg-[#fff7ed] text-[#f6821f] font-semibold border-l-4 border-[#f6821f]"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-l-4 border-transparent"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Content Panel */}
                <div className="flex-1 p-6 md:p-8 bg-white overflow-y-auto">
                  {/* SUBTAB 1: EMPRESA */}
                  {configSubTab === "empresa" && (
                    <div className="max-w-3xl space-y-6">
                      {/* Hidden File Input for Logo Upload */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />

                      {/* Company Logo Header with Generic Fallback - Left Aligned */}
                      <div className="flex flex-col items-start justify-start pb-4">
                        {companyLogo ? (
                          /* Uploaded Custom Logo Display - Left Aligned */
                          <div className="flex flex-col items-start">
                            <div className="p-3 border border-slate-200 rounded-2xl bg-white shadow-xs max-w-xs flex items-center justify-center">
                              <img
                                src={companyLogo}
                                alt="Logotipo de la empresa"
                                className="max-h-20 max-w-[260px] object-contain"
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-2.5">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition"
                                title="Cambiar logotipo"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <span>Cambiar logo</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium cursor-pointer transition border border-red-200"
                                title="Eliminar logotipo personalizado"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Generic Fallback Box - Left Aligned */
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#f6821f] bg-slate-50/80 hover:bg-[#fff7ed]/50 cursor-pointer transition group max-w-sm"
                            title="Haz clic para subir el logotipo oficial de la empresa"
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-200/80 group-hover:bg-[#f6821f]/10 text-slate-500 group-hover:text-[#f6821f] flex items-center justify-center shrink-0 transition">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-bold text-slate-800 group-hover:text-[#f6821f] transition">
                                + Agregar logotipo
                              </span>
                              <span className="text-[11px] text-slate-400 mt-0.5">
                                PNG, JPG o SVG (máx. 2 MB)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card 1: Información de la empresa */}
                      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                        <div className="mb-4">
                          <h2 className="font-bold text-sm text-slate-900">Información de la empresa</h2>
                          <p className="text-xs text-slate-500 mt-0.5">Esta información puede usarse con fines de facturación.</p>
                        </div>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Nombre</span>
                            <span className="flex-1 text-slate-700 font-medium">{companySettings.nombre}</span>
                            <button
                              onClick={() => startEditConfig("nombre", "Nombre de la empresa")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>

                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Dirección</span>
                            <span className="flex-1 text-slate-700 font-medium whitespace-pre-line">{companySettings.direccion}</span>
                            <button
                              onClick={() => startEditConfig("direccion", "Dirección de la empresa")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>

                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Correo electrónico</span>
                            <span className="flex-1 text-slate-700 font-medium">{companySettings.email}</span>
                            <button
                              onClick={() => startEditConfig("email", "Correo electrónico")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>

                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Teléfono</span>
                            <span className="flex-1 text-slate-700 font-medium font-mono">{companySettings.telefono}</span>
                            <button
                              onClick={() => startEditConfig("telefono", "Teléfono de contacto")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>

                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Sitio web</span>
                            <span className={`flex-1 font-medium ${companySettings.sitioWeb === "Ninguno indicado" ? "text-slate-400 italic" : "text-slate-700"}`}>
                              {companySettings.sitioWeb}
                            </span>
                            <button
                              onClick={() => startEditConfig("sitioWeb", "Sitio web")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>

                          {/* Sector Row with Inline Dropdown Editor */}
                          {editingConfigKey === "sector" ? (
                            <div className="py-4 px-4 my-2 border border-slate-300 rounded-xl bg-white shadow-xs animate-in fade-in duration-150">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="w-48 shrink-0">
                                  <span className="font-semibold text-xs text-slate-800 block">Sector</span>
                                  <span className="text-[11px] text-slate-500 mt-0.5 block leading-snug">
                                    Actividad o industria principal de tu negocio.
                                  </span>
                                </div>
                                <div className="flex-1 max-w-md">
                                  <select
                                    value={editingConfigValue || companySettings.sector}
                                    onChange={(e) => setEditingConfigValue(e.target.value)}
                                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-white border-2 border-[#f6821f] text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f6821f] cursor-pointer shadow-xs font-medium"
                                  >
                                    {BUSINESS_SECTOR_OPTIONS.map((sec) => (
                                      <option key={sec} value={sec}>
                                        {sec}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => setEditingConfigKey(null)}
                                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={saveConfigField}
                                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#f6821f] hover:bg-[#e07216] transition cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-3 flex items-start justify-between gap-4">
                              <span className="w-40 font-semibold text-slate-800 shrink-0">Sector</span>
                              <span className="flex-1 text-slate-700 font-medium">{companySettings.sector}</span>
                              <button
                                onClick={() => startEditConfig("sector", "Sector de la empresa")}
                                className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                              >
                                Editar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card 2: Información legal */}
                      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                        <div className="mb-4">
                          <h2 className="font-bold text-sm text-slate-900">Información legal</h2>
                          <p className="text-xs text-slate-500 mt-0.5">Esta es la información que tu empresa utiliza para fines fiscales.</p>
                        </div>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Nombre legal de la empresa</span>
                            <span className="flex-1 text-slate-700 font-medium">{companySettings.nombreLegal}</span>
                            <button
                              onClick={() => startEditConfig("nombreLegal", "Nombre legal")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>

                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">VAT/GST/TAX ID number</span>
                            <span className="flex-1 text-slate-700 font-mono font-medium">{companySettings.taxId}</span>
                            <button
                              onClick={() => startEditConfig("taxId", "Número de Identificación Fiscal (RTN)")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>

                          {/* Tipo de empresa - Interactive matching screenshot */}
                          {editingConfigKey === "tipoEmpresa" ? (
                            <div className="py-4 px-4 my-2 border border-slate-300 rounded-xl bg-white shadow-xs animate-in fade-in duration-150">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="w-48 shrink-0">
                                  <span className="font-semibold text-xs text-slate-800 block">Tipo de empresa</span>
                                  <span className="text-[11px] text-slate-500 mt-0.5 block leading-snug">
                                    Cómo está estructurado tu negocio.
                                  </span>
                                </div>
                                <div className="flex-1 max-w-md">
                                  <select
                                    value={editingConfigValue || companySettings.tipoEmpresa}
                                    onChange={(e) => setEditingConfigValue(e.target.value)}
                                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-white border-2 border-[#f6821f] text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f6821f] cursor-pointer shadow-xs font-medium"
                                  >
                                    {COMPANY_TYPE_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => setEditingConfigKey(null)}
                                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={saveConfigField}
                                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#f6821f] hover:bg-[#e07216] transition cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-3 flex items-start justify-between gap-4">
                              <span className="w-40 font-semibold text-slate-800 shrink-0">Tipo de empresa</span>
                              <span className="flex-1 text-slate-700 font-medium">{companySettings.tipoEmpresa}</span>
                              <button
                                onClick={() => startEditConfig("tipoEmpresa", "Tipo de empresa")}
                                className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                              >
                                Editar
                              </button>
                            </div>
                          )}

                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Domicilio legal</span>
                            <span className="flex-1 text-slate-700 font-medium whitespace-pre-line">{companySettings.domicilioLegal}</span>
                            <button
                              onClick={() => startEditConfig("domicilioLegal", "Domicilio legal")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Información de contacto del cliente */}
                      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                        <div className="mb-4">
                          <h2 className="font-bold text-sm text-slate-900">Información de contacto del cliente</h2>
                          <p className="text-xs text-slate-500 mt-0.5">Así es como los clientes se ponen en contacto contigo.</p>
                        </div>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Correo electrónico del cliente</span>
                            <span className="flex-1 text-slate-700 font-medium">{companySettings.emailCliente}</span>
                            <button
                              onClick={() => startEditConfig("emailCliente", "Correo de contacto del cliente")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>

                          <div className="py-3 flex items-start justify-between gap-4">
                            <span className="w-40 font-semibold text-slate-800 shrink-0">Dirección del cliente</span>
                            <span className={`flex-1 font-medium ${companySettings.direccionCliente === "Ninguno indicado" ? "text-slate-400 italic" : "text-slate-700"}`}>
                              {companySettings.direccionCliente}
                            </span>
                            <button
                              onClick={() => startEditConfig("direccionCliente", "Dirección del cliente")}
                              className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 2: REPORTES */}
                  {configSubTab === "reportes" && (
                    <div className="space-y-6">
                      {/* Top Info Banner */}
                      {showReportBanner && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                              i
                            </div>
                            <span className="font-medium">
                              Estas personalizaciones se aplican a los informes estándar y personalizados.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowReportBanner(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer text-sm font-bold px-1"
                            title="Cerrar aviso"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Main Two-Column Layout: Controls on Left, Live Sheet Preview on Right */}
                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                        {/* LEFT COLUMN: CUSTOMIZATION CONTROLS */}
                        <div className="xl:col-span-5 space-y-6 text-xs">
                          {/* SECTION: Objeto visual */}
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 mb-2">Objeto visual</h3>
                            <div className="border-t border-slate-200 divide-y divide-slate-200">
                              {/* Encabezado */}
                              <div className="py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleReportAccordion("encabezado")}
                                  className="w-full flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 cursor-pointer"
                                >
                                  <span>Encabezado</span>
                                  <svg
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      reportAccordions.encabezado ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {reportAccordions.encabezado && (
                                  <div className="mt-3.5 space-y-3.5 pl-1 text-slate-700 text-xs animate-in fade-in duration-150">
                                    {/* 3 Checkboxes horizontally matching screenshot */}
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={reportHeaderLogo}
                                          onChange={(e) => setReportHeaderLogo(e.target.checked)}
                                          className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-700">Logotipo de la empresa</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={reportHeaderPeriod}
                                          onChange={(e) => setReportHeaderPeriod(e.target.checked)}
                                          className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-700">Período del informe</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={reportHeaderLegalName}
                                          onChange={(e) => setReportHeaderLegalName(e.target.checked)}
                                          className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-700">Razón social</span>
                                      </label>
                                    </div>

                                    {/* Alineación de encabezado matching screenshot */}
                                    <div className="pt-1">
                                      <label className="block text-xs text-slate-700 font-normal mb-1.5">
                                        Alineación de encabezado
                                      </label>
                                      <div className="relative inline-block w-40">
                                        <select
                                          value={reportHeaderAlignment}
                                          onChange={(e) => setReportHeaderAlignment(e.target.value as any)}
                                          className="w-full appearance-none pr-8 pl-3 py-1.5 text-xs rounded-lg border-2 border-emerald-800 text-slate-800 bg-white focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f] cursor-pointer font-medium shadow-2xs"
                                        >
                                          <option value="Izquierda">Izquierda</option>
                                          <option value="Centro">Centro</option>
                                          <option value="Derecha">Derecha</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-600">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Pie de página */}
                              <div className="py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleReportAccordion("piePagina")}
                                  className="w-full flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 cursor-pointer"
                                >
                                  <span>Pie de página</span>
                                  <svg
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      reportAccordions.piePagina ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {reportAccordions.piePagina && (
                                  <div className="mt-3.5 space-y-3.5 pl-1 text-slate-700 text-xs animate-in fade-in duration-150">
                                    {/* 3 Checkboxes horizontally matching screenshot */}
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={reportFooterDate}
                                          onChange={(e) => setReportFooterDate(e.target.checked)}
                                          className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-700">Fecha de preparación</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={reportFooterTime}
                                          onChange={(e) => setReportFooterTime(e.target.checked)}
                                          className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-700">Hora de preparación</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={reportFooterMethod}
                                          onChange={(e) => setReportFooterMethod(e.target.checked)}
                                          className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-700">Método de contabilización de los informes</span>
                                      </label>
                                    </div>

                                    {/* Alineación del pie de página matching screenshot */}
                                    <div className="pt-1">
                                      <label className="block text-xs text-slate-700 font-normal mb-1.5">
                                        Alineación del pie de página
                                      </label>
                                      <div className="relative inline-block w-40">
                                        <select
                                          value={reportFooterAlignment}
                                          onChange={(e) => setReportFooterAlignment(e.target.value as any)}
                                          className="w-full appearance-none pr-8 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f] cursor-pointer font-medium shadow-2xs"
                                        >
                                          <option value="Izquierda">Izquierda</option>
                                          <option value="Centro">Centro</option>
                                          <option value="Derecha">Derecha</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>


                              {/* Filas agrupadas */}
                              <div className="py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleReportAccordion("filasAgrupadas")}
                                  className="w-full flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 cursor-pointer"
                                >
                                  <span>Filas agrupadas</span>
                                  <svg
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      reportAccordions.filasAgrupadas ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {reportAccordions.filasAgrupadas && (
                                  <div className="mt-3 space-y-2.5 pl-2 text-slate-600 text-[11px]">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={reportExpandSubaccounts}
                                        onChange={(e) => setReportExpandSubaccounts(e.target.checked)}
                                        className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                      />
                                      <span>Expandir subcuentas de primer nivel</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={reportShowGroupTotals}
                                        onChange={(e) => setReportShowGroupTotals(e.target.checked)}
                                        className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                      />
                                      <span>Mostrar totales de agrupación</span>
                                    </label>
                                  </div>
                                )}
                              </div>

                              {/* Celdas vacías (Con badge NUEVO) */}
                              <div className="py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleReportAccordion("celdasVacias")}
                                  className="w-full flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 cursor-pointer"
                                >
                                  <span>Celdas vacías</span>
                                  <svg
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      reportAccordions.celdasVacias ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {reportAccordions.celdasVacias && (
                                  <div className="mt-3 space-y-2 pl-2 text-slate-600 text-[11px]">
                                    <div className="flex items-center gap-3">
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="emptyCellOption"
                                          value="hyphen"
                                          checked={reportEmptyCellFormat === "hyphen"}
                                          onChange={(e) => setReportEmptyCellFormat(e.target.value)}
                                          className="text-[#f6821f] focus:ring-[#f6821f]"
                                        />
                                        <span>Guion (-)</span>
                                      </label>
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="emptyCellOption"
                                          value="zero"
                                          checked={reportEmptyCellFormat === "zero"}
                                          onChange={(e) => setReportEmptyCellFormat(e.target.value)}
                                          className="text-[#f6821f] focus:ring-[#f6821f]"
                                        />
                                        <span>$0.00</span>
                                      </label>
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="emptyCellOption"
                                          value="blank"
                                          checked={reportEmptyCellFormat === "blank"}
                                          onChange={(e) => setReportEmptyCellFormat(e.target.value)}
                                          className="text-[#f6821f] focus:ring-[#f6821f]"
                                        />
                                        <span>En blanco</span>
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Líneas de cuadrícula (Abierto por defecto matching screenshot) */}
                              <div className="py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleReportAccordion("lineasCuadricula")}
                                  className="w-full flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 cursor-pointer"
                                >
                                  <span>Líneas de cuadrícula</span>
                                  <svg
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      reportAccordions.lineasCuadricula ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {reportAccordions.lineasCuadricula && (
                                  <div className="mt-3.5 pt-1 pl-1 flex items-center justify-between gap-4">
                                    <span className="text-xs text-slate-700 font-medium shrink-0">
                                      Informar de bordes
                                    </span>
                                    <div className="relative flex-1 max-w-[200px]">
                                      <select
                                        value={gridBorderSetting}
                                        onChange={(e) => setGridBorderSetting(e.target.value)}
                                        className="w-full appearance-none pr-8 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f] cursor-pointer font-medium shadow-2xs"
                                      >
                                        <option value="Predeterminado">Predeterminado</option>
                                        <option value="Líneas horizontales">Líneas horizontales</option>
                                        <option value="Líneas verticales">Líneas verticales</option>
                                        <option value="Cuadrícula completa">Cuadrícula completa</option>
                                        <option value="Sin líneas">Sin líneas</option>
                                      </select>
                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* SECTION: Formateo */}
                          <div className="pt-2">
                            <h3 className="font-bold text-sm text-slate-900 mb-2">Formateo</h3>
                            <div className="border-t border-slate-200 divide-y divide-slate-200">
                              {/* Número matching screenshot */}
                              <div className="py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleReportAccordion("numero")}
                                  className="w-full flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 cursor-pointer"
                                >
                                  <span>Número</span>
                                  <svg
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      reportAccordions.numero ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {reportAccordions.numero && (
                                  <div className="mt-3.5 space-y-4 pl-1 text-slate-700 text-xs animate-in fade-in duration-150">
                                    {/* Row 1 & 2 Checkboxes matching screenshot */}
                                    <div className="space-y-2.5">
                                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={reportDivideBy1000}
                                            onChange={(e) => setReportDivideBy1000(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                          />
                                          <span className="text-xs text-slate-700">Dividir por 1000</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={reportHideZeroAmounts}
                                            onChange={(e) => setReportHideZeroAmounts(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                          />
                                          <span className="text-xs text-slate-700">No mostrar importes en cero</span>
                                        </label>
                                      </div>
                                      <div>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={reportHideCurrencySymbol}
                                            onChange={(e) => setReportHideCurrencySymbol(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                          />
                                          <span className="text-xs text-slate-700">No mostrar símbolo de divisa</span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* Subsection: Números negativos */}
                                    <div className="pt-1">
                                      <span className="block text-xs font-medium text-slate-700 mb-1.5">
                                        Números negativos
                                      </span>
                                      <div className="flex items-center gap-4">
                                        <div className="relative w-28">
                                          <select
                                            value={reportNegativeNumberFormat}
                                            onChange={(e) => setReportNegativeNumberFormat(e.target.value)}
                                            className="w-full appearance-none pr-7 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f] cursor-pointer font-medium shadow-2xs"
                                          >
                                            <option value="-100">-100</option>
                                            <option value="(100)">(100)</option>
                                            <option value="-$100">-$100</option>
                                            <option value="100-">100-</option>
                                          </select>
                                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </div>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={reportNegativeInRed}
                                            onChange={(e) => setReportNegativeInRed(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                          />
                                          <span className="text-xs text-slate-700">Mostrar en rojo</span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* Subsection: Decimales */}
                                    <div className="pt-1 space-y-2">
                                      <span className="block text-xs font-medium text-slate-700">
                                        Decimales
                                      </span>
                                      <div className="space-y-2.5">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input
                                            type="radio"
                                            name="reportDecimalOption"
                                            checked={reportDecimalMode === "round"}
                                            onChange={() => setReportDecimalMode("round")}
                                            className="w-4 h-4 text-emerald-800 focus:ring-emerald-800 cursor-pointer"
                                          />
                                          <span className="text-xs text-slate-700">Redondea al número entero más cercano</span>
                                        </label>

                                        <div className="flex items-center gap-2">
                                          <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                              type="radio"
                                              name="reportDecimalOption"
                                              checked={reportDecimalMode === "decimals"}
                                              onChange={() => setReportDecimalMode("decimals")}
                                              className="w-4 h-4 text-emerald-800 focus:ring-emerald-800 cursor-pointer"
                                            />
                                            <span className="text-xs text-slate-700">Mostrar decimales hasta</span>
                                          </label>
                                          <div className="relative w-16">
                                            <select
                                              value={reportDecimalPlaces}
                                              onChange={(e) => {
                                                setReportDecimalPlaces(Number(e.target.value));
                                                setReportDecimalMode("decimals");
                                              }}
                                              className="w-full appearance-none pr-6 pl-2.5 py-1 text-xs rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:border-[#f6821f] cursor-pointer font-medium text-center shadow-2xs"
                                            >
                                              <option value={0}>0</option>
                                              <option value={1}>1</option>
                                              <option value={2}>2</option>
                                              <option value={3}>3</option>
                                              <option value={4}>4</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                              </svg>
                                            </div>
                                          </div>
                                          <span className="text-xs text-slate-700">lugares</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Ver */}
                              <div className="py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleReportAccordion("ver")}
                                  className="w-full flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 cursor-pointer"
                                >
                                  <span>Ver</span>
                                  <svg
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      reportAccordions.ver ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {reportAccordions.ver && (
                                  <div className="mt-3 space-y-2.5 pl-2 text-slate-600 text-[11px]">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={reportCompactView}
                                        onChange={(e) => setReportCompactView(e.target.checked)}
                                        className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                      />
                                      <span>Diseño compacto</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={reportWrapText}
                                        onChange={(e) => setReportWrapText(e.target.checked)}
                                        className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                      />
                                      <span>Ajuste automático de texto largo</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: DARK CONTAINER WITH LIVE SAMPLE REPORT SHEET */}
                        <div className="xl:col-span-7 bg-[#2d3748] rounded-2xl p-4 sm:p-6 flex items-center justify-center min-h-[540px] shadow-inner overflow-hidden">
                          {/* Paper Sheet */}
                          <div className="bg-white text-slate-900 shadow-2xl rounded-sm p-5 sm:p-7 w-full max-w-xl text-[11px] font-sans relative overflow-hidden border border-slate-200">
                            {/* Watermark: SAMPLE REPORT */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
                              <span className="text-2xl sm:text-4xl font-extrabold text-amber-700/25 tracking-[0.2em] uppercase transform -rotate-35 border-2 border-dashed border-amber-700/20 py-2.5 px-6 sm:px-10 rounded-xl">
                                SAMPLE REPORT
                              </span>
                            </div>

                            {/* Report Header Title and Details according to user customization */}
                            <div
                              className={`mb-6 ${
                                reportHeaderAlignment === "Izquierda"
                                  ? "text-left"
                                  : reportHeaderAlignment === "Derecha"
                                  ? "text-right"
                                  : "text-center"
                              }`}
                            >
                              {reportHeaderLogo && (
                                <div
                                  className={`mb-2 flex ${
                                    reportHeaderAlignment === "Izquierda"
                                      ? "justify-start"
                                      : reportHeaderAlignment === "Derecha"
                                      ? "justify-end"
                                      : "justify-center"
                                  }`}
                                >
                                  {companyLogo ? (
                                    <img src={companyLogo} alt="Logo" className="h-9 object-contain" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-[#fff7ed] border border-[#f6821f]/30 flex items-center justify-center font-bold text-[#f6821f] text-sm shadow-xs">
                                      W
                                    </div>
                                  )}
                                </div>
                              )}
                              {reportHeaderLegalName && (
                                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-0.5">
                                  {companySettings.nombreLegal}
                                </div>
                              )}
                              <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                                Profit and Loss
                              </h3>
                              {reportHeaderPeriod && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Enero - Diciembre 2026
                                </div>
                              )}
                            </div>

                            {/* Styling helpers calculated from all active settings */}
                            {(() => {
                              const showVerticalGrid = gridBorderSetting === "Líneas verticales" || gridBorderSetting === "Cuadrícula completa";
                              const showHorizontalGrid = gridBorderSetting === "Líneas horizontales" || gridBorderSetting === "Cuadrícula completa";
                              const isFullGrid = gridBorderSetting === "Cuadrícula completa";
                              const isBorderless = gridBorderSetting === "Sin líneas";
                              const rowPadding = reportCompactView ? "py-0.5" : "py-1.5";
                              const tableTextSize = reportCompactView ? "text-[11px]" : "text-xs";
                              const labelWrap = reportWrapText ? "break-words" : "whitespace-nowrap truncate max-w-[210px] sm:max-w-[310px]";
                              const cellVBorder = showVerticalGrid ? "border-r border-slate-200 pr-3" : "";
                              const cellVAmtBorder = showVerticalGrid ? "pl-3 text-right shrink-0 min-w-[90px]" : "text-right shrink-0 min-w-[90px]";
                              const rowHBorder = showHorizontalGrid ? "border-b border-slate-100" : "";

                              return (
                                <div className={`transition-all ${isFullGrid ? "border border-slate-300 rounded-sm p-2 bg-white" : ""}`}>
                                  {/* Columns Header */}
                                  <div
                                    className={`pb-1.5 flex justify-between font-bold text-slate-900 ${tableTextSize} ${
                                      isBorderless ? "" : "border-b border-slate-300"
                                    }`}
                                  >
                                    <div className={`flex items-center gap-1.5 flex-1 ${showVerticalGrid ? "border-r border-slate-300 pr-3" : ""}`}>
                                      <span className="text-slate-400 text-[10px]">◊</span>
                                      <span>Account</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${cellVAmtBorder}`}>
                                      <span className="text-slate-400 text-[10px]">◊</span>
                                      <span>Total</span>
                                    </div>
                                  </div>

                                  {/* Report Table Body */}
                                  <div
                                    className={`divide-y ${tableTextSize} ${
                                      showHorizontalGrid
                                        ? "divide-slate-200"
                                        : isBorderless
                                        ? "divide-transparent"
                                        : "divide-slate-100"
                                    }`}
                                  >
                                    {/* Group: Income */}
                                    <div className="pt-2 pb-1">
                                      <div className={`flex items-center justify-between font-bold text-slate-900 ${rowPadding}`}>
                                        <div className={`flex items-center gap-1.5 flex-1 ${cellVBorder}`}>
                                          <span className="text-[9px] text-slate-400">∨</span>
                                          <span className={labelWrap}>Income</span>
                                        </div>
                                        <div className={cellVAmtBorder}></div>
                                      </div>
                                      <div className="pl-5 text-slate-700">
                                        <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Design Income</span>
                                          <span className={`${getReportAmountClass(0)} ${cellVAmtBorder}`}>
                                            {formatReportAmount(0)}
                                          </span>
                                        </div>
                                        <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Discounts given</span>
                                          <span className={`${getReportAmountClass(-89.50)} ${cellVAmtBorder}`}>
                                            {formatReportAmount(-89.50)}
                                          </span>
                                        </div>

                                        {/* Subgroup: Job Materials */}
                                        <div className="pl-3 py-0.5">
                                          <div className={`font-semibold text-slate-800 flex justify-between ${rowPadding}`}>
                                            <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Job Materials</span>
                                            <div className={cellVAmtBorder}></div>
                                          </div>
                                          {reportExpandSubaccounts && (
                                            <div className="pl-3 text-slate-600">
                                              <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                                <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Fountains and Exterior Garden Lighting Systems</span>
                                                <span className={`${getReportAmountClass(2246.50)} ${cellVAmtBorder}`}>{formatReportAmount(2246.50)}</span>
                                              </div>
                                              <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                                <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Plants and Soil</span>
                                                <span className={`${getReportAmountClass(2351.97)} ${cellVAmtBorder}`}>{formatReportAmount(2351.97)}</span>
                                              </div>
                                            </div>
                                          )}
                                          {reportShowGroupTotals && (
                                            <div className={`flex justify-between font-medium text-slate-900 ${rowPadding} ${isBorderless ? "" : "border-t border-slate-100"}`}>
                                              <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Total for Job Materials</span>
                                              <span className={`${getReportAmountClass(4598.47)} ${cellVAmtBorder}`}>{formatReportAmount(4598.47)}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {reportShowGroupTotals && (
                                        <div className={`flex justify-between font-bold text-slate-900 mt-1 ${rowPadding} ${isBorderless ? "" : "border-t border-slate-200"}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Total for Income</span>
                                          <span className={`${getReportAmountClass(6068.97)} ${cellVAmtBorder}`}>{formatReportAmount(6068.97)}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Group: Cost of Goods Sold */}
                                    <div className="pt-1.5 pb-1">
                                      <div className={`flex items-center justify-between font-bold text-slate-900 ${rowPadding}`}>
                                        <div className={`flex items-center gap-1.5 flex-1 ${cellVBorder}`}>
                                          <span className="text-[9px] text-slate-400">∨</span>
                                          <span className={labelWrap}>Cost of Goods Sold</span>
                                        </div>
                                        <div className={cellVAmtBorder}></div>
                                      </div>
                                      <div className="pl-5 text-slate-700">
                                        <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Supplies & Materials</span>
                                          <span className={`${getReportAmountClass(405.00)} ${cellVAmtBorder}`}>{formatReportAmount(405.00)}</span>
                                        </div>
                                      </div>
                                      {reportShowGroupTotals && (
                                        <div className={`flex justify-between font-bold text-slate-900 mt-1 ${rowPadding} ${isBorderless ? "" : "border-t border-slate-200"}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Total for Cost of Goods Sold</span>
                                          <span className={`${getReportAmountClass(405.00)} ${cellVAmtBorder}`}>{formatReportAmount(405.00)}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Gross Profit */}
                                    <div className={`flex justify-between font-bold text-slate-900 ${rowPadding} ${isBorderless ? "" : "border-t border-b border-slate-300"}`}>
                                      <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Gross Profit</span>
                                      <span className={`${getReportAmountClass(5663.97)} ${cellVAmtBorder}`}>{formatReportAmount(5663.97)}</span>
                                    </div>

                                    {/* Group: Expenses */}
                                    <div className="pt-1.5 pb-1">
                                      <div className={`flex items-center justify-between font-bold text-slate-900 ${rowPadding}`}>
                                        <div className={`flex items-center gap-1.5 flex-1 ${cellVBorder}`}>
                                          <span className="text-[9px] text-slate-400">∨</span>
                                          <span className={labelWrap}>Expenses</span>
                                        </div>
                                        <div className={cellVAmtBorder}></div>
                                      </div>
                                      <div className="pl-5 text-slate-700">
                                        <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Advertising</span>
                                          <span className={`${getReportAmountClass(74.86)} ${cellVAmtBorder}`}>{formatReportAmount(74.86)}</span>
                                        </div>
                                        <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Automobile & Fuel</span>
                                          <span className={`${getReportAmountClass(349.41)} ${cellVAmtBorder}`}>{formatReportAmount(349.41)}</span>
                                        </div>
                                        <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Equipment Rental & Insurance</span>
                                          <span className={`${getReportAmountClass(353.23)} ${cellVAmtBorder}`}>{formatReportAmount(353.23)}</span>
                                        </div>
                                        <div className={`flex justify-between ${rowPadding} ${rowHBorder}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Legal, Professional & Accounting Fees</span>
                                          <span className={`${getReportAmountClass(640.00)} ${cellVAmtBorder}`}>{formatReportAmount(640.00)}</span>
                                        </div>
                                      </div>
                                      {reportShowGroupTotals && (
                                        <div className={`flex justify-between font-bold text-slate-900 mt-1 ${rowPadding} ${isBorderless ? "" : "border-t border-slate-200"}`}>
                                          <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Total for Expenses</span>
                                          <span className={`${getReportAmountClass(1417.50)} ${cellVAmtBorder}`}>{formatReportAmount(1417.50)}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Total / Net Income */}
                                    <div className={`mt-1 flex justify-between font-extrabold text-slate-950 ${rowPadding} ${
                                      isBorderless ? "" : "border-t-2 border-b-2 border-slate-800"
                                    }`}>
                                      <span className={`flex-1 ${cellVBorder} ${labelWrap}`}>Total</span>
                                      <span className={`${getReportAmountClass(4246.47)} ${cellVAmtBorder}`}>{formatReportAmount(4246.47)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Live Footer */}
                            {(reportFooterDate || reportFooterTime || reportFooterMethod) && (
                              <div
                                className={`mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500 space-y-0.5 ${
                                  reportFooterAlignment === "Izquierda"
                                    ? "text-left"
                                    : reportFooterAlignment === "Derecha"
                                    ? "text-right"
                                    : "text-center"
                                }`}
                              >
                                {(reportFooterDate || reportFooterTime) && (
                                  <div>
                                    {reportFooterDate && <span>Fecha de preparación: 02/09/2026</span>}
                                    {reportFooterDate && reportFooterTime && <span> | </span>}
                                    {reportFooterTime && <span>Hora de preparación: 21:46:34</span>}
                                  </div>
                                )}
                                {reportFooterMethod && (
                                  <div>Método de contabilización: Criterio de devengo (Acumulación)</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Bar matching screenshot with Guardar */}
                      <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
                        <div>
                          {reportSavedNotification && (
                            <span className="text-xs font-semibold text-emerald-600 animate-in fade-in">
                              ✓ Configuración de reportes guardada
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReportSavedNotification(true);
                            setTimeout(() => setReportSavedNotification(false), 3000);
                          }}
                          className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-[#f6821f] hover:bg-[#e07216] transition cursor-pointer shadow-xs"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 4: CONTABILIDAD */}
                  {configSubTab === "contabilidad" && (
                    <div className="max-w-3xl space-y-6">
                      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                        <h2 className="font-bold text-sm text-slate-900 mb-1">Ejercicio Fiscal y Parámetros Contables</h2>
                        <p className="text-xs text-slate-500 mb-4">Definición de periodos, cierre de libros y codificación de cuentas.</p>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Primer mes del ejercicio fiscal</span>
                            <span className="text-slate-700">Enero</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Primer mes del año del impuesto sobre la renta</span>
                            <span className="text-slate-700">Igual que el ejercicio fiscal (Enero)</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Método de contabilidad</span>
                            <span className="text-slate-700">Criterio de devengo</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Cierre de los libros</span>
                            <span className="text-slate-500">Desactivado (Periodo 2026 abierto)</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Activar números de cuenta contable</span>
                            <span className="text-emerald-700 font-semibold">Activado</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 5: VENTAS */}
                  {configSubTab === "ventas" && (
                    <div className="max-w-4xl space-y-4">
                      {/* Notification banner */}
                      {salesSavedNotification && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in duration-200">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                            <span className="font-semibold">Configuración de ventas actualizada correctamente</span>
                          </div>
                          <button
                            onClick={() => setSalesSavedNotification(false)}
                            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden divide-y divide-slate-200 text-xs">
                        {/* 1. Contenido del formulario de ventas */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingSalesSection === "contenidoFormulario" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar contenido del formulario de ventas</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Preferidofactura condiciones</label>
                                  <select
                                    value={salesSettings.preferidofacturaCondiciones}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, preferidofacturaCondiciones: e.target.value }))}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                  >
                                    <option value="Net 30">Net 30</option>
                                    <option value="Net 15">Net 15</option>
                                    <option value="Net 60">Net 60</option>
                                    <option value="Al recibo (Due on receipt)">Al recibo (Due on receipt)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Método de entrega preferido</label>
                                  <select
                                    value={salesSettings.metodoEntregaPreferido}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, metodoEntregaPreferido: e.target.value }))}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                  >
                                    <option value="Ninguno">Ninguno</option>
                                    <option value="Imprimir más tarde">Imprimir más tarde</option>
                                    <option value="Enviar más tarde">Enviar más tarde</option>
                                  </select>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.envio}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, envio: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="font-semibold text-slate-800">Envío</span>
                                </label>
                              </div>

                              <div className="pt-2 border-t border-slate-100 space-y-2">
                                <span className="font-bold text-slate-800 block text-[11px]">Campos personalizados</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={salesSettings.numerosTransaccionesPersonalizados}
                                      onChange={(e) => setSalesSettings((prev) => ({ ...prev, numerosTransaccionesPersonalizados: e.target.checked }))}
                                      className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                    />
                                    <span>Números de transacciones personalizados</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={salesSettings.fechaServicio}
                                      onChange={(e) => setSalesSettings((prev) => ({ ...prev, fechaServicio: e.target.checked }))}
                                      className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                    />
                                    <span>Fecha del servicio</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={salesSettings.descuento}
                                      onChange={(e) => setSalesSettings((prev) => ({ ...prev, descuento: e.target.checked }))}
                                      className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                    />
                                    <span>Descuento</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={salesSettings.deposito}
                                      onChange={(e) => setSalesSettings((prev) => ({ ...prev, deposito: e.target.checked }))}
                                      className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                    />
                                    <span>Depósito</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={salesSettings.etiquetas}
                                      onChange={(e) => setSalesSettings((prev) => ({ ...prev, etiquetas: e.target.checked }))}
                                      className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                    />
                                    <span>Etiquetas</span>
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSalesSection(null);
                                    setSalesSavedNotification(true);
                                    setTimeout(() => setSalesSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Contenido del formulario de ventas
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Preferidofactura condiciones</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.preferidofacturaCondiciones}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Método de entrega preferido</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.metodoEntregaPreferido}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Envío</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.envio ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="pt-2 font-semibold text-slate-800 text-[11px]">
                                  Campos personalizados
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Números de transacciones personalizados</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.numerosTransaccionesPersonalizados ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Fecha del servicio</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.fechaServicio ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Descuento</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.descuento ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Depósito</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.deposito ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Etiquetas</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.etiquetas ? "Activado" : "Desactivado"}</span>
                                </div>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection("contenidoFormulario")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. Productos y servicios */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingSalesSection === "productosServicios" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar productos y servicios</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="space-y-2.5">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.mostrarColumnaProductoServicio}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, mostrarColumnaProductoServicio: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="font-medium text-slate-800">Mostrar la columna Producto/Servicio en los formularios de ventas</span>
                                </label>
                                <div className="pl-6">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={salesSettings.mostrarColumnaSku}
                                      onChange={(e) => setSalesSettings((prev) => ({ ...prev, mostrarColumnaSku: e.target.checked }))}
                                      className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                    />
                                    <span className="text-slate-700">Mostrar columna de SKU</span>
                                  </label>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.activarReglasPrecios}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, activarReglasPrecios: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Activar reglas de precios</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.seguimientoCantidadPrecio}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, seguimientoCantidadPrecio: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Hacer un seguimiento de la cantidad y el precio/tarifa</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.seguimientoExistenciasInventario}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, seguimientoExistenciasInventario: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Realizar seguimiento de las existencias del inventario</span>
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Método de valoración del inventario</label>
                                  <select
                                    value={salesSettings.metodoValoracionInventario}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, metodoValoracionInventario: e.target.value }))}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                  >
                                    <option value="Seleccionar método">Seleccionar método</option>
                                    <option value="FIFO (PEPS - Primero en entrar, primero en salir)">FIFO (PEPS)</option>
                                    <option value="Costo promedio ponderado">Costo promedio ponderado</option>
                                    <option value="LIFO (UEPS)">LIFO (UEPS)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Método de recepción del inventario</label>
                                  <select
                                    value={salesSettings.metodoRecepcionInventario}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, metodoRecepcionInventario: e.target.value }))}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                  >
                                    <option value="Facturas de proveedores y gastos">Facturas de proveedores y gastos</option>
                                    <option value="Órdenes de compra y recepción">Órdenes de compra y recepción</option>
                                  </select>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.reconocimientoIngresos}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, reconocimientoIngresos: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="font-semibold text-slate-800">Reconocimiento de ingresos</span>
                                </label>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSalesSection(null);
                                    setSalesSavedNotification(true);
                                    setTimeout(() => setSalesSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Productos y servicios
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Mostrar la columna Producto/Servicio en los formularios de ventas</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.mostrarColumnaProductoServicio ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between pl-6">
                                  <span className="text-slate-700">Mostrar columna de SKU</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.mostrarColumnaSku ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700 flex items-center gap-1">
                                    Activar <span className="text-sky-600 border-b border-dotted border-sky-600 hover:underline cursor-pointer">reglas de precios</span>
                                  </span>
                                  <span className="text-slate-600 font-medium">{salesSettings.activarReglasPrecios ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Hacer un seguimiento de la cantidad y el precio/tarifa</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.seguimientoCantidadPrecio ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Realizar seguimiento de las existencias del inventario</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.seguimientoExistenciasInventario ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                  <span className="text-slate-700 flex items-center gap-1.5">
                                    Método de valoración del inventario
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-400 text-slate-500 text-[9px] font-serif cursor-help" title="Información de método de valoración">?</span>
                                  </span>
                                  <span className="text-slate-600 font-medium">{salesSettings.metodoValoracionInventario}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Método de recepción del inventario</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.metodoRecepcionInventario}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700 flex items-center gap-1">
                                    Reconocimiento de ingresos <span className="text-sky-600 hover:underline cursor-pointer text-[11px]">Más información</span>
                                  </span>
                                  <span className="text-slate-600 font-medium">{salesSettings.reconocimientoIngresos ? "Activado" : "Desactivado"}</span>
                                </div>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection("productosServicios")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. Facturación progresiva */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingSalesSection === "facturacionProgresiva" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar facturación progresiva</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={salesSettings.facturacionProgresiva}
                                  onChange={(e) => setSalesSettings((prev) => ({ ...prev, facturacionProgresiva: e.target.checked }))}
                                  className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                />
                                <span className="text-slate-800">Crea varias facturas parciales a partir de una sola cotización</span>
                              </label>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSalesSection(null);
                                    setSalesSavedNotification(true);
                                    setTimeout(() => setSalesSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Facturación progresiva
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-slate-700">Crea varias facturas parciales a partir de una sola cotización</span>
                                <span className="text-slate-600 font-medium">{salesSettings.facturacionProgresiva ? "Activado" : "Desactivado"}</span>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection("facturacionProgresiva")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 4. Mensajes */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingSalesSection === "mensajes" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar mensajes de ventas</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Mensaje de correo electrónico predeterminado que se envía con los formularios de ventas
                                </label>
                                <textarea
                                  rows={3}
                                  value={salesSettings.mensajePredeterminado}
                                  onChange={(e) => setSalesSettings((prev) => ({ ...prev, mensajePredeterminado: e.target.value }))}
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSalesSection(null);
                                    setSalesSavedNotification(true);
                                    setTimeout(() => setSalesSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Mensajes
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-slate-700">Mensaje de correo electrónico predeterminado que se envía con los formularios de ventas</span>
                                <span className="text-slate-400"></span>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection("mensajes")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 5. Recordatorios */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingSalesSection === "recordatorios" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar recordatorios automáticos</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Configurar mensajes de correo electrónico de recordatorios
                                </label>
                                <textarea
                                  rows={3}
                                  value={salesSettings.recordatoriosConfig}
                                  onChange={(e) => setSalesSettings((prev) => ({ ...prev, recordatoriosConfig: e.target.value }))}
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSalesSection(null);
                                    setSalesSavedNotification(true);
                                    setTimeout(() => setSalesSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Recordatorios
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-slate-700">Configurar mensajes de correo electrónico de recordatorios</span>
                                <span className="text-slate-400"></span>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection("recordatorios")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 6. Encuesta posterior a la factura/comentarios */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingSalesSection === "encuestaComentarios" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar encuesta y comentarios</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="space-y-2.5">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.solicitarSolicitudTrabajo}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, solicitarSolicitudTrabajo: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Solicitar una solicitud de trabajo</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.solicitarResenas}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, solicitarResenas: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Solicitar reseñas, comentarios o testimonios</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={salesSettings.solicitarReferencia}
                                    onChange={(e) => setSalesSettings((prev) => ({ ...prev, solicitarReferencia: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Solicitar una referencia</span>
                                </label>
                              </div>
                              <div className="pt-2 border-t border-slate-100 max-w-xs">
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Frecuencia</label>
                                <select
                                  value={salesSettings.frecuenciaEncuesta}
                                  onChange={(e) => setSalesSettings((prev) => ({ ...prev, frecuenciaEncuesta: e.target.value }))}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                >
                                  <option value="30 días">30 días</option>
                                  <option value="60 días">60 días</option>
                                  <option value="90 días">90 días</option>
                                  <option value="180 días">180 días</option>
                                </select>
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSalesSection(null);
                                    setSalesSavedNotification(true);
                                    setTimeout(() => setSalesSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Encuesta posterior a la factura/comentarios
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Solicitar una solicitud de trabajo</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.solicitarSolicitudTrabajo ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Solicitar reseñas, comentarios o testimonios</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.solicitarResenas ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Solicitar una referencia</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.solicitarReferencia ? "Activado" : "Desactivado"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Frecuencia</span>
                                  <span className="text-slate-600 font-medium">{salesSettings.frecuenciaEncuesta}</span>
                                </div>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection("encuestaComentarios")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 7. Entrega en línea */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingSalesSection === "entregaEnLinea" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar entrega en línea</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Opciones de envío por correo electrónico de los formularios de ventas
                                </label>
                                <textarea
                                  rows={3}
                                  value={salesSettings.entregaEnLineaOpciones}
                                  onChange={(e) => setSalesSettings((prev) => ({ ...prev, entregaEnLineaOpciones: e.target.value }))}
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSalesSection(null);
                                    setSalesSavedNotification(true);
                                    setTimeout(() => setSalesSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Entrega en línea
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-slate-700">Opciones de envío por correo electrónico de los formularios de ventas</span>
                                <span className="text-slate-400"></span>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection("entregaEnLinea")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 8. Resúmenes */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingSalesSection === "resumenes" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar resúmenes</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={salesSettings.mostrarTablaAntiguedad}
                                  onChange={(e) => setSalesSettings((prev) => ({ ...prev, mostrarTablaAntiguedad: e.target.checked }))}
                                  className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                />
                                <span className="text-slate-800">Mostrar tabla de antigüedad en la parte inferior del extracto</span>
                              </label>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSalesSection(null);
                                    setSalesSavedNotification(true);
                                    setTimeout(() => setSalesSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Resúmenes
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-slate-700">Mostrar tabla de antigüedad en la parte inferior del extracto</span>
                                <span className="text-slate-600 font-medium">{salesSettings.mostrarTablaAntiguedad ? "Activado" : "Desactivado"}</span>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingSalesSection("resumenes")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 6: GASTOS */}
                  {configSubTab === "gastos" && (
                    <div className="max-w-4xl space-y-4">
                      {/* Notification banner */}
                      {expenseSavedNotification && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in duration-200">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                            <span className="font-semibold">Configuración de gastos actualizada correctamente</span>
                          </div>
                          <button
                            onClick={() => setExpenseSavedNotification(false)}
                            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden divide-y divide-slate-200 text-xs">
                        {/* Header */}
                        <div className="p-5 pb-3">
                          <h2 className="text-base font-bold text-slate-900">Gastos</h2>
                        </div>

                        {/* 1. Facturas y gastos */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingExpenseSection === "facturasGastos" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar facturas y gastos</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>

                              <div className="space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={expenseSettings.mostrarTablaArticulosGasto}
                                    onChange={(e) => setExpenseSettings((prev) => ({ ...prev, mostrarTablaArticulosGasto: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Mostrar tabla de artículos el gasto y formularios de compra</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={expenseSettings.mostrarCampoEtiquetas}
                                    onChange={(e) => setExpenseSettings((prev) => ({ ...prev, mostrarCampoEtiquetas: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Mostrar campo Etiquetas en los formularios de compras y gastos</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={expenseSettings.seguimientoGastosArticulosCliente}
                                    onChange={(e) => setExpenseSettings((prev) => ({ ...prev, seguimientoGastosArticulosCliente: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Realizar seguimiento gastos y artículos por cliente</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={expenseSettings.hacerGastosArticulosFacturables}
                                    onChange={(e) => setExpenseSettings((prev) => ({ ...prev, hacerGastosArticulosFacturables: e.target.checked }))}
                                    className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                  />
                                  <span className="text-slate-800">Hacer gastos y artículos facturables</span>
                                </label>
                              </div>

                              <div className="pt-2 border-t border-slate-100 max-w-sm">
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Condiciones de pago de facturas de proveedores predeterminadas
                                </label>
                                <select
                                  value={expenseSettings.condicionesPagoProveedores}
                                  onChange={(e) => setExpenseSettings((prev) => ({ ...prev, condicionesPagoProveedores: e.target.value }))}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                >
                                  <option value="Net 30">Net 30</option>
                                  <option value="Net 15">Net 15</option>
                                  <option value="Net 60">Net 60</option>
                                  <option value="Al recibo (Due on receipt)">Al recibo (Due on receipt)</option>
                                </select>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingExpenseSection(null);
                                    setExpenseSavedNotification(true);
                                    setTimeout(() => setExpenseSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Facturas y gastos
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Mostrar tabla de artículos el gasto y formularios de compra</span>
                                  <span className="text-slate-600 font-medium">
                                    {expenseSettings.mostrarTablaArticulosGasto ? "Activado" : "Desactivado"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Mostrar campo Etiquetas en los formularios de compras y gastos</span>
                                  <span className="text-slate-600 font-medium">
                                    {expenseSettings.mostrarCampoEtiquetas ? "Activado" : "Desactivado"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Realizar seguimiento gastos y artículos por cliente</span>
                                  <span className="text-slate-600 font-medium">
                                    {expenseSettings.seguimientoGastosArticulosCliente ? "Activado" : "Desactivado"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Hacer gastos y artículos facturables</span>
                                  <span className="text-slate-600 font-medium">
                                    {expenseSettings.hacerGastosArticulosFacturables ? "Activado" : "Desactivado"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-700">Condiciones de pago de facturas de proveedores predeterminadas</span>
                                  <span className="text-slate-600 font-medium">
                                    {expenseSettings.condicionesPagoProveedores}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection("facturasGastos")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. Órdenes de compra */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingExpenseSection === "ordenesCompra" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar órdenes de compra</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={expenseSettings.usarOrdenesCompra}
                                  onChange={(e) => setExpenseSettings((prev) => ({ ...prev, usarOrdenesCompra: e.target.checked }))}
                                  className="rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer"
                                />
                                <span className="text-slate-800">Usar órdenes de compra</span>
                              </label>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingExpenseSection(null);
                                    setExpenseSavedNotification(true);
                                    setTimeout(() => setExpenseSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Órdenes de compra
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-slate-700">Usar órdenes de compra</span>
                                <span className="text-slate-600 font-medium">
                                  {expenseSettings.usarOrdenesCompra ? "Activado" : "Desactivado"}
                                </span>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection("ordenesCompra")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. Mensajes */}
                        <div className="p-5 hover:bg-slate-50/60 transition group">
                          {editingExpenseSection === "mensajes" ? (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">Editar mensajes de órdenes de compra</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection(null)}
                                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Mensaje de correo electrónico predeterminado que se envía con las órdenes de compra
                                </label>
                                <textarea
                                  rows={3}
                                  value={expenseSettings.mensajeOrdenesCompra}
                                  onChange={(e) => setExpenseSettings((prev) => ({ ...prev, mensajeOrdenesCompra: e.target.value }))}
                                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:border-[#f6821f] focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection(null)}
                                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingExpenseSection(null);
                                    setExpenseSavedNotification(true);
                                    setTimeout(() => setExpenseSavedNotification(false), 3000);
                                  }}
                                  className="px-4 py-1.5 rounded-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold cursor-pointer shadow-xs"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="w-56 sm:w-64 font-semibold text-slate-800 shrink-0">
                                Mensajes
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-slate-700">
                                  Mensaje de correo electrónico predeterminado que se envía con las órdenes de compra
                                </span>
                                <span className="text-slate-400"></span>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseSection("mensajes")}
                                  className="text-xs font-semibold text-[#f6821f] hover:underline cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 7: HORAS */}
                  {configSubTab === "horas" && (
                    <div className="max-w-3xl space-y-6">
                      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                        <h2 className="font-bold text-sm text-slate-900 mb-1">Jornada Laboral y Control de Tiempos</h2>
                        <p className="text-xs text-slate-500 mb-4">Parámetros de turnos y hojas de tiempo en planta.</p>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Primer día de la semana laboral</span>
                            <span className="text-slate-700">Lunes</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Jornada ordinaria máxima</span>
                            <span className="text-slate-700">8 horas / día (44 horas semanales)</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Aprobación de horas extraordinarias</span>
                            <span className="text-emerald-700 font-semibold">Requiere visto bueno de supervisión</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 8: MONEDAS */}
                  {configSubTab === "monedas" && (
                    <div className="max-w-3xl space-y-6">
                      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                        <h2 className="font-bold text-sm text-slate-900 mb-1">Cuentas Bancarias y Monedas</h2>
                        <p className="text-xs text-slate-500 mb-4">Gestión de cuentas institucionales y multidivisa.</p>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Moneda principal del sistema</span>
                            <span className="text-slate-700 font-semibold">USD ($) Dólar estadounidense</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Multidivisa</span>
                            <span className="text-emerald-700 font-semibold">Activado (USD, HNL)</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Banco de operaciones principal</span>
                            <span className="text-slate-700">Banco Ficohsa (Cuenta de cheques empresarial USD)</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Transferencias ACH Interbancarias</span>
                            <span className="text-emerald-700 font-semibold">Habilitadas</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 9: AVANZADAS */}
                  {configSubTab === "avanzadas" && (
                    <div className="max-w-3xl space-y-6">
                      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                        <h2 className="font-bold text-sm text-slate-900 mb-1">Parámetros Avanzados del Sistema</h2>
                        <p className="text-xs text-slate-500 mb-4">Configuraciones de seguridad, regionalización e infraestructura.</p>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Zona horaria</span>
                            <span className="text-slate-700">(GMT-06:00) Hora estándar central (Honduras)</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Idioma del sistema</span>
                            <span className="text-slate-700">Español (Latinoamérica)</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Cierre de sesión por inactividad</span>
                            <span className="text-slate-700">3 horas</span>
                            <button className="text-[#f6821f] font-semibold hover:underline cursor-pointer">Editar</button>
                          </div>
                          <div className="py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Base de datos empresarial</span>
                            <span className="font-mono text-emerald-700 font-semibold">PostgreSQL 17.6 Enterprise</span>
                            <span className="text-slate-400 text-[11px]">Conectada</span>
                          </div>
                        </div>
                      </div>

                      <div className="border border-red-200 rounded-xl p-5 bg-red-50/40">
                        <h2 className="font-bold text-sm text-red-900 mb-1">Sesión Administrativa</h2>
                        <p className="text-xs text-red-700 mb-4">Administrador activo: admin@waynetrademarkhn.com</p>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline Edit Modal for Other Company Settings */}
              {editingConfigKey && editingConfigKey !== "tipoEmpresa" && editingConfigKey !== "sector" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                  <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <h3 className="text-base font-bold text-slate-900 mb-1">Editar {editingConfigLabel}</h3>
                    <p className="text-xs text-slate-500 mb-4">Actualiza la información oficial de Wayne Trademark Honduras.</p>

                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{editingConfigLabel}</label>
                      {editingConfigKey === "direccion" || editingConfigKey === "domicilioLegal" ? (
                        <textarea
                          rows={3}
                          value={editingConfigValue}
                          onChange={(e) => setEditingConfigValue(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={editingConfigValue}
                          onChange={(e) => setEditingConfigValue(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f]"
                        />
                      )}
                    </div>

                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditingConfigKey(null)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveConfigField}
                        className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white text-xs font-semibold cursor-pointer shadow-md shadow-[#f6821f]/20"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

      {/* ================= MODAL: OCULTAR WIDGET CONFIRMATION ================= */}
      {hideConfirmWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close button */}
            <button
              onClick={() => setHideConfirmWidget(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="pt-2">
              <h3 className="text-xl font-bold text-slate-900 leading-snug mb-3">
                ¿Seguro que deseas ocultar este widget?
              </h3>
              <p className="text-xs text-slate-600 mb-6">
                Para volver a añadirlo, selecciona Personalizar.
              </p>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setHideConfirmWidget(null)}
                  className="px-5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (hideConfirmWidget) {
                      setVisibleWidgets((prev) => ({ ...prev, [hideConfirmWidget]: false }));
                    }
                    setHideConfirmWidget(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold text-xs transition cursor-pointer shadow-md shadow-[#f6821f]/20"
                >
                  Ocultar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ================= RIGHT SIDEBAR DRAWER: NUEVA CUENTA (Matching screenshot) ================= */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setShowNewAccountModal(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Drawer panel */}
          <aside className="relative w-full max-w-md sm:max-w-lg bg-white border-l border-slate-200 shadow-2xl z-10 flex flex-col h-full animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="w-5" />
              <h2 className="text-base font-semibold text-slate-800 text-center">
                Nueva cuenta
              </h2>
              <button
                type="button"
                onClick={() => setShowNewAccountModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAccount} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {accountModalError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
                    {accountModalError}
                  </div>
                )}
                {accountModalSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                    {accountModalSuccess}
                  </div>
                )}

                {/* Row 1: Nombre de la cuenta* & Número de cuenta */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1.5">
                      Nombre de la cuenta<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccountForm.name}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1.5">
                      Número de cuenta
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 1105 (opcional)"
                      value={newAccountForm.code}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f]"
                    />
                  </div>
                </div>

                {/* Row 2: Tipo de cuenta* & Tipo de detalles* */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5 relative">
                      <label className="text-slate-600 font-medium">
                        Tipo de cuenta<span className="text-red-500">*</span>
                      </label>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onMouseEnter={() => setShowAccountTypeTooltip(true)}
                          onMouseLeave={() => setShowAccountTypeTooltip(false)}
                          onClick={() => setShowAccountTypeTooltip(!showAccountTypeTooltip)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer flex items-center p-0.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
                          </svg>
                        </button>

                        {showAccountTypeTooltip && (
                          <div className="absolute bottom-full right-0 mb-2.5 z-40 w-72 sm:w-80 p-3 bg-slate-900 text-white rounded-lg shadow-2xl text-[11px] leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                            <p>
                              Estas son las categorías principales en las que se incluyen las cuentas. Puedes verlos en Informes como parte del balance general o de la cuenta de pérdidas y ganancias.{" "}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert("Informes: Balance general y Estado de pérdidas y ganancias disponibles en el módulo Reportes.");
                                }}
                                className="text-[#4589ff] hover:underline cursor-pointer font-medium"
                              >
                                Obtener más información
                              </span>
                            </p>
                            {/* Downward triangle arrow pointing directly to the info icon */}
                            <div className="absolute top-full right-1.5 -mt-0.5 border-4 border-transparent border-t-slate-900" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <select
                        value={newAccountForm.type}
                        onChange={(e) => {
                          const selectedType = e.target.value;
                          const defaultDetail = DETAIL_TYPES_MAP[selectedType]?.[0] || "";
                          setNewAccountForm({
                            ...newAccountForm,
                            type: selectedType,
                            detailType: defaultDetail,
                          });
                        }}
                        className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs appearance-none focus:outline-none focus:border-[#f6821f] cursor-pointer"
                      >
                        {Object.entries(ACCOUNT_CATEGORIES).map(([cat, types]) => (
                          <optgroup key={cat} label={cat} className="font-bold text-slate-900 bg-slate-50">
                            {types.map((t) => (
                              <option key={t} value={t} className="font-normal text-slate-800 bg-white">
                                {t}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <svg className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1.5">
                      Tipo de detalles<span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={newAccountForm.detailType}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, detailType: e.target.value })}
                        className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs appearance-none focus:outline-none focus:border-[#f6821f] cursor-pointer"
                      >
                        {(DETAIL_TYPES_MAP[newAccountForm.type] || [newAccountForm.type]).map((dt) => (
                          <option key={dt} value={dt}>
                            {dt}
                          </option>
                        ))}
                      </select>
                      <svg className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Row 3: Convertir en una cuenta secundaria */}
                <div className="space-y-3 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                    <input
                      type="checkbox"
                      checked={newAccountForm.isSubAccount}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, isSubAccount: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer accent-[#f6821f]"
                    />
                    <span className="font-medium text-xs">Convertir en una cuenta secundaria</span>
                  </label>

                  {newAccountForm.isSubAccount && (
                    <div className="pl-6 space-y-1">
                      <label className="text-slate-600 block text-xs">Cuenta principal</label>
                      <select
                        value={newAccountForm.parentAccountId}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, parentAccountId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#f6821f]"
                      >
                        <option value="">Seleccionar cuenta principal...</option>
                        {accounts
                          .filter(
                            (a) =>
                              getAccountClassification(a.type, a.name).category ===
                              getAccountClassification(newAccountForm.type, newAccountForm.name).category
                          )
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Row 4: Descripción */}
                <div>
                  <label className="block text-slate-600 font-medium mb-1.5">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={newAccountForm.description}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#f6821f] focus:ring-1 focus:ring-[#f6821f]"
                  />
                </div>

                {/* Divider & Bloquear cuenta */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="relative inline-block">
                      <span
                        onMouseEnter={() => setShowBlockTooltip(true)}
                        onMouseLeave={() => setShowBlockTooltip(false)}
                        className="text-slate-700 font-medium border-b border-dotted border-slate-400 cursor-help select-none"
                      >
                        Bloquear cuenta
                      </span>

                      {showBlockTooltip && (
                        <div className="absolute bottom-full left-0 mb-2.5 z-30 w-72 sm:w-80 p-3 bg-slate-900 text-white rounded-lg shadow-2xl text-[11px] leading-relaxed animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                          <p>
                            Al bloquear cuentas, los usuarios no podrán seleccionarlas en los menús desplegables de formularios y transacciones. Esto evita la contabilización incorrecta. Las funciones y las aplicaciones externas que registran transacciones automáticamente en esta cuenta seguirán haciéndolo.
                          </p>
                          <div className="absolute top-full left-4 -mt-0.5 border-4 border-transparent border-t-slate-900" />
                        </div>
                      )}
                    </div>

                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100/70">
                      <button
                        type="button"
                        onClick={() => setNewAccountForm({ ...newAccountForm, isLocked: false })}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                          !newAccountForm.isLocked
                            ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                        title="Desbloqueada"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAccountForm({ ...newAccountForm, isLocked: true })}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                          newAccountForm.isLocked
                            ? "bg-white text-[#f6821f] shadow-xs border border-slate-200"
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                        title="Bloqueada"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50/50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="relative inline-flex rounded-lg shadow-sm">
                  <button
                    type="submit"
                    disabled={accountModalLoading}
                    className="px-4 py-2 rounded-l-lg bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    {accountModalLoading ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                    className="px-2 py-2 rounded-r-lg bg-[#e07216] hover:bg-[#d06512] text-white border-l border-white/20 transition cursor-pointer flex items-center justify-center"
                  >
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${showSaveDropdown ? "rotate-180" : "rotate-0"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown: Guardar y crear nueva */}
                  {showSaveDropdown && (
                    <div className="absolute bottom-full right-0 mb-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSaveDropdown(false);
                          handleCreateAccount(undefined, true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-[#fff7ed] hover:text-[#f6821f] font-semibold transition cursor-pointer flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-[#f6821f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Guardar y crear nueva</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
      {/* ================= SIDEBAR: PERSONALIZAR (Matching screenshot) ================= */}
      {showConfigSidebar && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50 transition-opacity"
            onClick={() => setShowConfigSidebar(false)}
          />
          <aside className="fixed inset-y-0 right-0 w-80 sm:w-88 bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="w-5"></div>
              <h3 className="text-sm font-bold text-slate-800 text-center">Personalizar</h3>
              <button
                onClick={() => setShowConfigSidebar(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Section: Rows */}
              <div className="p-5 space-y-4">
                <button
                  type="button"
                  onClick={() => toggleSection("rows")}
                  className="w-full flex items-center justify-between font-bold text-slate-800 hover:text-slate-900 transition cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <svg
                      className={`w-4 h-4 text-slate-500 transform transition-transform duration-200 ${
                        collapsedSections.rows ? "-rotate-90" : "rotate-0"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>Rows</span>
                  </div>
                </button>

                {!collapsedSections.rows && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1.5 pl-5">
                      <label className="text-slate-600 block text-xs">Tamaño de página</label>
                      <div className="relative">
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium appearance-none focus:outline-none focus:border-[#f6821f] cursor-pointer"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={75}>75</option>
                          <option value={100}>100</option>
                          <option value={300}>300</option>
                        </select>
                        <svg className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <div className="space-y-1.5 pl-5">
                      <label className="text-slate-600 block text-xs">Densidad de filas</label>
                      <div className="relative">
                        <select
                          value={rowDensity}
                          onChange={(e) => setRowDensity(e.target.value as "espacioso" | "acogedor" | "compacto")}
                          className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium appearance-none focus:outline-none focus:border-[#f6821f] cursor-pointer"
                        >
                          <option value="espacioso">Espacioso</option>
                          <option value="acogedor">Acogedor</option>
                          <option value="compacto">Compacto</option>
                        </select>
                        <svg className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section: Columnas */}
              <div className="p-5 space-y-3">
                <button
                  type="button"
                  onClick={() => toggleSection("columns")}
                  className="w-full flex items-center justify-between font-bold text-slate-800 hover:text-slate-900 transition cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <svg
                      className={`w-4 h-4 text-slate-500 transform transition-transform duration-200 ${
                        collapsedSections.columns ? "-rotate-90" : "rotate-0"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>Columnas</span>
                  </div>
                </button>

                {!collapsedSections.columns && (
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] text-slate-500 pl-5">Drag to change the order of columns</p>

                    <div className="space-y-2 pl-5">
                      {[
                        { id: "code", label: "N.º" },
                        { id: "type", label: "Tipo de cuenta" },
                        { id: "detailType", label: "Tipo de detalles" },
                        { id: "description", label: "Descripción" },
                        { id: "currency", label: "Moneda" },
                        { id: "bookBalance", label: "Saldo contable" },
                        { id: "bankBalance", label: "Saldo bancario" },
                      ].map((col, index) => (
                        <div key={col.id} className="flex items-center justify-between group py-0.5">
                          <div className="flex items-center gap-2.5">
                            {/* Drag grip icon */}
                            <div className="flex items-center text-slate-400">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="8.5" cy="6.5" r="1.5" />
                                <circle cx="15.5" cy="6.5" r="1.5" />
                                <circle cx="8.5" cy="12" r="1.5" />
                                <circle cx="15.5" cy="12" r="1.5" />
                                <circle cx="8.5" cy="17.5" r="1.5" />
                                <circle cx="15.5" cy="17.5" r="1.5" />
                              </svg>
                            </div>
                            <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                              <input
                                type="checkbox"
                                checked={Boolean(visibleColumns[col.id])}
                                onChange={() =>
                                  setVisibleColumns((prev) => ({
                                    ...prev,
                                    [col.id]: !prev[col.id],
                                  }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer accent-[#f6821f]"
                              />
                              <span className="font-medium text-xs text-slate-800">{col.label}</span>
                            </label>
                          </div>

                          {/* Quick re-order arrows */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
                            {index > 0 && (
                              <button
                                type="button"
                                title="Mover arriba"
                                onClick={() => {
                                  const nextOrder = [...columnOrder];
                                  const temp = nextOrder[index - 1];
                                  nextOrder[index - 1] = nextOrder[index];
                                  nextOrder[index] = temp;
                                  setColumnOrder(nextOrder);
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                ▲
                              </button>
                            )}
                            {index < columnOrder.length - 1 && (
                              <button
                                type="button"
                                title="Mover abajo"
                                onClick={() => {
                                  const nextOrder = [...columnOrder];
                                  const temp = nextOrder[index + 1];
                                  nextOrder[index + 1] = nextOrder[index];
                                  nextOrder[index] = temp;
                                  setColumnOrder(nextOrder);
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                ▼
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section: Preferencias */}
              <div className="p-5 space-y-3">
                <button
                  type="button"
                  onClick={() => toggleSection("preferences")}
                  className="w-full flex items-center justify-between font-bold text-slate-800 hover:text-slate-900 transition cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <svg
                      className={`w-4 h-4 text-slate-500 transform transition-transform duration-200 ${
                        collapsedSections.preferences ? "-rotate-90" : "rotate-0"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>Preferencias</span>
                  </div>
                </button>

                {!collapsedSections.preferences && (
                  <div className="space-y-3 pl-5 pt-1 text-slate-700">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={alternateRowColor}
                        onChange={(e) => setAlternateRowColor(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer accent-[#f6821f]"
                      />
                      <span className="font-medium text-xs">Alternar color de fila</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showInactiveAccounts}
                        onChange={(e) => setShowInactiveAccounts(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer accent-[#f6821f]"
                      />
                      <span className="font-medium text-xs">Mostrar cuentas inactivas</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showReportBadges}
                        onChange={(e) => setShowReportBadges(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer accent-[#f6821f]"
                      />
                      <span className="font-medium text-xs">Mostrar distintivos de tipo de informe</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
      {/* ================= MODAL: CONECTAR CUENTA BANCARIA ================= */}
      {showConnectBankModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Conectar Cuenta Bancaria Institucional</h3>
                <p className="text-xs text-slate-500">Sincroniza movimientos y extractos automáticamente</p>
              </div>
              <button
                onClick={() => setShowConnectBankModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setConnectBankLoading(true);
                try {
                  const res = await fetch("/api/bank-accounts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: connectBankForm.institution,
                      accountNumber: connectBankForm.accountNumber,
                      type: `${connectBankForm.accountType} ${connectBankForm.currency}`,
                      currency: connectBankForm.currency,
                      bankBalance: 0,
                      bookBalance: 0,
                    }),
                  });
                  const json = await res.json();
                  if (json.success && json.data) {
                    setConnectedBanks((prev) => [...prev, json.data]);
                    setBankToastNotification(`Cuenta de ${connectBankForm.institution} conectada y registrada en la base de datos.`);
                    setTimeout(() => setBankToastNotification(""), 4000);
                  }
                  setShowConnectBankModal(false);
                  loadBankingData();
                } catch (err) {
                  console.error("Error connecting bank:", err);
                } finally {
                  setConnectBankLoading(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institución Financiera</label>
                <select
                  value={connectBankForm.institution}
                  onChange={(e) => setConnectBankForm({ ...connectBankForm, institution: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 font-medium cursor-pointer"
                >
                  <option value="Banco Ficohsa">Banco Ficohsa (Honduras / Regional)</option>
                  <option value="BAC Credomatic">BAC Credomatic Honduras</option>
                  <option value="Banco Atlántida">Banco Atlántida S.A.</option>
                  <option value="Banpaís">Banpaís (Banco del País)</option>
                  <option value="Banco de Occidente">Banco de Occidente</option>
                  <option value="Banco Promerica">Banco Promerica</option>
                  <option value="Chase Bank USA">Chase Bank (ACH Internacional / USD)</option>
                  <option value="Wells Fargo USA">Wells Fargo (ACH Internacional / USD)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Cuenta</label>
                  <select
                    value={connectBankForm.accountType}
                    onChange={(e) => setConnectBankForm({ ...connectBankForm, accountType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 cursor-pointer"
                  >
                    <option value="Cuenta de cheques empresarial">Cuenta de Cheques</option>
                    <option value="Cuenta de ahorros comercial">Cuenta de Ahorros</option>
                    <option value="Cuenta recaudadora">Cuenta Recaudadora</option>
                    <option value="Tarjeta de crédito corporativa">Tarjeta Corporativa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Moneda</label>
                  <select
                    value={connectBankForm.currency}
                    onChange={(e) => setConnectBankForm({ ...connectBankForm, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 cursor-pointer"
                  >
                    <option value="USD">USD ($ - Dólares)</option>
                    <option value="HNL">HNL (L - Lempiras)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Número de Cuenta (o últimos 4 dígitos)</label>
                <input
                  type="text"
                  placeholder="ej. 2108849201"
                  required
                  value={connectBankForm.accountNumber}
                  onChange={(e) => setConnectBankForm({ ...connectBankForm, accountNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Frecuencia de Sincronización Automática</label>
                <select
                  value={connectBankForm.syncFrequency}
                  onChange={(e) => setConnectBankForm({ ...connectBankForm, syncFrequency: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 cursor-pointer"
                >
                  <option value="Automática cada hora">Automática cada hora (Recomendado)</option>
                  <option value="Diaria a medianoche">Diaria a medianoche</option>
                  <option value="Manual a petición">Manual a petición</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConnectBankModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={connectBankLoading}
                  className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {connectBankLoading && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span>{connectBankLoading ? "Conectando con banco..." : "Conectar y sincronizar"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NUEVA REGLA DE AUTOMATIZACIÓN ================= */}
      {showNewRuleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Crear Regla de Automatización</h3>
                <p className="text-xs text-slate-500">Concilia automáticamente movimientos según su descripción</p>
              </div>
              <button
                onClick={() => setShowNewRuleModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newRuleForm.name || !newRuleForm.condition) return;
                try {
                  const res = await fetch("/api/bank-rules", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: newRuleForm.name,
                      condition: `Descripción contiene '${newRuleForm.condition.toUpperCase()}'`,
                      targetAccount: newRuleForm.targetAccount,
                      autoConfirm: newRuleForm.autoConfirm,
                      active: true,
                    }),
                  });
                  const json = await res.json();
                  if (json.success && json.data) {
                    setAutomationRules((prev) => [...prev, json.data]);
                    setBankToastNotification(`Regla "${newRuleForm.name}" creada y guardada en la base de datos.`);
                    setTimeout(() => setBankToastNotification(""), 4000);
                  }
                  setShowNewRuleModal(false);
                  setNewRuleForm({
                    name: "",
                    condition: "",
                    targetAccount: "5000 - Cost of Goods Sold (Costo de Ventas)",
                    autoConfirm: false,
                  });
                } catch (err) {
                  console.error("Error creating rule in DB:", err);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre de la Regla</label>
                <input
                  type="text"
                  placeholder="ej. Depósitos Clientes Búfalo"
                  required
                  value={newRuleForm.name}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Si la descripción bancaria contiene:</label>
                <input
                  type="text"
                  placeholder="ej. MANUFACTURAS BUFALO o TEXACO"
                  required
                  value={newRuleForm.condition}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, condition: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Cualquier movimiento bancario con este texto aplicará la regla.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asignar automáticamente a la cuenta contable:</label>
                <select
                  value={newRuleForm.targetAccount}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, targetAccount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#f6821f] text-slate-900 font-medium cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={`${acc.code} - ${acc.name}`}>
                      {acc.code} - {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newRuleForm.autoConfirm}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, autoConfirm: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-[#f6821f] focus:ring-[#f6821f] cursor-pointer accent-[#f6821f]"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">Auto-confirmar transacciones</span>
                    <span className="text-[11px] text-slate-500">Conciliar y agregar al libro contable sin esperar revisión manual.</span>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f6821f] hover:bg-[#e07216] text-white font-semibold transition cursor-pointer shadow-xs"
                >
                  Guardar regla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
