// GET /api/dinero/callback?code=xxx
// Exchanges authorization code for access token
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return Response.json({ error: 'No authorization code' }, { status: 400 })
  }

  try {
    const tokenResponse = await fetch('https://connect.visma.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DINERO_REDIRECT_URI!,
        client_id: process.env.DINERO_CLIENT_ID!,
        client_secret: process.env.DINERO_CLIENT_SECRET!,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return Response.json({ error: 'Token exchange failed', details: tokens }, { status: 400 })
    }

    // Fetch organizations to get the org ID
    const orgsResponse = await fetch('https://api.dinero.dk/v1/organizations', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    })
    const orgs = await orgsResponse.json()

    return Response.json({
      message: 'Dinero forbundet! Gem disse som miljøvariabler i Vercel:',
      DINERO_ACCESS_TOKEN: tokens.access_token,
      DINERO_REFRESH_TOKEN: tokens.refresh_token,
      organizations: orgs,
      note: 'Sæt DINERO_ORGANIZATION_ID til den ønskede organisations ID',
    })
  } catch (err) {
    console.error('[Dinero] OAuth callback error:', err)
    return Response.json({ error: 'OAuth callback fejlede' }, { status: 500 })
  }
}
