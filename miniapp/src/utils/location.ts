import Taro from '@tarojs/taro'
import { normalizeCoordinate, type NormalizedCoordinate } from './mapData'

export interface ResolvedLocation extends NormalizedCoordinate {
  name: string
  address: string
  source: 'weapp' | 'browser' | 'capacitor' | 'capacitor-plugin' | 'stored' | 'default'
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
    console.log('[location] 尝试浏览器定位, 高精度:', isHighAccuracy)

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.warn('[location] 浏览器不支持 geolocation')
      resolve(null)
      return
    }

    const timeout = isHighAccuracy ? 20000 : 12000
    const timeoutId = setTimeout(() => {
      console.warn('[location] 浏览器定位超时')
      resolve(null)
    }, timeout + 500)

    const options = {
      enableHighAccuracy: isHighAccuracy,
      timeout: timeout,
      maximumAge: isHighAccuracy ? 0 : 120000,
    }

    console.log('[location] 使用定位参数:', options)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId)
        console.log('[location] 浏览器定位成功, 原始坐标:', position.coords)
        console.log('[location] 精度:', position.coords.accuracy, '米')

        let lat = position.coords.latitude
        let lng = position.coords.longitude

        const converted = wgs84ToGcj02(lng, lat)
        console.log('[location] 转换后坐标:', converted)

        const location = normalizeResolvedLocation({
          latitude: converted.lat,
          longitude: converted.lng,
          name: '当前位置',
          address: `当前位置 (精度: ${position.coords.accuracy?.toFixed(0) || '~'}米)`
        }, 'browser')
        if (location) {
          saveLastKnownLocation(location)
        }
        resolve(location)
      },
      (error) => {
        clearTimeout(timeoutId)
        console.warn('[location] 浏览器定位失败:', error)
        console.warn('[location] 错误代码:', error.code, '错误信息:', error.message)

        if (isHighAccuracy && error.code !== 1) {
          console.log('[location] 高精度失败，尝试低精度定位')
          requestBrowserLocation(false).then(resolve)
          return
        }
        resolve(null)
      },
      options
    )
  })
}

async function requestCapacitorPluginLocation(isHighAccuracy: boolean): Promise<ResolvedLocation | null> {
  try {
    const Capacitor = (window as any).Capacitor
    if (!Capacitor?.Plugins?.Geolocation) {
      console.warn('[location] Capacitor Geolocation 插件不可用')
      return null
    }

    const Geolocation = Capacitor.Plugins.Geolocation

    console.log(`[location] 尝试 Capacitor ${isHighAccuracy ? '高' : '低'}精度定位...`)

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: isHighAccuracy,
      timeout: isHighAccuracy ? 20000 : 10000,
      maximumAge: 30000
    })

    if (!position?.coords) {
      console.warn('[location] Capacitor 定位返回无效结果')
      return null
    }

    let lat = position.coords.latitude
    let lng = position.coords.longitude
    const accuracy = position.coords.accuracy

    console.log('[location] Capacitor 定位结果:', { lat, lng, accuracy })

    const converted = wgs84ToGcj02(lng, lat)

    const location = normalizeResolvedLocation({
      latitude: converted.lat,
      longitude: converted.lng,
      name: '当前位置',
      address: `当前位置 (精度: ${accuracy?.toFixed(0) || '~'}米)`
    }, 'capacitor-plugin')

    if (location) {
      saveLastKnownLocation(location)
    }

    console.log('[location] Capacitor 插件定位成功:', location)
    return location
  } catch (error: any) {
    console.warn('[location] Capacitor 插件定位失败:', error)
    console.warn('[location] 错误信息:', error?.message, '代码:', error?.code)
    return null
  }
}

function isCapacitorEnv(): boolean {
  return typeof window !== 'undefined' && (
    !!(window as any).Capacitor ||
    !!(window as any).cordova ||
    !!(window as any).__capacitor__ ||
    document.querySelector('meta[name="capacitor"]') !== null
  )
}

function hasCapacitorGeolocationPlugin(): boolean {
  const Capacitor = (window as any).Capacitor
  return !!(Capacitor?.Plugins?.Geolocation) || !!(Capacitor?.Plugins?.CapacitorGeolocation)
}

async function requestCapacitorPermissions(): Promise<boolean> {
  try {
    const Capacitor = (window as any).Capacitor
    if (!Capacitor?.Plugins?.Geolocation) {
      console.warn('[location] Capacitor Geolocation 插件不可用')
      return false
    }

    const Geolocation = Capacitor.Plugins.Geolocation
    if (Geolocation.requestPermissions) {
      const result = await Geolocation.requestPermissions()
      console.log('[location] Capacitor 权限请求结果:', result)
      return result?.location === 'granted' || result?.granted?.includes('location')
    }
    return true
  } catch (error) {
    console.warn('[location] Capacitor 权限请求失败:', error)
    return false
  }
}

async function getCapacitorLocationWithFullFallback(): Promise<ResolvedLocation | null> {
  console.log('[location] 开始 Capacitor 定位流程...')

  await requestCapacitorPermissions()

  const pluginHigh = await requestCapacitorPluginLocation(true)
  if (pluginHigh) return pluginHigh

  const pluginLow = await requestCapacitorPluginLocation(false)
  if (pluginLow) return pluginLow

  console.log('[location] Capacitor 插件失败，尝试浏览器定位...')

  const browserHigh = await requestBrowserLocation(true)
  if (browserHigh) return { ...browserHigh, source: 'capacitor' }

  const browserLow = await requestBrowserLocation(false)
  if (browserLow) return { ...browserLow, source: 'capacitor' }

  console.log('[location] 所有定位方式失败')
  return null
}

export async function getCurrentLocationWithFallback(): Promise<ResolvedLocation> {
  const env = Taro.getEnv()
  const isCapacitor = isCapacitorEnv()
  const hasPlugin = hasCapacitorGeolocationPlugin()

  console.log('[location] 环境检测:', { env, isCapacitor, hasPlugin })

  let location: ResolvedLocation | null = null

  if (env === 'WEAPP') {
    try {
      const setting = await Taro.getSetting()
      if (!setting.authSetting['scope.userLocation']) {
        await Taro.authorize({ scope: 'scope.userLocation' })
      }
    } catch (error) {
      console.warn('[location] 定位授权失败:', error)
    }

    location = await requestWeappLocation(true) || await requestWeappLocation(false)
  } else if (isCapacitor) {
    location = await getCapacitorLocationWithFullFallback()
  } else {
    location = await requestBrowserLocation(true) || await requestBrowserLocation(false)
    if (location) {
      location = { ...location, source: 'browser' }
    }
  }

  if (location) return location

  const stored = getLastKnownLocation()
  if (stored) {
    console.log('[location] 使用上次保存的位置:', stored)
    return stored
  }

  console.log('[location] 使用默认位置')
  return toResolvedLocation(DEFAULT_CAMPUS_LOCATION)
}
