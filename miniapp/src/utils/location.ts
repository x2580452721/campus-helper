import Taro from '@tarojs/taro'
import { normalizeCoordinate, type NormalizedCoordinate } from './mapData'

export interface ResolvedLocation extends NormalizedCoordinate {
  name: string
  address: string
  source: 'weapp' | 'browser' | 'stored' | 'default'
}

export const DEFAULT_CAMPUS_LOCATION: ResolvedLocation = {
  latitude: 39.9155,
  longitude: 116.5568,
  name: '校园默认点',
  address: '校园默认点',
  source: 'default'
}

const STORAGE_KEY = 'campus-helper:last-known-location'

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
        const location = normalizeResolvedLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
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
        timeout: isHighAccuracy ? 10000 : 6000,
        maximumAge: 0
      }
    )
  })
}

export async function getCurrentLocationWithFallback(): Promise<ResolvedLocation | null> {
  const env = Taro.getEnv()

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
    const browserHighAccuracy = await requestBrowserLocation(true)
    if (browserHighAccuracy) return browserHighAccuracy

    const browserLowAccuracy = await requestBrowserLocation(false)
    if (browserLowAccuracy) return browserLowAccuracy
  }

  const stored = getLastKnownLocation()
  if (stored) return toResolvedLocation(stored)

  return toResolvedLocation(DEFAULT_CAMPUS_LOCATION)
}
