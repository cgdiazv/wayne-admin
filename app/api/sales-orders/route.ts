import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Seed de pedidos de venta inicial si la tabla está vacía
const initialSeedOrders = [
  {
    orderNumber: "PV-2026-0001",
    customerPoNumber: "OC-CERV-2026-8912",
    quoteNumber: "COT-2026-0001",
    customerName: "Cervecería Hondureña S.A.",
    customerRtn: "05019001234567",
    customerEmail: "compras@cerveceria.hn",
    customerPhone: "+504 2550-1000",
    customerAddress: "Blvd. del Norte, San Pedro Sula, Cortés",
    orderDate: "2026-09-02",
    expectedDeliveryDate: "2026-09-12",
    paymentTerms: "Neto 30 días",
    currency: "USD",
    salesRepName: "Carlos Menjívar",
    warehouse: "Bodega Principal Zip Búfalo",
    notes: "Pedido confirmado según O.C. cliente OC-CERV-2026-8912. Entrega en planta San Pedro Sula.",
    shippingNotes: "Enviar en tarimas plásticas con emplaye antihumedad. Horario de recepción: 08:00 a 15:00.",
    subtotal: 14200.0,
    discount: 0,
    taxRate: 15,
    tax: 2130.0,
    total: 16330.0,
    status: "EN_PREPARACION", // Almacén preparando
    items: [
      {
        productName: "Etiquetas Termoencogibles Corona 355ml",
        sku: "LBL-SLV-355",
        description: "Rollos de película PETG termoencogible con impresión flexográfica alta definición",
        quantityOrdered: 50,
        quantityCommitted: 50,
        quantityShipped: 0,
        quantityInvoiced: 0,
        rate: 200.0,
        amount: 10000.0,
      },
      {
        productName: "Cajas Corrugadas Master Box Cerveza 24pk",
        sku: "BOX-MST-024",
        description: "Empaque corrugado flauta B con barniz antihumedad",
        quantityOrdered: 2000,
        quantityCommitted: 2000,
        quantityShipped: 0,
        quantityInvoiced: 0,
        rate: 2.10,
        amount: 4200.0,
      },
    ],
  },
  {
    orderNumber: "PV-2026-0002",
    customerPoNumber: "PO-GILDAN-HN-4402",
    quoteNumber: null,
    customerName: "Gildan Activewear Villanueva",
    customerRtn: "05019003456789",
    customerEmail: "procurement@gildan.com",
    customerPhone: "+504 2670-3000",
    customerAddress: "Parque Industrial Zip Búfalo, Edificio 5, Villanueva, Cortés",
    orderDate: "2026-09-03",
    expectedDeliveryDate: "2026-09-08",
    paymentTerms: "Neto 30 días",
    currency: "USD",
    salesRepName: "Ana Lucía Rivera",
    warehouse: "Bodega Principal Zip Búfalo",
    notes: "Pedido de reposición urgente de etiquetas tejidas y de cuidado textil.",
    shippingNotes: "Entrega directa dentro del mismo parque industrial Zip Búfalo. Portón B.",
    subtotal: 9800.0,
    discount: 200.0,
    taxRate: 15,
    tax: 1440.0,
    total: 11040.0,
    status: "DESPACHADO", // Despachado, listo para facturar
    items: [
      {
        productName: "Etiquetas Satinadas Estampadas Cuidado Textil",
        sku: "LBL-SAT-001",
        description: "Cinta de raso blanco con tinta indeleble resistente a lavado industrial",
        quantityOrdered: 100000,
        quantityCommitted: 100000,
        quantityShipped: 100000,
        quantityInvoiced: 0,
        rate: 0.05,
        amount: 5000.0,
      },
      {
        productName: "Hangtags de Marca Wayne con Cordón de Algodón",
        sku: "HT-BRD-002",
        description: "Cartulina sulfatada 18pt laminado mate con perforación y cordón elástico",
        quantityOrdered: 40000,
        quantityCommitted: 40000,
        quantityShipped: 40000,
        quantityInvoiced: 0,
        rate: 0.12,
        amount: 4800.0,
      },
    ],
  },
  {
    orderNumber: "PV-2026-0003",
    customerPoNumber: "OC-EMSULA-9011",
    quoteNumber: "COT-2026-0002",
    customerName: "Embotelladora de Sula S.A. (Pepsi)",
    customerRtn: "05019002345678",
    customerEmail: "pagos@emsula.hn",
    customerPhone: "+504 2545-2000",
    customerAddress: "Carretera a Puerto Cortés, Choloma, Cortés",
    orderDate: "2026-09-04",
    expectedDeliveryDate: "2026-09-20",
    paymentTerms: "Neto 45 días",
    currency: "USD",
    salesRepName: "Ana Lucía Rivera",
    warehouse: "Bodega Principal Zip Búfalo",
    notes: "Suministro mensual programado de etiquetas BOPP en rollo.",
    shippingNotes: "Descargar en muelle 4 de bodega central Choloma. Acompañar con certificado de calidad COA.",
    subtotal: 8750.0,
    discount: 250.0,
    taxRate: 15,
    tax: 1275.0,
    total: 9775.0,
    status: "CONFIRMADO", // Confirmado por ventas
    items: [
      {
        productName: "Etiquetas BOPP Envolventes Pepsi 3 Litros",
        sku: "LBL-BOPP-3L",
        description: "Película perlada envolvente hot-melt en bobina",
        quantityOrdered: 50000,
        quantityCommitted: 50000,
        quantityShipped: 0,
        quantityInvoiced: 0,
        rate: 0.175,
        amount: 8750.0,
      },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const status = searchParams.get("status") || "ALL";
    const customerId = searchParams.get("customerId");

    // Verificar si la base de datos necesita semilla inicial
    const count = await prisma.salesOrder.count();
    if (count === 0) {
      for (const orderData of initialSeedOrders) {
        const { items, ...orderHeader } = orderData;
        await prisma.salesOrder.create({
          data: {
            ...orderHeader,
            items: {
              create: items,
            },
          },
        });
      }
    }

    // Filtros
    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }

    let orders = await prisma.salesOrder.findMany({
      where,
      include: {
        items: true,
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
          },
        },
        salesInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            total: true,
            status: true,
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    if (search) {
      orders = orders.filter(
        (o: any) =>
          o.orderNumber.toLowerCase().includes(search) ||
          (o.customerPoNumber && o.customerPoNumber.toLowerCase().includes(search)) ||
          o.customerName.toLowerCase().includes(search) ||
          (o.quoteNumber && o.quoteNumber.toLowerCase().includes(search)) ||
          (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(search)) ||
          o.items.some(
            (it: any) =>
              it.productName.toLowerCase().includes(search) ||
              (it.sku && it.sku.toLowerCase().includes(search))
          )
      );
    }

    // Calcular próximo correlativo PV-YYYY-####
    const currentYear = new Date().getFullYear();
    const totalOrdersThisYear = await prisma.salesOrder.count({
      where: {
        orderNumber: {
          startsWith: `PV-${currentYear}`,
        },
      },
    });
    const nextNumber = totalOrdersThisYear + 1;
    const nextOrderNumber = `PV-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    // Métricas por estado
    const allOrders = await prisma.salesOrder.findMany({
      select: {
        status: true,
        total: true,
      },
    });

    const metrics = {
      totalOrders: allOrders.length,
      borradores: allOrders.filter((o: any) => o.status === "BORRADOR").length,
      confirmados: allOrders.filter((o: any) => o.status === "CONFIRMADO").length,
      enPreparacion: allOrders.filter((o: any) => o.status === "EN_PREPARACION").length,
      despachados: allOrders.filter((o: any) => o.status === "DESPACHADO" || o.status === "DESPACHADO_PARCIAL").length,
      facturados: allOrders.filter((o: any) => o.status === "FACTURADO").length,
      totalMonto: allOrders.reduce((acc: number, o: any) => acc + (o.total || 0), 0),
      montoDespachadoSinFacturar: allOrders
        .filter((o: any) => o.status === "DESPACHADO")
        .reduce((acc: number, o: any) => acc + (o.total || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: orders,
      metrics,
      nextOrderNumber,
    });
  } catch (error: any) {
    console.error("GET /api/sales-orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener pedidos de venta" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      orderNumber,
      customerPoNumber,
      quoteId,
      quoteNumber,
      customerId,
      customerName,
      customerRtn,
      customerAddress,
      customerEmail,
      customerPhone,
      orderDate,
      expectedDeliveryDate,
      paymentTerms,
      currency,
      salesRepId,
      salesRepName,
      warehouse,
      notes,
      shippingNotes,
      discount,
      subtotal,
      taxRate,
      tax,
      total,
      status,
      items,
    } = body;

    if (!customerName?.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre del cliente es obligatorio." },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "El pedido debe contener al menos un producto o servicio." },
        { status: 400 }
      );
    }

    // Validar o generar número de pedido
    let finalOrderNumber = orderNumber?.trim();
    if (!finalOrderNumber) {
      const currentYear = new Date().getFullYear();
      const count = await prisma.salesOrder.count({
        where: { orderNumber: { startsWith: `PV-${currentYear}` } },
      });
      finalOrderNumber = `PV-${currentYear}-${String(count + 1).padStart(4, "0")}`;
    }

    // Verificar si ya existe
    const existing = await prisma.salesOrder.findUnique({
      where: { orderNumber: finalOrderNumber },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Ya existe un pedido con el número ${finalOrderNumber}.` },
        { status: 400 }
      );
    }

    // Crear pedido con ítems
    const newOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: finalOrderNumber,
        customerPoNumber: customerPoNumber?.trim() || null,
        quoteId: quoteId || null,
        quoteNumber: quoteNumber?.trim() || null,
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerRtn: customerRtn?.trim() || null,
        customerAddress: customerAddress?.trim() || null,
        customerEmail: customerEmail?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        orderDate: orderDate || new Date().toISOString().split("T")[0],
        expectedDeliveryDate: expectedDeliveryDate || null,
        paymentTerms: paymentTerms || "Neto 30 días",
        currency: currency || "USD",
        salesRepId: salesRepId || null,
        salesRepName: salesRepName?.trim() || null,
        warehouse: warehouse || "Bodega Principal Zip Búfalo",
        notes: notes?.trim() || null,
        shippingNotes: shippingNotes?.trim() || null,
        discount: Number(discount) || 0,
        subtotal: Number(subtotal) || 0,
        taxRate: Number(taxRate) ?? 15,
        tax: Number(tax) || 0,
        total: Number(total) || 0,
        status: status || "CONFIRMADO",
        items: {
          create: items.map((it: any) => ({
            productName: it.productName?.trim() || "Producto",
            sku: it.sku?.trim() || null,
            description: it.description?.trim() || null,
            quantityOrdered: Number(it.quantityOrdered || it.quantity) || 1,
            quantityCommitted: Number(it.quantityCommitted || it.quantityOrdered || it.quantity) || 1,
            quantityShipped: Number(it.quantityShipped) || 0,
            quantityInvoiced: Number(it.quantityInvoiced) || 0,
            rate: Number(it.rate) || 0,
            amount: Number(it.amount) || 0,
            notes: it.notes || null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Si viene de una cotización, actualizar el estado de la cotización
    if (quoteId) {
      await prisma.quote
        .update({
          where: { id: quoteId },
          data: { status: "Aprobada" },
        })
        .catch(() => null);
    }

    return NextResponse.json({
      success: true,
      data: newOrder,
      message: `Pedido de venta ${finalOrderNumber} creado exitosamente.`,
    });
  } catch (error: any) {
    console.error("POST /api/sales-orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear pedido de venta" },
      { status: 500 }
    );
  }
}
