export function jobReportEmail(data: {
  customerName: string
  jobNumber: string
  serviceName: string
  completedDate: string
  customerNotes: string
  beforePhotos: string[]
  afterPhotos: string[]
  companyName: string
  companyPhone: string
}): string {
  const photoGrid = (photos: string[]) =>
    photos.length === 0
      ? '<p style="font-size:13px;color:#9ca3af;margin:0;">Ingen fotos</p>'
      : `<table cellpadding="0" cellspacing="0" width="100%"><tr>${photos
          .slice(0, 4)
          .map(
            (url) =>
              `<td style="padding:4px;width:50%;"><img src="${url}" alt="Foto" style="width:100%;border-radius:6px;display:block;" /></td>`
          )
          .join('')}</tr></table>`

  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background:#16a34a;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;">${data.companyName}</h1>
        <p style="margin:4px 0 0;color:#dcfce7;font-size:14px;">Jobraport</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;color:#111827;">Kære ${data.customerName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;">Dit job er afsluttet! Her er en rapport over det udførte arbejde.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
          <tr>
            <td style="padding:12px 16px;font-size:14px;color:#6b7280;">Job nr.</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;">${data.jobNumber}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">Service</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">Afsluttet</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">${data.completedDate}</td>
          </tr>
        </table>

        ${data.beforePhotos.length > 0 ? `
        <h3 style="margin:0 0 12px;font-size:15px;color:#111827;">FØR</h3>
        <div style="margin-bottom:24px;">
          ${photoGrid(data.beforePhotos)}
        </div>
        ` : ''}

        ${data.afterPhotos.length > 0 ? `
        <h3 style="margin:0 0 12px;font-size:15px;color:#16a34a;">EFTER</h3>
        <div style="margin-bottom:24px;">
          ${photoGrid(data.afterPhotos)}
        </div>
        ` : ''}

        ${data.customerNotes ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
          <h4 style="margin:0 0 8px;font-size:14px;color:#16a34a;">Noter fra os</h4>
          <p style="margin:0;font-size:14px;color:#374151;white-space:pre-wrap;">${data.customerNotes}</p>
        </div>
        ` : ''}

        <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Faktura følger separat.</p>
        <p style="margin:0;font-size:14px;color:#6b7280;">Har du spørgsmål, er du velkommen til at kontakte os på ${data.companyPhone}.</p>
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
