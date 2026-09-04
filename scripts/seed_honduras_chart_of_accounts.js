const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STANDARD_HONDURAS_ACCOUNTS = {
  // 1. ACTIVOS
  "1000": { name: "Caja General", type: "Asset" },
  "1010": { name: "Caja Chica y Fondos Fijos", type: "Asset" },
  "1100": { name: "Bancos Nacionales (Cuenta de Cheques)", type: "Asset" },
  "1120": { name: "Cuentas por Cobrar Comerciales", type: "Asset" },
  "1130": { name: "Cuentas por Cobrar a Empleados y Funcionarios", type: "Asset" },
  "1150": { name: "Crédito Fiscal — Impuesto Sobre Ventas (ISV 15% / 18%)", type: "Asset" },
  "1160": { name: "Pagos a Cuenta de Impuesto Sobre la Renta (ISR)", type: "Asset" },
  "1170": { name: "Anticipos a Proveedores", type: "Asset" },
  "1200": { name: "Accounts Receivable (Cuentas por Cobrar Clientes)", type: "Asset" },
  "1300": { name: "Inventario de Mercancías / Materia Prima", type: "Asset" },
  "1310": { name: "Inventario de Producto Terminado", type: "Asset" },
  "1500": { name: "Propiedad, Planta y Equipo — Maquinaria y Equipo Industrial", type: "Asset" },
  "1510": { name: "Propiedad, Planta y Equipo — Mobiliario y Equipo de Oficina", type: "Asset" },
  "1520": { name: "Propiedad, Planta y Equipo — Equipo de Transporte y Reparto", type: "Asset" },
  "1530": { name: "Propiedad, Planta y Equipo — Equipo de Cómputo y Software", type: "Asset" },
  "1590": { name: "(-) Depreciación Acumulada de Activos Fijos", type: "Asset" },

  // 2. PASIVOS
  "2000": { name: "Cuentas por Pagar Proveedores Comerciales", type: "Liability" },
  "2100": { name: "Préstamos Bancarios y Sobregiros (Corto Plazo)", type: "Liability" },
  "2110": { name: "Sueldos y Salarios por Pagar", type: "Liability" },
  "2120": { name: "Retenciones Laborales por Pagar (IHSS, RAP, INFOP)", type: "Liability" },
  "2150": { name: "Débito Fiscal — Impuesto Sobre Ventas (ISV 15% / 18%)", type: "Liability" },
  "2160": { name: "Retenciones Fiscales por Pagar (SAR: 1% ISV, 12.5% Honorarios, 10% Alquiler)", type: "Liability" },
  "2170": { name: "Impuesto Sobre la Renta por Pagar (Provisión ISR Anual)", type: "Liability" },
  "2200": { name: "Provisiones Laborales (13º, 14º Mes y Vacaciones)", type: "Liability" },
  "2210": { name: "Provisión para Cesantía y Preaviso", type: "Liability" },
  "2500": { name: "Préstamos y Obligaciones Bancarias a Largo Plazo", type: "Liability" },

  // 3. PATRIMONIO
  "3000": { name: "Capital Social Autorizado y Pagado", type: "Equity" },
  "3100": { name: "Reserva Legal Obligatoria (5% Código de Comercio)", type: "Equity" },
  "3200": { name: "Utilidades Acumuladas de Ejercicios Anteriores", type: "Equity" },
  "3210": { name: "(-) Pérdidas Acumuladas de Ejercicios Anteriores", type: "Equity" },
  "3300": { name: "Utilidad o Pérdida del Ejercicio Actual", type: "Equity" },

  // 4. INGRESOS
  "4000": { name: "Ventas de Mercancías y Productos Gravados (ISV 15%)", type: "Income" },
  "4010": { name: "Ventas Exentas / Exportaciones (ISV 0%)", type: "Income" },
  "4100": { name: "Ingresos por Servicios de Impresión, Empaque y Diseño", type: "Income" },
  "4200": { name: "(-) Descuentos y Devoluciones sobre Ventas", type: "Income" },
  "4300": { name: "Ingresos Financieros e Intereses Ganados", type: "Income" },
  "4400": { name: "Ganancia por Diferencial Cambiario (HNL vs USD)", type: "Income" },

  // 5. COSTOS
  "5000": { name: "Costo de Ventas — Mercancías", type: "Expense" },
  "5100": { name: "Materia Prima Directa", type: "Expense" },
  "5200": { name: "Mano de Obra Directa", type: "Expense" },
  "5300": { name: "Costos Indirectos de Fabricación y Mantenimiento", type: "Expense" },

  // 6. GASTOS OPERATIVOS & ADMINISTRATIVOS
  "6000": { name: "Sueldos y Salarios de Administración", type: "Expense" },
  "6010": { name: "Beneficios y Cargas Sociales Patronales (IHSS, RAP, INFOP)", type: "Expense" },
  "6020": { name: "Décimo Tercer y Décimo Cuarto Mes (Gasto Operativo)", type: "Expense" },
  "6100": { name: "Combustibles, Lubricantes y Transporte", type: "Expense" },
  "6150": { name: "Servicios Públicos (Energía Eléctrica, Agua, Comunicaciones)", type: "Expense" },
  "6200": { name: "Papelería, Útiles de Oficina y Limpieza", type: "Expense" },
  "6300": { name: "Publicidad, Mercadeo y Comisiones de Venta", type: "Expense" },
  "6400": { name: "Gastos de Cafetería y Alimentación de Personal", type: "Expense" },
  "6500": { name: "Gasto por Depreciación de Activos Fijos", type: "Expense" },
  "6600": { name: "Gastos Financieros y Comisiones Bancarias", type: "Expense" },
  "6700": { name: "Pérdida por Diferencial Cambiario", type: "Expense" },
};

async function main() {
  console.log("Iniciando precarga del Plan de Cuentas Estándar de Honduras...");

  let createdCount = 0;
  let preservedCount = 0;

  for (const [code, meta] of Object.entries(STANDARD_HONDURAS_ACCOUNTS)) {
    const existing = await prisma.account.findUnique({
      where: { code },
    });

    if (existing) {
      console.log(`[PRESERVADA] Cuenta ${code}: ${existing.name} (Saldo: ${existing.currency} ${existing.balance})`);
      preservedCount++;
    } else {
      const created = await prisma.account.create({
        data: {
          code,
          name: meta.name,
          type: meta.type,
          currency: "USD",
          balance: 0,
          isActive: true,
        },
      });
      console.log(`[CREADA] Cuenta ${code}: ${created.name} (${created.type})`);
      createdCount++;
    }
  }

  const totalAccounts = await prisma.account.count();
  console.log("\n=======================================================");
  console.log(`Resumen de Precarga:`);
  console.log(`- Cuentas nuevas creadas: ${createdCount}`);
  console.log(`- Cuentas preexistentes preservadas: ${preservedCount}`);
  console.log(`- Total de cuentas activas en la BD: ${totalAccounts}`);
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error durante la precarga:", err);
  process.exit(1);
});
