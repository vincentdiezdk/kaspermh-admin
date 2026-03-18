// Dinero API client — prepared for when credentials are available

const DINERO_API_BASE = 'https://api.dinero.dk/v1'

export function isDineroConfigured(): boolean {
  return !!(
    process.env.DINERO_CLIENT_ID &&
    process.env.DINERO_CLIENT_SECRET &&
    process.env.DINERO_ORGANIZATION_ID &&
    process.env.DINERO_ACCESS_TOKEN
  )
}

export async function dineroFetch(endpoint: string, options: RequestInit = {}) {
  if (!isDineroConfigured()) {
    console.warn('[Dinero] Not configured — skipping API call:', endpoint)
    return null
  }

  const orgId = process.env.DINERO_ORGANIZATION_ID
  const token = process.env.DINERO_ACCESS_TOKEN

  const response = await fetch(`${DINERO_API_BASE}/${orgId}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 401) {
    console.warn('[Dinero] Token expired — needs refresh')
    // TODO: Implement token refresh with DINERO_REFRESH_TOKEN
    return null
  }

  return response.json()
}
