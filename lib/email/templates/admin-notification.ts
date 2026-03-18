export function adminNotificationEmail(data: {
  type: 'new_lead' | 'quote_accepted' | 'quote_expired'
  title: string
  details: string
  actionUrl: string
}): string {
  const emoji =
    data.type === 'new_lead'
      ? '\u{1F534}'
      : data.type === 'quote_accepted'
        ? '\u2705'
        : '\u23F0'

  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background:#16a34a;padding:16px 24px;">
        <h1 style="margin:0;color:#ffffff;font-size:16px;">KasperMH Admin</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">${emoji} ${data.title}</h2>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;white-space:pre-line;">${data.details}</p>
        <a href="${data.actionUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Se detaljer</a>
      </td>
    </tr>
  </table>
</body>
</html>`
}
