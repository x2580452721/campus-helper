declare const TARO_APP_AMAP_KEY: string
declare const TARO_APP_AMAP_WEB_KEY: string
declare const TARO_APP_AMAP_JS_KEY: string
declare const TARO_APP_AMAP_SECURITY_KEY: string
declare const TARO_APP_MAP_WEBVIEW_URL: string
declare const require: any
declare const wx: any
import { calculateDistance } from './distance'

const AMAP_KEY = TARO_APP_AMAP_KEY || ''
const AMAP_WEB_KEY = TARO_APP_AMAP_WEB_KEY || ''
const AMAP_JS_KEY = TARO_APP_AMAP_JS_KEY || ''
const AMAP_SECURITY_KEY = TARO_APP_AMAP_SECURITY_KEY || ''
const AMAP_WEBVIEW_URL = TARO_APP_MAP_WEBVIEW_URL || ''

export { AMAP_KEY, AMAP_WEB_KEY, AMAP_JS_KEY, AMAP_SECURITY_KEY, AMAP_WEBVIEW_URL }

export function getAmapWebviewDisableReason(url: string): string {
  if (!url) return ''

  if (/supabase\.co\/storage\/v1\/object\/public\//i.test(url)) {
    return '当前高德地图 H5 页面部署在 Supabase Storage，该地址会把 HTML 以 text/plain 返回，小程序 WebView 无法渲染。'
  }

  return ''
}

export function canUseAmapWebview(url: string): boolean {
  return Boolean(url) && !getAmapWebviewDisableReason(url)
}

export interface LocationInfo {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface RouteInfo {
  distance: number
  duration: number
  steps: RouteStep[]
  polyline?: RoutePoint[]
}

export interface RouteStep {
  instruction: string
  distance: number
  duration: number
}

export interface RoutePoint {
  latitude: number
  longitude: number
}

type AMapWxRouteResult = {
  paths?: Array<{
    distance?: string | number
    duration?: string | number
    steps?: Array<{
      instruction?: string
      distance?: string | number
      duration?: string | number
      polyline?: string
    }>
  }>
}

type AMapWxSdk = {
  getRegeo: (options: {
    location?: string
    success: (result: Array<{
      name?: string
      desc?: string
      longitude?: number
      latitude?: number
    }>) => void
    fail: (error: any) => void
  }) => void
  getWalkingRoute: (options: {
    origin: string
    destination: string
    success: (result: AMapWxRouteResult) => void
    fail: (error: any) => void
  }) => void
}

let amapWxSdk: AMapWxSdk | null = null

function getWeappAmapWxSdk(): AMapWxSdk | null {
  if (process.env.TARO_ENV !== 'weapp') {
    return null
  }

  if (amapWxSdk) {
    return amapWxSdk
  }

  try {
    const sdkModule = require('../libs/amap-wx.js')
    const AMapWX = sdkModule?.AMapWX || sdkModule?.default?.AMapWX || sdkModule?.default

    if (!AMapWX) {
      console.warn('[amap] 未能加载高德微信小程序 SDK')
      return null
    }

    amapWxSdk = new AMapWX({
      key: AMAP_WEB_KEY || AMAP_KEY
    })
    return amapWxSdk
  } catch (error) {
    console.warn('[amap] 加载高德微信小程序 SDK 失败:', error)
    return null
  }
}

function parseRoutePolyline(paths?: AMapWxRouteResult['paths']): RoutePoint[] {
  const path = paths?.[0]
  if (!path?.steps) {
    return []
  }

  const points: RoutePoint[] = []

  for (const step of path.steps) {
    if (!step.polyline) {
      continue
    }

    for (const point of step.polyline.split(';')) {
      const [longitude, latitude] = point.split(',').map(Number)
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        points.push({
          latitude,
          longitude
        })
      }
    }
  }

  return points
}

function toRouteInfo(route: AMapWxRouteResult | null | undefined): RouteInfo | null {
  const path = route?.paths?.[0]
  if (!path) {
    return null
  }

  const steps = (path.steps || []).map((step: any) => ({
    instruction: step.instruction || '',
    distance: parseInt(String(step.distance || 0), 10),
    duration: parseInt(String(step.duration || 0), 10)
  }))

  return {
    distance: parseInt(String(path.distance || 0), 10),
    duration: parseInt(String(path.duration || 0), 10),
    steps,
    polyline: parseRoutePolyline(route.paths)
  }
}

export function buildFallbackRouteInfo(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): RouteInfo {
  const distance = Math.max(0, calculateDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude))
  const walkingSpeedMps = 1.25
  const duration = Math.max(60, Math.round(distance / walkingSpeedMps))

  if (distance === 0) {
    return {
      distance: 0,
      duration: 60,
      steps: [
        {
          instruction: '当前位置与目的地重合，直接进入任务点即可',
          distance: 0,
          duration: 60
        }
      ],
      polyline: [
        { latitude: origin.latitude, longitude: origin.longitude }
      ]
    }
  }

  const firstLeg = Math.max(1, Math.round(distance * 0.45))
  const secondLeg = Math.max(1, Math.round(distance * 0.35))
  const finalLeg = Math.max(1, distance - firstLeg - secondLeg)
  const firstDuration = Math.max(20, Math.round(duration * 0.35))
  const secondDuration = Math.max(20, Math.round(duration * 0.35))
  const finalDuration = Math.max(20, duration - firstDuration - secondDuration)

  return {
    distance,
    duration,
    steps: [
      {
        instruction: '从当前位置出发，沿校园主路前往任务点方向',
        distance: firstLeg,
        duration: firstDuration
      },
      {
        instruction: '继续前行，留意路口提示和沿途建筑编号',
        distance: secondLeg,
        duration: secondDuration
      },
      {
        instruction: '到达目的地附近，按现场标识完成最后一段路径',
        distance: finalLeg,
        duration: finalDuration
      }
    ],
    polyline: [
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    ]
  }
}

async function requestAmap(url: string): Promise<any> {
  const env = process.env.TARO_ENV

  if (env === 'weapp') {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'GET',
        success: (res) => {
          resolve(res.data)
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  } else {
    const response = await fetch(url)
    return await response.json()
  }
}

export async function geocode(address: string, city?: string): Promise<LocationInfo | null> {
  try {
    const cityParam = city ? `&city=${encodeURIComponent(city)}` : ''
    const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_WEB_KEY}&address=${encodeURIComponent(address)}${cityParam}`

    const data = await requestAmap(url)

    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      const geo = data.geocodes[0]
      const [lng, lat] = geo.location.split(',').map(Number)
      return {
        latitude: lat,
        longitude: lng,
        name: geo.formatted_address,
        address: geo.formatted_address
      }
    }
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationInfo | null> {
  try {
    const sdk = getWeappAmapWxSdk()
    if (sdk) {
      return await new Promise<LocationInfo | null>((resolve) => {
        sdk.getRegeo({
          location: `${longitude},${latitude}`,
          success: (result) => {
            const first = Array.isArray(result) ? result[0] : null
            if (!first) {
              resolve(null)
              return
            }

            const name = first.name || first.desc || '地图选点'
            const address = first.desc || first.name || '校园内'
            resolve({
              latitude,
              longitude,
              name,
              address
            })
          },
          fail: (error) => {
            console.error('AMapWX 逆地理编码失败:', error)
            resolve(null)
          }
        })
      })
    }

    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_WEB_KEY}&location=${longitude},${latitude}&extensions=base`

    const data = await requestAmap(url)

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

export async function getWalkingRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<RouteInfo | null> {
  try {
    const sdk = getWeappAmapWxSdk()
    if (sdk) {
      const sdkRoute = await new Promise<RouteInfo | null>((resolve) => {
        sdk.getWalkingRoute({
          origin: `${origin.longitude},${origin.latitude}`,
          destination: `${destination.longitude},${destination.latitude}`,
          success: (result) => {
            resolve(toRouteInfo(result))
          },
          fail: (error) => {
            console.error('AMapWX 步行路线失败:', error)
            resolve(null)
          }
        })
      })

      if (sdkRoute) {
        return sdkRoute
      }
    }

    const originStr = `${origin.longitude},${origin.latitude}`
    const destStr = `${destination.longitude},${destination.latitude}`
    const url = `https://restapi.amap.com/v3/direction/walking?key=${AMAP_WEB_KEY}&origin=${originStr}&destination=${destStr}`

    const data = await requestAmap(url)

    if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
      return toRouteInfo(data.route)
    }
    return buildFallbackRouteInfo(origin, destination)
  } catch (error) {
    console.error('Route planning error:', error)

    try {
      const originStr = `${origin.longitude},${origin.latitude}`
      const destStr = `${destination.longitude},${destination.latitude}`
      const url = `https://restapi.amap.com/v3/direction/walking?key=${AMAP_WEB_KEY}&origin=${originStr}&destination=${destStr}`
      const data = await requestAmap(url)
      if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
        return toRouteInfo(data.route)
      }
    } catch (fallbackError) {
      console.error('Route planning fallback error:', fallbackError)
    }

    return buildFallbackRouteInfo(origin, destination)
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分钟`
}
