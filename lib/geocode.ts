/**
 * Geocode an address using Google Geocoding API.
 * Returns null if API key is not set or if geocoding fails.
 * Designed for graceful degradation — never throws.
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return null
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=dk&language=da`
    const res = await fetch(url)

    if (!res.ok) {
      console.warn('[Geocode] API returned status', res.status)
      return null
    }

    const data = await res.json()

    if (data.status !== 'OK' || !data.results?.[0]) {
      return null
    }

    const location = data.results[0].geometry.location
    return { lat: location.lat, lng: location.lng }
  } catch (err) {
    console.warn('[Geocode] Failed:', err)
    return null
  }
}
