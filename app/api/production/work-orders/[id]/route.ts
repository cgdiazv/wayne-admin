import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Obtener detalle de una Orden de Trabajo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wo = await (prisma as any).workOrder.findUnique({
      where: { id },
      include: {
        items: true,
        bom: true,
      },
    });

    if (!wo) {
      return NextResponse.json(
        { success: false, error: "Orden de trabajo no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: wo });
  } catch (error: any) {
    console.error("Error al consultar orden de trabajo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar orden de trabajo" },
      { status: 500 }
    );
  }
}

// PATCH: Cambiar estado (INICIAR, CANCELAR o COMPLETAR PRODUCCIÓN)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      status, // "EN_PROCESO" | "CANCELADA" | "COMPLETADA"
      producedQuantity,
      consumedItems, // Array<{ id: string; consumedQuantity: number; lotNumber?: string }>
      assignedLotNumber,
    } = body;

    const existingWO = await (prisma as any).workOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingWO) {
      return NextResponse.json(
        { success: false, error: "Orden de trabajo no encontrada" },
        { status: 404 }
      );
    }

    // 1. Si sólo se pasa a EN_PROCESO o CANCELADA
    if (status !== "COMPLETADA") {
      const updated = await (prisma as any).workOrder.update({
        where: { id },
        data: {
          status,
          notes: body.notes !== undefined ? body.notes : existingWO.notes,
        },
        include: { items: true, bom: true },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // 2. Si se va a COMPLETAR LA ORDEN DE PRODUCCIÓN:
    // Realizamos la transacción atómica:
    // a) Descargar insumos consumidos del inventario e ItemLot
    // b) Incrementar el producto terminado en inventario y crear su ItemLot
    // c) Crear asiento contable en JournalEntry (Débito Producto Terminado, Crédito Materia Prima)
    // d) Actualizar WorkOrder a COMPLETADA
    const finalProducedQty = Number(producedQuantity ?? existingWO.targetQuantity) || 1;
    const finalLot = assignedLotNumber || existingWO.assignedLotNumber || `LOT-PRD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async (tx: any) => {
      let calculatedRawCost = 0;

      // 2.a Descontar cada insumo consumido
      for (const item of existingWO.items) {
        const itemUpdate = consumedItems?.find((c: any) => c.id === item.id);
        const actualConsumedQty = itemUpdate ? Number(itemUpdate.consumedQuantity) : item.consumedQuantity;
        const usedLot = itemUpdate?.lotNumber || item.lotNumber;

        calculatedRawCost += actualConsumedQty * item.unitCost;

        // Actualizar item de la OT
        await tx.workOrderItem.update({
          where: { id: item.id },
          data: {
            consumedQuantity: actualConsumedQty,
            lotNumber: usedLot,
            totalCost: actualConsumedQty * item.unitCost,
          },
        });

        // Buscar producto materia prima en InventoryItem
        let rawItem = null;
        if (item.rawMaterialId) {
          rawItem = await tx.inventoryItem.findUnique({ where: { id: item.rawMaterialId } });
        } else if (item.rawMaterialSku) {
          rawItem = await tx.inventoryItem.findUnique({ where: { sku: item.rawMaterialSku } });
        }

        if (rawItem) {
          // Descontar existencia general
          const newQty = Math.max(0, (rawItem.quantity || 0) - actualConsumedQty);
          await tx.inventoryItem.update({
            where: { id: rawItem.id },
            data: { quantity: newQty },
          });

          // Si tiene lote asignado, descontar del ItemLot
          if (usedLot) {
            const lotRecord = await tx.itemLot.findFirst({
              where: {
                inventoryItemId: rawItem.id,
                lotNumber: usedLot,
              },
            });
            if (lotRecord) {
              const newLotQty = Math.max(0, (lotRecord.quantity || 0) - actualConsumedQty);
              await tx.itemLot.update({
                where: { id: lotRecord.id },
                data: { quantity: newLotQty },
              });
            }
          }
        }
      }

      // 2.b Dar de alta el producto terminado
      const totalProductionCost = calculatedRawCost + (existingWO.totalLaborCost || 0) + (existingWO.totalOverheadCost || 0);
      const unitCostFinal = finalProducedQty > 0 ? totalProductionCost / finalProducedQty : 0;

      let finishedProduct = null;
      if (existingWO.productId) {
        finishedProduct = await tx.inventoryItem.findUnique({ where: { id: existingWO.productId } });
      } else if (existingWO.productSku) {
        finishedProduct = await tx.inventoryItem.findUnique({ where: { sku: existingWO.productSku } });
      }

      if (finishedProduct) {
        const newFinishedQty = (finishedProduct.quantity || 0) + finalProducedQty;
        // Costo promedio ponderado si ya había stock
        const currentTotalVal = (finishedProduct.quantity || 0) * (finishedProduct.cost || 0);
        const newAvgCost = newFinishedQty > 0 ? (currentTotalVal + totalProductionCost) / newFinishedQty : unitCostFinal;

        await tx.inventoryItem.update({
          where: { id: finishedProduct.id },
          data: {
            quantity: newFinishedQty,
            cost: Number(newAvgCost.toFixed(4)),
            trackingType: finishedProduct.trackingType === "NONE" ? "LOT" : finishedProduct.trackingType,
          },
        });

        // Registrar o actualizar Lote de producción del producto terminado
        const existingLot = await tx.itemLot.findFirst({
          where: {
            inventoryItemId: finishedProduct.id,
            lotNumber: finalLot,
          },
        });

        if (existingLot) {
          await tx.itemLot.update({
            where: { id: existingLot.id },
            data: {
              quantity: existingLot.quantity + finalProducedQty,
              manufactureDate: new Date(),
            },
          });
        } else {
          await tx.itemLot.create({
            data: {
              inventoryItemId: finishedProduct.id,
              lotNumber: finalLot,
              quantity: finalProducedQty,
              manufactureDate: new Date(),
              notes: `Fabricado en OT #${existingWO.orderNumber}`,
            },
          });
        }
      }

      // 2.c Generar asiento contable automático
      // Buscar cuentas contables de inventario
      const allAccounts = await tx.account.findMany();
      // Inventario Producto Terminado (ej: 1300 o 1150)
      const finishedGoodsAcc = allAccounts.find(
        (a: any) =>
          a.code === "1150" ||
          a.code === "1300" ||
          a.name.toLowerCase().includes("producto terminado") ||
          a.name.toLowerCase().includes("mercaderías")
      ) || allAccounts.find((a: any) => a.type.toLowerCase().includes("asset")) || allAccounts[0];

      // Inventario Materia Prima (ej: 1140 o 1310)
      const rawMaterialsAcc = allAccounts.find(
        (a: any) =>
          a.code === "1140" ||
          a.code === "1310" ||
          a.name.toLowerCase().includes("materia prima") ||
          a.name.toLowerCase().includes("insumo")
      ) || allAccounts.find((a: any) => a.type.toLowerCase().includes("asset")) || allAccounts[0];

      const entryNumber = `AS-PRD-${existingWO.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}`;
      const todayStr = new Date().toISOString().split("T")[0];

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: todayStr,
          concept: `Producción de ${finalProducedQty} unds de ${existingWO.productName} (OT #${existingWO.orderNumber}, Lote: ${finalLot})`,
          referenceType: "MANUAL",
          referenceId: existingWO.orderNumber,
          currency: "USD",
          status: "POSTED",
          lines: {
            create: [
              {
                accountId: finishedGoodsAcc.id,
                accountCode: finishedGoodsAcc.code,
                accountName: finishedGoodsAcc.name,
                description: `Entrada de Producto Terminado fabricado (OT #${existingWO.orderNumber})`,
                debit: totalProductionCost,
                credit: 0,
              },
              {
                accountId: rawMaterialsAcc.id,
                accountCode: rawMaterialsAcc.code,
                accountName: rawMaterialsAcc.name,
                description: `Consumo de Materia Prima / Insumos en proceso (OT #${existingWO.orderNumber})`,
                debit: 0,
                credit: totalProductionCost,
              },
            ],
          },
        },
      });

      // 2.d Actualizar Orden de Trabajo
      const completedWO = await tx.workOrder.update({
        where: { id },
        data: {
          status: "COMPLETADA",
          producedQuantity: finalProducedQty,
          completionDate: todayStr,
          assignedLotNumber: finalLot,
          totalRawCost: calculatedRawCost,
          totalCost: totalProductionCost,
          unitCostFinal,
          journalEntryId: journalEntry.id,
        },
        include: {
          items: true,
          bom: true,
        },
      });

      return completedWO;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error al actualizar orden de trabajo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar orden de trabajo" },
      { status: 500 }
    );
  }
}
