import { View, Text, Map as TaroMap } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState, useMemo, useRef } from 'react'
import { getWalkingRoute, formatDuration, reverseGeocode } from '../../utils/amap'
import './index.scss'

const USER_MARKER_ICON = '/static/tab-user-active.png'
const TASK_MARKER_ICON = '/static/tab-task-active.png'

interface Location {
  latitude: number
  longitude: number
  name: string
  address: string
}

interface WechatMapViewProps {
  onLocationSelect?: (location: Location) => void
  onMarkerClick?: (markerId: string) => void
  initialLocation?: { latitude: number; longitude: number }
  markers?: Array<{
    id: string
    latitude: number
    longitude: number
    title?: string
    reward?: number
    priority?: string
  }>
  showSearch?: boolean
  mode?: 'select' | 'view'
  selectedMarkerId?: string | null
  showRoute?: boolean
}

type RoutePoint = {
  latitude: number
  longitude: number
}

type CoordinateLike = {
  latitude?: number | string | null
  longitude?: number | string | null
  lat?: number | string | null
  lng?: number | string | null
}

function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === 'string' ? Number(value) : value
  return typeof num === 'number' && Number.isFinite(num) ? num : null
}

function normalizeCoordinate<T extends CoordinateLike>(point: T | null | undefined) {
  if (!point) return null

  const latitude = toFiniteNumber(point.latitude ?? point.lat)
  const longitude = toFiniteNumber(point.longitude ?? point.lng)

  if (latitude === null || longitude === null) {
    return null
  }

  return {
    ...point,
    latitude,
    longitude
  }
}

function getPolylineCenter(points: RoutePoint[]) {
  if (points.length === 0) {
    return null
  }

  const bounds = points.reduce(
    (acc, point) => ({
      minLatitude: Math.min(acc.minLatitude, point.latitude),
      maxLatitude: Math.max(acc.maxLatitude, point.latitude),
      minLongitude: Math.min(acc.minLongitude, point.longitude),
      maxLongitude: Math.max(acc.maxLongitude, point.longitude)
    }),
    {
      minLatitude: points[0].latitude,
      maxLatitude: points[0].latitude,
      minLongitude: points[0].longitude,
      maxLongitude: points[0].longitude
    }
  )

  return {
    latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
    longitude: (bounds.minLongitude + bounds.maxLongitude) / 2
  }
}

export default function WechatMapView({
  onLocationSelect,
  onMarkerClick,
  initialLocation,
  markers = [],
  mode,
  selectedMarkerId,
  showRoute
}: WechatMapViewProps) {
  const [region, setRegion] = useState({
    latitude: 39.9155,
    longitude: 116.5568,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  })
  const [polyline, setPolyline] = useState<any[]>([])
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [scale, setScale] = useState(16)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const markerIdMap = useRef<Record<number, string>>({})
  const nextMarkerId = useRef(1)
  const normalizedInitialLocation = useMemo(() => normalizeCoordinate(initialLocation), [initialLocation])

  const sanitizedUserLocation = useMemo(() => normalizeCoordinate(userLocation), [userLocation])

  const sanitizedMarkers = useMemo(() => {
    return markers
      .map((marker) => {
        const normalized = normalizeCoordinate(marker)
        if (!normalized) {
          console.warn('过滤非法 marker:', marker)
          return null
        }
        return {
          ...marker,
          latitude: normalized.latitude,
          longitude: normalized.longitude
        }
      })
      .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker))
  }, [markers])

  const getMarkerId = (originalId: string): number => {
    const entries = Object.entries(markerIdMap.current)
    for (const [id, origId] of entries) {
      if (origId === originalId) {
        return Number(id)
      }
    }
    const newId = nextMarkerId.current++
    markerIdMap.current[newId] = originalId
    return newId
  }

  const getOriginalMarkerId = (numericId: number): string | null => {
    return markerIdMap.current[numericId] || null
  }

  useEffect(() => {
    if (normalizedInitialLocation) {
      setRegion({
        latitude: normalizedInitialLocation.latitude,
        longitude: normalizedInitialLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      })
      setUserLocation({
        latitude: normalizedInitialLocation.latitude,
        longitude: normalizedInitialLocation.longitude
      })
    } else if (initialLocation) {
      console.warn('忽略非法 initialLocation:', initialLocation)
    }
  }, [initialLocation, normalizedInitialLocation])

  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const res = await Taro.getLocation({
          type: 'gcj02',
          isHighAccuracy: true,
          altitude: true
        })
        console.log('获取到的位置:', res)
        setUserLocation({
          latitude: res.latitude,
          longitude: res.longitude
        })
        if (!initialLocation) {
          setRegion({
            latitude: res.latitude,
            longitude: res.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          })
        }
      } catch (err) {
        console.error('获取位置失败:', err)
      }
    }
    getCurrentLocation()
  }, [])

  useEffect(() => {
    if (showRoute && selectedMarkerId && sanitizedUserLocation) {
      const selectedMarker = sanitizedMarkers.find(m => m.id === selectedMarkerId)
      if (selectedMarker) {
        drawRoute(sanitizedUserLocation, {
          latitude: selectedMarker.latitude,
          longitude: selectedMarker.longitude
        })
      } else {
        console.warn('选中的 marker 缺少有效坐标:', {
          selectedMarkerId,
          markers: sanitizedMarkers
        })
      }
    } else {
      setPolyline([])
      setRouteInfo(null)
    }
  }, [showRoute, selectedMarkerId, sanitizedUserLocation, sanitizedMarkers])

  const drawRoute = async (origin: { latitude: number; longitude: number }, dest: { latitude: number; longitude: number }) => {
    try {
      const route = await getWalkingRoute(origin, dest)
      if (route) {
        setRouteInfo(route)

        const routePoints = route.polyline && route.polyline.length > 0
          ? route.polyline
          : [
              normalizeCoordinate(origin),
              normalizeCoordinate(dest)
            ]
              .filter((point): point is { latitude: number; longitude: number } => point !== null)
              .map((point) => ({
                latitude: point.latitude,
                longitude: point.longitude
              }))

        console.log('map points:', routePoints)

        if (routePoints.length === 0) {
          console.warn('路线 points 为空，跳过地图更新', { origin, dest, route })
          setPolyline([])
          return
        }

        setPolyline([
          {
            points: routePoints.map((point, index) => ({
              id: index + 1,
              latitude: point.latitude,
              longitude: point.longitude
            })),
            color: 'rgba(220, 38, 38, 0.18)',
            width: 12,
            dottedLine: false
          },
          {
            points: routePoints.map((point, index) => ({
              id: index + 1,
              latitude: point.latitude,
              longitude: point.longitude
            })),
            color: '#dc2626',
            width: 6,
            dottedLine: false
          }
        ])

        const center = getPolylineCenter(routePoints)
        if (center) {
          setRegion((current) => ({
            ...current,
            latitude: center.latitude,
            longitude: center.longitude
          }))
        }
      }
    } catch (err) {
      console.error('绘制路线失败:', err)
    }
  }

  const mapMarkers = useMemo(() => {
    const result: any[] = []
    markerIdMap.current = {}
    nextMarkerId.current = 1

    if (sanitizedUserLocation) {
      result.push({
        id: 0,
        latitude: sanitizedUserLocation.latitude,
        longitude: sanitizedUserLocation.longitude,
        iconPath: USER_MARKER_ICON,
        width: 32,
        height: 32,
        zIndex: 9999,
        callout: {
          content: '我的位置',
          color: '#374151',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#ffffff',
          padding: 8,
          display: 'ALWAYS'
        }
      })
    }

    sanitizedMarkers.forEach(marker => {
      const isUrgent = marker.priority === 'urgent'
      const isSelected = marker.id === selectedMarkerId
      const numericId = getMarkerId(marker.id)

      result.push({
        id: numericId,
        latitude: marker.latitude,
        longitude: marker.longitude,
        iconPath: TASK_MARKER_ICON,
        width: isSelected ? 60 : 50,
        height: isSelected ? 60 : 50,
        zIndex: isSelected ? 1000 : 10,
        callout: {
          content: ¥,
          color: '#ffffff',
          fontSize: isSelected ? 16 : 14,
          borderRadius: isSelected ? 20 : 16,
          bgColor: isUrgent ? '#dc2626' : '#3b82f6',
          padding: isSelected ? '8px 16px' : '6px 12px',
          display: 'ALWAYS',
          textAlign: 'center'
        }
      })
    })

    console.log('map points:', result.map(marker => ({
      id: marker.id,
      latitude: marker.latitude,
      longitude: marker.longitude
    })))

    return result
  }, [sanitizedMarkers, sanitizedUserLocation, selectedMarkerId])

  const handleMarkerTap = (e: any) => {
    const markerId = e?.detail?.markerId ?? e?.markerId
    if (markerId === 0) return

    const originalId = getOriginalMarkerId(markerId)
    if (originalId && onMarkerClick) {
      onMarkerClick(originalId)
    }
  }

  const handleMapTap = async (e: any) => {
    if (mode === 'select' && onLocationSelect) {
      const { latitude, longitude } = e.detail
      
      let locationName = '地图选点'
      let locationAddress = '校园内'
      
      try {
        const geoResult = await reverseGeocode(latitude, longitude)
        if (geoResult) {
          locationName = geoResult.name || locationName
          locationAddress = geoResult.address || locationAddress
        }
      } catch (err) {
        console.error('逆地理编码失败:', err)
      }

      const loc: Location = {
        latitude,
        longitude,
        name: locationName,
        address: locationAddress
      }
      onLocationSelect(loc)
    }
  }

  const handleLocate = () => {
    Taro.showLoading({ title: '定位中...' })
    Taro.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      altitude: true,
      success: (res) => {
        Taro.hideLoading()
        console.log('重新定位成功:', res)
        const newLocation = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        setUserLocation(newLocation)
        setRegion({
          latitude: res.latitude,
          longitude: res.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        })
        Taro.showToast({ title: '定位成功', icon: 'success' })
      },
      fail: (err) => {
        Taro.hideLoading()
        console.error('定位失败:', err)
        Taro.showToast({ title: '定位失败', icon: 'none' })
      }
    })
  }

  return (
    <View className='wechat-map-view'>
      <TaroMap
        className='map-container blank-map'
        latitude={region.latitude}
        longitude={region.longitude}
        scale={scale}
        markers={mapMarkers}
        polyline={polyline}
        showLocation={true}
        enableZoom={true}
        enableScroll={true}
        onMarkerTap={handleMarkerTap}
        onTap={handleMapTap}
        onError={(event) => {
          console.error('微信地图渲染失败:', event)
        }}
      />
    </View>
  )
}
