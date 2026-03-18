// GET /api/dinero/connect
// Redirects user to Visma Connect OAuth page
export async function GET() {
  const clientId = process.env.DINERO_CLIENT_ID
  const redirectUri = process.env.DINERO_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return Response.json({ error: 'Dinero not configured' }, { status: 500 })
  }

  const authUrl = new URL('https://connect.visma.com/connect/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'dineropublicapi:read dineropublicapi:write offline_access')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('ui_locales', 'da-DK')

  return Response.redirect(authUrl.toString())
}
