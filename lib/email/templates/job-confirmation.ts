export function jobConfirmationEmail(data: {
  customerName: string
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  address: string
  companyName: string
  companyPhone: string
}): string {
  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background:#16a34a;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;">${data.companyName}</h1>
        <p style="margin:4px 0 0;color:#dcfce7;font-size:14px;">Jobbekræftelse</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;color:#111827;">Kære ${data.customerName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;">Tak for din bestilling! Her er detaljerne for dit kommende besøg:</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
          <tr>
            <td style="padding:12px 16px;font-size:14px;color:#6b7280;">Service</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:14px;color:#6b7280;border-top:1px solid #bbf7d0;">Dato</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #bbf7d0;">${data.scheduledDate}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:14px;color:#6b7280;border-top:1px solid #bbf7d0;">Tidspunkt</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #bbf7d0;">${data.scheduledTime || 'Aftales nærmere'}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:14px;color:#6b7280;border-top:1px solid #bbf7d0;">Adresse</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #bbf7d0;">${data.address}</td>
          </tr>
        </table>

        <h3 style="margin:0 0 16px;font-size:15px;color:#111827;">Hvad sker der videre?</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:32px;">
              <span style="display:inline-block;width:24px;height:24px;background:#16a34a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">1</span>
            </td>
            <td style="padding:8px 0 8px 12px;font-size:14px;color:#374151;"><strong>Vi ankommer</strong> — Vi møder op på den aftalte dato og tid</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:32px;">
              <span style="display:inline-block;width:24px;height:24px;background:#16a34a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">2</span>
            </td>
            <td style="padding:8px 0 8px 12px;font-size:14px;color:#374151;"><strong>Vi udfører arbejdet</strong> — Professionelt og grundigt</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:32px;">
              <span style="display:inline-block;width:24px;height:24px;background:#16a34a;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;">3</span>
            </td>
            <td style="padding:8px 0 8px 12px;font-size:14px;color:#374151;"><strong>Du modtager rapport</strong> — Med før/efter fotos af arbejdet</td>
          </tr>
        </table>

        <p style="margin:0;font-size:14px;color:#6b7280;">Har du spørgsmål? Ring til os på ${data.companyPhone}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#f3f4f6;padding:20px 32px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">${data.companyName} | ${data.companyPhone}</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
