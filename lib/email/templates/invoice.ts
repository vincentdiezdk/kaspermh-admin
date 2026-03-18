export function invoiceEmail(data: {
  customerName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  services: { name: string; quantity: number; unit: string; unitPrice: number; total: number }[]
  subtotal: number
  vat: number
  total: number
  bankReg: string
  bankAccount: string
  mobilepayNumber: string
  companyName: string
  companyCvr: string
  companyAddress: string
}): string {
  const serviceRows = data.services
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${s.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${s.quantity} ${s.unit}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${s.unitPrice.toLocaleString('da-DK')} kr</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${s.total.toLocaleString('da-DK')} kr</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background:#16a34a;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;">${data.companyName}</h1>
        <p style="margin:4px 0 0;color:#dcfce7;font-size:14px;font-weight:700;">FAKTURA</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="font-size:14px;color:#6b7280;">Fakturanr.</td>
            <td style="font-size:14px;font-weight:600;color:#111827;text-align:right;">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#6b7280;padding-top:4px;">Dato</td>
            <td style="font-size:14px;color:#111827;text-align:right;padding-top:4px;">${data.invoiceDate}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#6b7280;padding-top:4px;">Forfaldsdato</td>
            <td style="font-size:14px;font-weight:600;color:#dc2626;text-align:right;padding-top:4px;">${data.dueDate}</td>
          </tr>
        </table>

        <p style="margin:0 0 16px;font-size:16px;color:#111827;">Kære ${data.customerName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;">Hermed fremsendes faktura for udført arbejde:</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#374151;">Service</th>
            <th style="padding:10px 12px;text-align:center;font-size:13px;color:#374151;">Antal</th>
            <th style="padding:10px 12px;text-align:right;font-size:13px;color:#374151;">Enhedspris</th>
            <th style="padding:10px 12px;text-align:right;font-size:13px;color:#374151;">Total</th>
          </tr>
          ${serviceRows}
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
          <tr>
            <td style="padding:6px 16px;font-size:14px;color:#374151;">Subtotal</td>
            <td style="padding:6px 16px;text-align:right;font-size:14px;color:#374151;">${data.subtotal.toLocaleString('da-DK')} kr</td>
          </tr>
          <tr>
            <td style="padding:6px 16px;font-size:14px;color:#374151;">Moms 25%</td>
            <td style="padding:6px 16px;text-align:right;font-size:14px;color:#374151;">${data.vat.toLocaleString('da-DK')} kr</td>
          </tr>
          <tr>
            <td style="padding:8px 16px;font-size:18px;font-weight:700;color:#16a34a;">Total inkl. moms</td>
            <td style="padding:8px 16px;text-align:right;font-size:18px;font-weight:700;color:#16a34a;">${data.total.toLocaleString('da-DK')} kr</td>
          </tr>
        </table>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
          <h4 style="margin:0 0 12px;font-size:14px;color:#111827;">Betalingsoplysninger</h4>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:2px 16px 2px 0;">Reg. nr.</td>
              <td style="font-size:13px;font-weight:600;color:#111827;">${data.bankReg}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:2px 16px 2px 0;">Kontonr.</td>
              <td style="font-size:13px;font-weight:600;color:#111827;">${data.bankAccount}</td>
            </tr>
            ${data.mobilepayNumber ? `
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:2px 16px 2px 0;">MobilePay</td>
              <td style="font-size:13px;font-weight:600;color:#111827;">${data.mobilepayNumber}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <p style="margin:0;font-size:14px;color:#6b7280;">Betaling bedes foretaget senest <strong>${data.dueDate}</strong>.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f3f4f6;padding:20px 32px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">${data.companyName} | CVR: ${data.companyCvr}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">${data.companyAddress}</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
