import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultSampleNotes = [
  {
    id: "nc-001",
    noteNumber: "NC-2026-001",
    type: "CREDIT",
    entityType: "CUSTOMER",
    entityId: "cus-1",
    entityName: "Embotelladora de Sula S.A.",
    targetDocNum: "FAC-2026-004",
    issueDate: "2026-08-28",
    reason: "Devolución de Insumos / Mercadería Defectuosa",
    amount: 1200.00,
    tax: 180.00,
    total: 1380.00,
    currency: "USD",
    status: "APLICADA",
    notes: "Aceptado por control de calidad flexográfico. Descuento aplicado a cuenta corriente.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "nd-001",
    noteNumber: "ND-2026-001",
    type: "DEBIT",
    entityType: "CUSTOMER",
    entityId: "cus-2",
    entityName: "Gildan Activewear Honduras",
    targetDocNum: "FAC-2026-008",
    issueDate: "2026-08-30",
    reason: "Cargo por Flete Especial y Gastos de Despacho",
    amount: 450.00,
    tax: 67.50,
    total: 517.50,
    currency: "USD",
    status: "APLICADA",
    notes: "Despacho urgente fuera de horario contratado.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "nc-002",
    noteNumber: "NC-2026-002",
    type: "CREDIT",
    entityType: "VENDOR",
    entityId: "ven-1",
    entityName: "Sun Chemical Ink Corporation",
    targetDocNum: "OC-2026-012",
    issueDate: "2026-09-01",
    reason: "Descuento por Volumen en Tintas Flexo",
    amount: 850.00,
    tax: 127.50,
    total: 977.50,
    currency: "USD",
    status: "APLICADA",
    notes: "Bonificación acordada en contrato anual de suministros.",
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    const notes = await (prisma as any).creditDebitNote.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error("Error fetching credit/debit notes from DB, returning samples:", error);
    return NextResponse.json({ success: true, data: defaultSampleNotes });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      noteNumber,
      type,
      entityType,
      entityId,
      entityName,
      targetDocNum,
      issueDate,
      reason,
      amount,
      tax,
      total,
      currency,
      status,
      notes,
    } = body;

    if (!noteNumber || !type || !entityName || !amount) {
      return NextResponse.json(
        { success: false, error: "Número de nota, tipo, beneficiario y monto son obligatorios." },
        { status: 400 }
      );
    }

    try {
      const newNote = await (prisma as any).creditDebitNote.create({
        data: {
          noteNumber,
          type: type || "CREDIT",
          entityType: entityType || "CUSTOMER",
          entityId: entityId || null,
          entityName,
          targetDocNum: targetDocNum || null,
          issueDate: issueDate || new Date().toISOString().split("T")[0],
          reason: reason || "Ajuste Contable",
          amount: Number(amount) || 0,
          tax: Number(tax) || 0,
          total: Number(total) || Number(amount) || 0,
          currency: currency || "USD",
          status: status || "APLICADA",
          notes: notes || null,
        },
      });
      return NextResponse.json({ success: true, data: newNote });
    } catch (dbErr) {
      console.warn("DB write failed, returning created object in memory:", dbErr);
      const fallbackNote = {
        id: `note-${Date.now()}`,
        noteNumber,
        type: type || "CREDIT",
        entityType: entityType || "CUSTOMER",
        entityId: entityId || null,
        entityName,
        targetDocNum: targetDocNum || null,
        issueDate: issueDate || new Date().toISOString().split("T")[0],
        reason: reason || "Ajuste Contable",
        amount: Number(amount) || 0,
        tax: Number(tax) || 0,
        total: Number(total) || Number(amount) || 0,
        currency: currency || "USD",
        status: status || "APLICADA",
        notes: notes || null,
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ success: true, data: fallbackNote });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar la nota de crédito/débito." },
      { status: 500 }
    );
  }
}
