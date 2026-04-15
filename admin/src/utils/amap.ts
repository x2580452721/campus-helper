import { calculateDistance } from './distance'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || ''
const AMAP_WEB_KEY = import.meta.env.VITE_AMAP_WEB_KEY || ''
const AMAP_JS_KEY = import.meta.env.VITE_AMAP_JS_KEY || ''
const AMAP_SECURITY_KEY = import.meta.env.VITE_AMAP_SECURITY_KEY || ''

export { AMAP_KEY, AMAP_WEB_KEY, AMAP_JS_KEY, AMAP_SECURITY_KEY }

export type LocationInfo = {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationInfo | null> {
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_WEB_KEY}&location=${longitude},${latitude}&extensions=base`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === '1' && data.regeocode) {
      const regeo = data.regeocode
      return {
        latitude,
        longitude,
        name: regeo.formatted_address,
        address: regeo.formatted_address
      }
    }
    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

export function estimateDistanceBetweenPoints(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
) {
  return calculateDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude)
}
