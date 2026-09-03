import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      invoiceNumber = "1001",
      customerName = "Estimado cliente",
      invoiceDate = new Date().toISOString().split("T")[0],
      dueDate = "",
      paymentTerms = "Neto 30",
      lines = [],
      subtotal = 0,
      total = 0,
      paymentInstructions = "",
      customerNote = "",
      apiKey: customApiKey,
    } = body;

    if (!to || typeof to !== "string" || !to.includes("@")) {
      return NextResponse.json(
        { error: "Se requiere un correo electrónico de destino válido ('to')." },
        { status: 400 }
      );
    }

    const apiKey = customApiKey || process.env.RESEND_API_KEY || "re_dummy_key";

    const resend = new Resend(apiKey);

    const itemsTableRowsHtml = lines
      .map(
        (line: any, idx: number) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; font-size: 12px; color: #64748b; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; font-size: 12px; color: #0f172a; font-weight: 600;">${line.productName || line.description || "Artículo"}</td>
          <td style="padding: 10px; font-size: 11px; color: #f6821f; font-family: monospace;">${line.sku || "—"}</td>
          <td style="padding: 10px; font-size: 12px; color: #334155;">${line.description || "—"}</td>
          <td style="padding: 10px; font-size: 12px; color: #0f172a; text-align: right; font-family: monospace;">${line.quantity || 1}</td>
          <td style="padding: 10px; font-size: 12px; color: #0f172a; text-align: right; font-family: monospace;">$${(line.rate || 0).toFixed(2)}</td>
          <td style="padding: 10px; font-size: 12px; color: #0f172a; text-align: right; font-family: monospace; font-weight: 700;">$${(line.amount || 0).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Factura ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- HEADER -->
          <tr>
            <td style="background-color: #004d40; padding: 24px 32px; color: #ffffff;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">WAYNE TRADEMARK</h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #a7f3d0;">Printing & Packaging de Honduras</p>
                  </td>
                  <td align="right">
                    <span style="background-color: #f6821f; color: #ffffff; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 20px; text-transform: uppercase;">Factura N.º ${invoiceNumber}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #0f172a;">Estimado/a ${customerName},</p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #475569; line-height: 1.6;">
                Adjuntamos los detalles oficiales de su factura correspondiente a la emisión del ${invoiceDate}. Agradecemos su confianza en Wayne Trademark.
              </p>

              <!-- METADATA BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="font-size: 12px; color: #64748b; padding-bottom: 8px;">
                    <strong>Fecha de factura:</strong> <span style="color: #0f172a;">${invoiceDate}</span>
                  </td>
                  <td width="50%" style="font-size: 12px; color: #64748b; padding-bottom: 8px;" align="right">
                    <strong>Vencimiento:</strong> <span style="color: #0f172a;">${dueDate || "A la vista"}</span>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="font-size: 12px; color: #64748b;">
                    <strong>Términos de pago:</strong> <span style="color: #0f172a;">${paymentTerms}</span>
                  </td>
                  <td width="50%" style="font-size: 12px; color: #64748b;" align="right">
                    <strong>Moneda:</strong> <span style="color: #0f172a;">USD ($)</span>
                  </td>
                </tr>
              </table>

              <!-- ITEMS TABLE -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                  <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    <th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569; text-align: center; width: 30px;">#</th>
                    <th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569; text-align: left;">Producto / Servicio</th>
                    <th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569; text-align: left;">SKU</th>
                    <th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569; text-align: left;">Descripción</th>
                    <th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569; text-align: right;">Cant.</th>
                    <th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569; text-align: right;">Tarifa</th>
                    <th style="padding: 10px; font-size: 11px; font-weight: 700; color: #475569; text-align: right;">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsTableRowsHtml || `<tr><td colSpan="7" style="padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">Sin ítems desglosados</td></tr>`}
                </tbody>
              </table>

              <!-- TOTALS SUMMARY BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff7ed; border-radius: 12px; border: 1px solid #fed7aa; padding: 16px;">
                      <tr>
                        <td style="font-size: 12px; color: #475569;">Subtotal:</td>
                        <td align="right" style="font-size: 12px; font-weight: 700; color: #0f172a; font-family: monospace;">$${subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; font-weight: 800; color: #0f172a; padding-top: 8px;">Total a pagar:</td>
                        <td align="right" style="font-size: 18px; font-weight: 900; color: #f6821f; font-family: monospace; padding-top: 8px;">$${total.toFixed(2)} USD</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${
                paymentInstructions
                  ? `
              <!-- INSTRUCCIONES DE PAGO -->
              <div style="background-color: #f8fafc; border-left: 4px solid #f6821f; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #475569; uppercase;">Instrucciones de Pago:</p>
                <p style="margin: 0; font-size: 12px; color: #1e293b;">${paymentInstructions}</p>
              </div>
              `
                  : ""
              }

              ${
                customerNote
                  ? `
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b; italic;">
                "${customerNote}"
              </p>
              `
                  : ""
              }

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">Wayne Trademark Printing & Packaging de Honduras S. de R.L.</p>
              <p style="margin: 0 0 4px 0;">ZIP Búfalo, Nave 12, Villanueva, Cortés, Honduras</p>
              <p style="margin: 0; color: #94a3b8;">Atención al cliente: sac@waynetrademarkhn.com | Tel: +504 2550-0000</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: "Wayne Trademark <notifications@indevasa.com>",
      to: [to],
      replyTo: "sac@waynetrademarkhn.com",
      subject: `Factura N.º ${invoiceNumber} - Wayne Trademark Honduras`,
      html: emailHtml,
    });

    if (error) {
      console.error("Error al enviar correo con Resend:", error);
      return NextResponse.json(
        { error: error.message || "Falló el envío a través de Resend." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Factura ${invoiceNumber} enviada correctamente a ${to}`,
    });
  } catch (err: any) {
    console.error("Error en POST /api/send-invoice:", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
