import { useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AMAP_JS_KEY, AMAP_SECURITY_KEY, AMAP_WEB_KEY } from '../../utils/amap'
import './index.scss'

interface Location {
  latitude: number
  longitude: number
  name: string
  address: string
}

interface AmapViewProps {
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
  showCampusZones?: boolean
  compact?: boolean
}

declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: {
      securityJsCode: string
    }
  }
}

export default function AmapView({
  onLocationSelect,
  onMarkerClick,
  initialLocation,
  markers = [],
  showSearch: _showSearch,
  mode,
  selectedMarkerId,
  showRoute,
  showCampusZones = false,
  compact = false
}: AmapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const scriptLoadedRef = useRef(false)
  const markerInstancesRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const selectMarkerRef = useRef<any>(null)
  const polylineRef = useRef<any[]>([])
  const campusZonePolygonsRef = useRef<any[]>([])
  const geolocationRef = useRef<any>(null)
  const infoWindowRef = useRef<any>(null)
  const [currentUserLocation, setCurrentUserLocation] = useState(initialLocation)
  const shouldShowRoute = showRoute ?? mode === 'view'

  const CAMPUS_ZONES = [
    {
      name: '教学区',
      color: 'rgba(59, 130, 246, 0.15)',
      borderColor: 'rgba(59, 130, 246, 0.6)',
      path: [
        [116.5548, 39.9172],
        [116.5582, 39.9172],
        [116.5582, 39.9138],
        [116.5548, 39.9138]
      ]
    },
    {
      name: '生活区',
      color: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.6)',
      path: [
        [116.5532, 39.9182],
        [116.5602, 39.9182],
        [116.5602, 39.9125],
        [116.5532, 39.9125]
      ]
    },
    {
      name: '梆子井公寓',
      color: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.6)',
      path: [
        [116.5608, 39.9148],
        [116.5638, 39.9148],
        [116.5638, 39.9105],
        [116.5608, 39.9105]
      ]
    }
  ]

  useEffect(() => {
    console.log('AmapView 组件挂载')
    initMap()

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy()
        } catch (e) {
          console.error('销毁地图失败:', e)
        }
      }
    }
  }, [])

  useEffect(() => {
    setCurrentUserLocation(initialLocation)
  }, [initialLocation])

  useEffect(() => {
    if (mapInstanceRef.current && !loading) {
      addMarkers()
      renderUserMarker()
      if (showCampusZones) {
        drawCampusZones()
      }
    }
  }, [markers, loading, selectedMarkerId, currentUserLocation, showCampusZones])

  useEffect(() => {
    if (mapInstanceRef.current && !loading && shouldShowRoute && selectedMarkerId && currentUserLocation) {
      const selectedMarker = markers.find(m => m.id === selectedMarkerId)
      if (selectedMarker) {
        drawRoute(currentUserLocation, {
          latitude: selectedMarker.latitude,
          longitude: selectedMarker.longitude
        })
      }
    } else if (polylineRef.current && polylineRef.current.length > 0) {
      polylineRef.current.forEach(line => {
        try {
          line.setMap(null)
        } catch (e) {
          console.error('移除路线失败:', e)
        }
      })
      polylineRef.current = []
    }
  }, [mapInstanceRef, loading, shouldShowRoute, selectedMarkerId, currentUserLocation, markers])

  const initMap = () => {
    console.log('开始初始化地图')

    if (!mapContainerRef.current) {
      console.error('地图容器不存在')
      setError('地图容器不存在')
      return
    }

    if (window.AMap) {
      console.log('AMap 已存在，直接初始化')
      createMap()
      return
    }

    if (scriptLoadedRef.current) {
      console.log('脚本已加载，等待 AMap')
      const checkInterval = setInterval(() => {
        if (window.AMap) {
          clearInterval(checkInterval)
          createMap()
        }
      }, 100)
      setTimeout(() => clearInterval(checkInterval), 10000)
      return
    }

    console.log('开始加载高德地图脚本')
    scriptLoadedRef.current = true

    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_KEY
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_JS_KEY}&plugin=AMap.Walking,AMap.Geolocation,AMap.InfoWindow`

    script.onload = () => {
      console.log('高德地图脚本加载完成')
      createMap()
    }

    script.onerror = (err) => {
      console.error('高德地图脚本加载失败:', err)
      setError('地图脚本加载失败')
    }

    document.head.appendChild(script)
  }

  const createMap = () => {
    console.log('创建地图实例')

    if (!mapContainerRef.current) {
      console.error('地图容器已消失')
      setError('地图容器已消失')
      return
    }

    if (!window.AMap) {
      console.error('window.AMap 仍然不存在')
      setError('AMap 未定义')
      return
    }

    try {
      const center = initialLocation
        ? [initialLocation.longitude, initialLocation.latitude]
        : [116.5568, 39.9155]

      console.log('地图中心点:', center)

      const map = new window.AMap.Map(mapContainerRef.current, {
        zoom: 16,
        center: center,
        viewMode: '2D',
        mapStyle: 'amap://styles/whitesmoke',
        zoomEnable: true,
        dragEnable: true
      })

      mapInstanceRef.current = map

      if (window.AMap.InfoWindow) {
        const infoWindow = new window.AMap.InfoWindow({
          offset: new window.AMap.Pixel(0, -30),
          isCustom: false,
          closeWhenClickMap: true
        })
        infoWindowRef.current = infoWindow
      }

      map.on('complete', () => {
        console.log('地图加载完成事件触发')
        setLoading(false)
        setError(null)
      })

      map.on('error', (e: any) => {
        console.error('地图错误:', e)
        setError('地图加载出错')
      })

      map.on('click', async (e: any) => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close()
        }

        if (mode === 'select' && onLocationSelect) {
          const { lng, lat } = e.lnglat

          if (selectMarkerRef.current) {
            selectMarkerRef.current.setPosition([lng, lat])
          } else {
            const selectMarker = new window.AMap.Marker({
              position: [lng, lat],
              content: `
                <div style="
                  width: 32px;
                  height: 32px;
                  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <div style="
                    width: 12px;
                    height: 12px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  "></div>
                </div>
              `,
              offset: new window.AMap.Pixel(-16, -16),
              zIndex: 10000
            })
            selectMarker.setMap(map)
            selectMarkerRef.current = selectMarker
          }

          try {
            const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_WEB_KEY}&location=${lng},${lat}&extensions=base`
            const response = await fetch(url)
            const data = await response.json()

            let locationName = '地图选点'
            let locationAddress = '校园内'

            if (data.status === '1' && data.regeocode) {
              locationName = data.regeocode.formattedAddress || '地图选点'
              locationAddress = data.regeocode.formattedAddress || '校园内'
            }

            const loc: Location = {
              latitude: lat,
              longitude: lng,
              name: locationName,
              address: locationAddress
            }
            onLocationSelect(loc)
          } catch (err) {
            console.error('逆地理编码失败:', err)
            const loc: Location = {
              latitude: lat,
              longitude: lng,
              name: '地图选点',
              address: '校园内'
            }
            onLocationSelect(loc)
          }
        }
      })

    } catch (err) {
      console.error('创建地图实例失败:', err)
      setError('创建地图失败')
    }
  }

  const drawCampusZones = () => {
    if (!mapInstanceRef.current || !window.AMap) return

    campusZonePolygonsRef.current.forEach(polygon => {
      try {
        polygon.setMap(null)
      } catch (e) {
        console.error('移除校园区块失败:', e)
      }
    })
    campusZonePolygonsRef.current = []

    CAMPUS_ZONES.forEach(zone => {
      try {
        const polygon = new window.AMap.Polygon({
          path: zone.path,
          strokeColor: zone.borderColor,
          strokeWeight: 2,
          fillColor: zone.color,
          fillOpacity: 0.3,
          zIndex: 1
        })

        polygon.setMap(mapInstanceRef.current)
        campusZonePolygonsRef.current.push(polygon)

        const textMarker = new window.AMap.Marker({
          position: [
            (zone.path[0][0] + zone.path[2][0]) / 2,
            (zone.path[0][1] + zone.path[2][1]) / 2
          ],
          content: `
            <div style="
              background: white;
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 600;
              color: #374151;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              white-space: nowrap;
            ">
              ${zone.name}
            </div>
          `,
          offset: new window.AMap.Pixel(-40, -15),
          zIndex: 2
        })
        textMarker.setMap(mapInstanceRef.current)
        campusZonePolygonsRef.current.push(textMarker)
      } catch (err) {
        console.error('绘制校园区块失败:', err)
      }
    })
  }

  const renderUserMarker = () => {
    if (!mapInstanceRef.current || !currentUserLocation) return

    console.log('渲染用户标记:', currentUserLocation)

    try {
      if (userMarkerRef.current) {
        userMarkerRef.current.setPosition([currentUserLocation.longitude, currentUserLocation.latitude])
        return
      }

      const userMarker = new window.AMap.Marker({
        position: [currentUserLocation.longitude, currentUserLocation.latitude],
        content: `
          <div style="position:relative;width:32px;height:32px;">
            <div style="
              position:absolute;
              width:60px;
              height:60px;
              background:rgba(220,38,38,0.15);
              border-radius:50%;
              top:-14px;
              left:-14px;
              animation:pulse-outer 2s ease-out infinite;
            "></div>
            <div style="
              position:absolute;
              width:44px;
              height:44px;
              background:rgba(220,38,38,0.25);
              border-radius:50%;
              top:-6px;
              left:-6px;
              animation:pulse-inner 1.5s ease-out infinite;
            "></div>
            <div style="
              position:absolute;
              width:32px;
              height:32px;
              background:linear-gradient(135deg,#dc2626 0%,#ea580c 50%,#f97316 100%);
              border-radius:50%;
              border:4px solid white;
              box-shadow:0 4px 12px rgba(220,38,38,0.4), 0 0 0 2px rgba(220,38,38,0.2);
              display:flex;
              align-items:center;
              justify-content:center;
            ">
              <div style="
                width:12px;
                height:12px;
                background:white;
                border-radius:50%;
                box-shadow:0 2px 4px rgba(0,0,0,0.1);
              "></div>
            </div>
          </div>
          <style>
            @keyframes pulse-outer {
              0% { transform:scale(1); opacity:1; }
              100% { transform:scale(2); opacity:0; }
            }
            @keyframes pulse-inner {
              0% { transform:scale(1); opacity:1; }
              100% { transform:scale(1.5); opacity:0; }
            }
          </style>
        `,
        offset: new window.AMap.Pixel(-16, -16),
        zIndex: 9999
      })

      userMarker.setMap(mapInstanceRef.current)
      userMarkerRef.current = userMarker
    } catch (err) {
      console.error('渲染用户标记失败:', err)
    }
  }

  const addMarkers = () => {
    if (!mapInstanceRef.current) return

    console.log('添加标记，数量:', markers.length)

    markerInstancesRef.current.forEach(m => {
      try {
        m.setMap(null)
      } catch (e) {
        console.error('移除标记失败:', e)
      }
    })
    markerInstancesRef.current = []

    markers.forEach(marker => {
      try {
        const isUrgent = marker.priority === 'urgent'
        const bgColor = isUrgent ? '#dc2626' : '#3b82f6'
        const isSelected = marker.id === selectedMarkerId

        const markerData = { ...marker }

        const amapMarker = new window.AMap.Marker({
          position: [marker.longitude, marker.latitude],
          content: `
            <div style="
              position:relative;
              cursor:pointer;
              transition:transform 0.25s cubic-bezier(0.16,1,0.3,1);
              ${isSelected ? 'transform:scale(1.3);' : ''}
            ">
              ${isSelected ? `
                <div style="
                  position:absolute;
                  width:60px;
                  height:60px;
                  background:${isUrgent ? 'rgba(220,38,38,0.15)' : 'rgba(59,130,246,0.15)'};
                  border-radius:50%;
                  top:-18px;
                  left:-18px;
                  animation:pulse-marker 1.5s ease-out infinite;
                "></div>
              ` : ''}
              <div style="
                background:linear-gradient(135deg, ${bgColor} 0%, ${isUrgent ? '#ea580c' : '#60a5fa'} 100%);
                color:white;
                padding:${isSelected ? '8px 16px' : '6px 12px'};
                border-radius:${isSelected ? '20px' : '16px'};
                font-size:${isSelected ? '16px' : '14px'};
                font-weight:bold;
                white-space:nowrap;
                box-shadow:0 4px 12px ${isUrgent ? 'rgba(220,38,38,0.4)' : 'rgba(59,130,246,0.4)'};
                ${isSelected ? 'box-shadow:0 8px 28px ' + (isUrgent ? 'rgba(220,38,38,0.5)' : 'rgba(59,130,246,0.5)') + ';' : ''}
                border:3px solid white;
              ">¥${marker.reward || 0}</div>
              ${isSelected ? `
                <div style="
                  position:absolute;
                  bottom:-12px;
                  left:50%;
                  transform:translateX(-50%);
                  width:0;
                  height:0;
                  border-left:8px solid transparent;
                  border-right:8px solid transparent;
                  border-top:10px solid ${bgColor};
                  filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                "></div>
              ` : ''}
            </div>
            <style>
              @keyframes pulse-marker {
                0% { transform:scale(1); opacity:1; }
                100% { transform:scale(2); opacity:0; }
              }
            </style>
          `,
          offset: new window.AMap.Pixel(-35, -20),
          zIndex: isSelected ? 1000 : 10,
          extData: markerData
        })

        amapMarker.on('click', () => {
          const data = markerData

          if (infoWindowRef.current && data && window.AMap.InfoWindow) {
            try {
              const content = `
                <div style="padding:12px;min-width:200px;">
                  <div style="font-size:16px;font-weight:700;color:#1f2937;margin-bottom:8px;">
                    ${data.title || '任务详情'}
                  </div>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                    <span style="font-size:20px;font-weight:800;color:#dc2626;">¥${data.reward || 0}</span>
                    <span style="font-size:12px;padding:2px 8px;border-radius:8px;background:${data.priority === 'urgent' ? '#fef2f2' : '#eff6ff'};color:${data.priority === 'urgent' ? '#dc2626' : '#3b82f6'};font-weight:600;">
                      ${data.priority === 'urgent' ? '🔥紧急' : '普通'}
                    </span>
                  </div>
                  <div style="font-size:13px;color:#6b7280;">
                    点击查看完整详情
                  </div>
                </div>
              `
              infoWindowRef.current.setContent(content)
              infoWindowRef.current.open(mapInstanceRef.current, [data.longitude, data.latitude])
            } catch (err) {
              console.error('打开信息窗口失败:', err)
            }
          }

          if (onMarkerClick && data && data.id) {
            onMarkerClick(data.id)
          }
        })

        amapMarker.setMap(mapInstanceRef.current)
        markerInstancesRef.current.push(amapMarker)
      } catch (err) {
        console.error('添加标记失败:', err)
      }
    })
  }

  const drawRoute = async (origin: { latitude: number; longitude: number }, dest: { latitude: number; longitude: number }) => {
    if (!mapInstanceRef.current) return

    console.log('绘制路线')

    if (polylineRef.current && polylineRef.current.length > 0) {
      polylineRef.current.forEach(line => {
        try {
          line.setMap(null)
        } catch (e) {
          console.error('移除旧路线失败:', e)
        }
      })
      polylineRef.current = []
    }

    try {
      const url = `https://restapi.amap.com/v3/direction/walking?key=${AMAP_WEB_KEY}&origin=${origin.longitude},${origin.latitude}&destination=${dest.longitude},${dest.latitude}&output=json`
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
        const path = data.route.paths[0]
        const pathPoints = path.steps.flatMap((step: any) => {
          return step.polyline.split(';').map((point: string) => {
            const [lng, lat] = point.split(',').map(Number)
            return [lng, lat]
          })
        })

        const bgPolyline = new window.AMap.Polyline({
          path: pathPoints,
          strokeColor: 'rgba(220, 38, 38, 0.2)',
          strokeWeight: 12,
          strokeOpacity: 1,
          lineJoin: 'round',
          lineCap: 'round'
        })

        const polyline = new window.AMap.Polyline({
          path: pathPoints,
          strokeColor: '#dc2626',
          strokeWeight: 6,
          strokeOpacity: 1,
          lineJoin: 'round',
          lineCap: 'round',
          showDir: true,
          strokeStyle: 'dashed',
          strokeDasharray: [10, 5]
        })

        bgPolyline.setMap(mapInstanceRef.current)
        polyline.setMap(mapInstanceRef.current)
        polylineRef.current = [bgPolyline, polyline]

        mapInstanceRef.current.setBounds(polyline.getBounds(), false, [80, 80, 80, 240])
      }
    } catch (err) {
      console.error('绘制路线失败:', err)
    }
  }

  const locateCurrentPosition = () => {
    Taro.showLoading({ title: '定位中...' })

    if (mapInstanceRef.current && window.AMap) {
      try {
        if (!geolocationRef.current) {
          geolocationRef.current = new window.AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
            convert: true,
            showButton: false,
            showMarker: false,
            showCircle: false,
            panToLocation: true,
            zoomToAccuracy: true
          })
        }

        geolocationRef.current.getCurrentPosition((status: string, result: any) => {
          Taro.hideLoading()
          if (status === 'complete') {
            console.log('高德定位成功:', result)
            const { position } = result
            const newLocation = {
              latitude: position.lat,
              longitude: position.lng
            }
            setCurrentUserLocation(newLocation)
            mapInstanceRef.current.setCenter([position.lng, position.lat])

            if (onLocationSelect) {
              const loc: Location = {
                latitude: position.lat,
                longitude: position.lng,
                name: '当前位置',
                address: result.formattedAddress || '当前位置'
              }
              onLocationSelect(loc)
            }

            Taro.showToast({ title: '定位成功', icon: 'success' })
          } else {
            console.error('高德定位失败:', result)
            fallbackToBrowserGeolocation()
          }
        })
      } catch (err) {
        console.error('高德定位异常:', err)
        fallbackToBrowserGeolocation()
      }
    } else {
      fallbackToBrowserGeolocation()
    }
  }

  const fallbackToBrowserGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          Taro.hideLoading()
          const { latitude, longitude } = position.coords
          const newLocation = { latitude, longitude }
          setCurrentUserLocation(newLocation)
          mapInstanceRef.current?.setCenter([longitude, latitude])

          if (onLocationSelect) {
            const loc: Location = {
              latitude,
              longitude,
              name: '当前位置',
              address: '当前位置'
            }
            onLocationSelect(loc)
          }

          Taro.showToast({ title: '定位成功', icon: 'success' })
        },
        (error) => {
          Taro.hideLoading()
          console.error('浏览器定位失败:', error)
          Taro.showToast({ title: '无法获取位置', icon: 'none', duration: 2000 })
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      Taro.hideLoading()
      Taro.showToast({ title: '浏览器不支持定位', icon: 'none' })
    }
  }

  return (
    <View
      className='amap-view'
      style={{
        minHeight: compact ? '180px' : undefined
      }}
    >
      <div
        ref={mapContainerRef}
        className='map-container'
        style={{
          width: '100%',
          height: '100%',
          minHeight: compact ? '180px' : '400px'
        }}
      />

      {loading && !error && (
        <View className='map-loading'>
          <View className='loading-spinner' />
          <Text>地图加载中...</Text>
        </View>
      )}

      {error && (
        <View className='map-error'>
          <Text className='error-icon'>⚠️</Text>
          <Text className='error-text'>{error}</Text>
          <Text className='error-hint'>请刷新页面重试</Text>
        </View>
      )}

      {!loading && !error && !compact && (
        <View className='map-controls'>
          <View className='control-btn' onClick={locateCurrentPosition}>
            <Text className='control-icon'>📍</Text>
          </View>
          <View className='control-btn' onClick={() => mapInstanceRef.current?.zoomIn()}>
            <Text className='control-icon'>+</Text>
          </View>
          <View className='control-btn' onClick={() => mapInstanceRef.current?.zoomOut()}>
            <Text className='control-icon'>−</Text>
          </View>
        </View>
      )}

      {mode === 'view' && !loading && !error && !compact && (
        <View className='map-legend'>
          <View className='legend-item'>
            <View className='legend-dot me' />
            <Text className='legend-text'>我的位置</Text>
          </View>
          <View className='legend-item'>
            <View className='legend-dot normal' />
            <Text className='legend-text'>普通任务</Text>
          </View>
          <View className='legend-item'>
            <View className='legend-dot urgent' />
            <Text className='legend-text'>紧急任务</Text>
          </View>
        </View>
      )}
    </View>
  )
}
