import Taro from '@tarojs/taro'
import { normalizeCoordinate, type NormalizedCoordinate } from './mapData'

export interface ResolvedLocation extends NormalizedCoordinate {
  name: string
  address: string
  source: 'weapp' | 'browser' | 'capacitor' | 'stored' | 'default'
}

export const DEFAULT_CAMPUS_LOCATION: ResolvedLocation = {
  latitude: 39.9155,
  longitude: 116.5568,
  name: '校园默认点',
  address: '校园默认点',
  source: 'default'
}

const STORAGE_KEY = 'campus-helper:last-known-location'

const X_PI = 3.14159265358979324 * 3000.0 / 180.0
const PI = 3.1415926535897932384626
const A = 6378245.0
const EE = 0.00669342162296594323

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0
  return ret
}

function transformLon(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0
  return ret
}

export function wgs84ToGcj02(lng: number, lat: number): { lng: number; lat: number } {
  if (outOfChina(lat, lng)) {
    return { lng, lat }
  }
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLon(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)
  return {
    lat: lat + dLat,
    lng: lng + dLng
  }
}

function outOfChina(lat: number, lng: number): boolean {
  return (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271)
}

function toResolvedLocation(location: ResolvedLocation): ResolvedLocation {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name,
    address: location.address,
    source: location.source
  }
}

function normalizeResolvedLocation(location: Partial<ResolvedLocation> | null | undefined, source: ResolvedLocation['source']): ResolvedLocation | null {
  const normalized = normalizeCoordinate(location)
  if (!normalized) return null

  return {
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    name: location?.name || location?.address || '当前位置',
    address: location?.address || location?.name || '当前位置',
    source
  }
}

function saveLastKnownLocation(location: ResolvedLocation) {
  try {
    Taro.setStorageSync(STORAGE_KEY, {
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      address: location.address
    })
  } catch (error) {
    console.warn('[location] 保存最近位置失败:', error)
  }
}

export function getLastKnownLocation(): ResolvedLocation | null {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY)
    return normalizeResolvedLocation(raw, 'stored')
  } catch (error) {
    console.warn('[location] 读取最近位置失败:', error)
    return null
  }
}

function requestWeappLocation(isHighAccuracy: boolean): Promise<ResolvedLocation | null> {
  return new Promise((resolve) => {
    Taro.getLocation({
      type: 'gcj02',
      isHighAccuracy,
      altitude: false,
      success: (result) => {
        const location = normalizeResolvedLocation({
          latitude: result.latitude,
          longitude: result.longitude,
          name: '当前位置',
          address: '当前位置'
        }, 'weapp')
        if (location) {
          saveLastKnownLocation(location)
        }
        resolve(location)
      },
      fail: (error) => {
        console.warn('[location] 微信小程序定位失败:', error)
        resolve(null)
      }
    })
  })
}

function requestBrowserLocation(isHighAccuracy: boolean): Promise<ResolvedLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        let lat = position.coords.latitude
        let lng = position.coords.longitude
        
        const converted = wgs84ToGcj02(lng, lat)
        
        const location = normalizeResolvedLocation({
          latitude: converted.lat,
          longitude: converted.lng,
          name: '当前位置',
          address: '当前位置'
        }, 'browser')
        if (location) {
          saveLastKnownLocation(location)
        }
        resolve(location)
      },
      (error) => {
        console.warn('[location] 浏览器定位失败:', error)
        resolve(null)
      },
      {
        enableHighAccuracy: isHighAccuracy,
        timeout: isHighAccuracy ? 15000 : 8000,
        maximumAge: 30000
      }
    )
  })
}

function isCapacitorEnv(): boolean {
  return typeof window !== 'undefined' && 
         !!(window as any).Capacitor ||
         !!(window as any).cordova ||
         document.querySelector('script[src*="capacitor"]') !== null
}

export async function getCurrentLocationWithFallback(): Promise<ResolvedLocation | null> {
  const env = Taro.getEnv()
  const isCapacitor = isCapacitorEnv()

  if (env === 'WEAPP') {
    try {
      const setting = await Taro.getSetting()
      if (!setting.authSetting['scope.userLocation']) {
        await Taro.authorize({ scope: 'scope.userLocation' })
      }
    } catch (error) {
      console.warn('[location] 定位授权失败:', error)
    }

    const highAccuracy = await requestWeappLocation(true)
    if (highAccuracy) return highAccuracy

    const lowAccuracy = await requestWeappLocation(false)
    if (lowAccuracy) return lowAccuracy
  } else {
    const source = isCapacitor ? 'capacitor' : 'browser'
    const browserHighAccuracy = await requestBrowserLocation(true)
    if (browserHighAccuracy) {
      return { ...browserHighAccuracy, source }
    }

    const browserLowAccuracy = await requestBrowserLocation(false)
    if (browserLowAccuracy) {
      return { ...browserLowAccuracy, source }
    }
  }

  const stored = getLastKnownLocation()
  if (stored) return toResolvedLocation(stored)

  return toResolvedLocation(DEFAULT_CAMPUS_LOCATION)
}
