import { useEffect, useRef, useState } from 'react'
import { AMAP_JS_KEY, AMAP_SECURITY_KEY, reverseGeocode } from '../../utils/amap'
import './index.scss'

interface LocationInfo {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: {
      securityJsCode: string
    }
  }
}

interface AmapPickerProps {
  mode: 'point' | 'polygon'
  onLocationSelect?: (location: LocationInfo) => void
  onPolygonChange?: (path: Array<[number, number]>) => void
  initialLocation?: { latitude: number; longitude: number }
  initialPath?: Array<[number, number]>
  height?: string
}

export default function AmapPicker({
  mode,
  onLocationSelect,
  onPolygonChange,
  initialLocation,
  initialPath,
  height = '400px'
}: AmapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const scriptLoadedRef = useRef(false)
  const markerRef = useRef<any>(null)
  const polygonRef = useRef<any>(null)
  const polygonMarkersRef = useRef<any[]>([])
  const [_currentPath, setCurrentPath] = useState<Array<[number, number]>>(initialPath || [])

  useEffect(() => {
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
    if (mapInstanceRef.current && !loading && mode === 'polygon' && initialPath) {
      drawPolygon(initialPath)
    }
  }, [mapInstanceRef, loading, mode, initialPath])

  const initMap = () => {
    if (!mapContainerRef.current) {
      setError('地图容器不存在')
      return
    }

    if (window.AMap) {
      createMap()
      return
    }

    if (scriptLoadedRef.current) {
      const checkInterval = setInterval(() => {
        if (window.AMap) {
          clearInterval(checkInterval)
          createMap()
        }
      }, 100)
      setTimeout(() => clearInterval(checkInterval), 10000)
      return
    }

    scriptLoadedRef.current = true
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_KEY
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_JS_KEY}`

    script.onload = () => {
      createMap()
    }

    script.onerror = () => {
      setError('地图脚本加载失败')
    }

    document.head.appendChild(script)
  }

  const createMap = () => {
    if (!mapContainerRef.current || !window.AMap) {
      setError('AMap 未定义')
      return
    }

    try {
      const center = initialLocation
        ? [initialLocation.longitude, initialLocation.latitude]
        : [116.5568, 39.9155]

      const map = new window.AMap.Map(mapContainerRef.current, {
        zoom: 16,
        center: center,
        viewMode: '2D',
        mapStyle: 'amap://styles/whitesmoke',
        zoomEnable: true,
        dragEnable: true
      })

      mapInstanceRef.current = map

      map.on('complete', () => {
        setLoading(false)
        setError(null)
        setupMapInteraction()
      })

      map.on('error', () => {
        setError('地图加载出错')
      })
    } catch (err) {
      console.error('创建地图实例失败:', err)
      setError('创建地图失败')
    }
  }

  const setupMapInteraction = () => {
    if (!mapInstanceRef.current || !window.AMap) return

    if (mode === 'point') {
      mapInstanceRef.current.on('click', async (e: any) => {
        const { lng, lat } = e.lnglat
        updateMarker([lng, lat])

        try {
          const locationInfo = await reverseGeocode(lat, lng)
          if (onLocationSelect && locationInfo) {
            onLocationSelect(locationInfo)
          } else if (onLocationSelect) {
            onLocationSelect({
              latitude: lat,
              longitude: lng,
              name: '地图选点',
              address: '校园内'
            })
          }
        } catch (err) {
          console.error('逆地理编码失败:', err)
          if (onLocationSelect) {
            onLocationSelect({
              latitude: lat,
              longitude: lng,
              name: '地图选点',
              address: '校园内'
            })
          }
        }
      })

      if (initialLocation) {
        updateMarker([initialLocation.longitude, initialLocation.latitude])
      }
    } else if (mode === 'polygon') {
      setupPolygonEditor()
    }
  }

  const updateMarker = (position: [number, number]) => {
    if (!mapInstanceRef.current || !window.AMap) return

    if (markerRef.current) {
      markerRef.current.setPosition(position)
    } else {
      const marker = new window.AMap.Marker({
        position: position,
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
      marker.setMap(mapInstanceRef.current)
      markerRef.current = marker
    }
  }

  const setupPolygonEditor = () => {
    if (!mapInstanceRef.current || !window.AMap) return

    let tempPath: Array<[number, number]> = []

    mapInstanceRef.current.on('click', (e: any) => {
      const { lng, lat } = e.lnglat
      tempPath.push([lng, lat])
      
      if (tempPath.length >= 3) {
        drawPolygon(tempPath)
        setCurrentPath(tempPath)
        if (onPolygonChange) {
          onPolygonChange(tempPath)
        }
      } else {
        drawPolygonMarkers(tempPath)
      }
    })

    if (initialPath && initialPath.length >= 3) {
      drawPolygon(initialPath)
      setCurrentPath(initialPath)
    }
  }

  const drawPolygon = (path: Array<[number, number]>) => {
    if (!mapInstanceRef.current || !window.AMap) return

    if (polygonRef.current) {
      polygonRef.current.setPath(path)
    } else {
      const polygon = new window.AMap.Polygon({
        path: path,
        strokeColor: '#3b82f6',
        strokeWeight: 2,
        fillColor: 'rgba(59, 130, 246, 0.2)',
        fillOpacity: 0.3,
        zIndex: 1
      })
      polygon.setMap(mapInstanceRef.current)
      polygonRef.current = polygon
    }

    drawPolygonMarkers(path)
  }

  const drawPolygonMarkers = (path: Array<[number, number]>) => {
    if (!mapInstanceRef.current || !window.AMap) return

    polygonMarkersRef.current.forEach(marker => {
      try {
        marker.setMap(null)
      } catch (e) {
        console.error('移除标记失败:', e)
      }
    })
    polygonMarkersRef.current = []

    path.forEach((point, index) => {
      const marker = new window.AMap.Marker({
        position: point,
        content: `
          <div style="
            width: 20px;
            height: 20px;
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            color: #3b82f6;
            cursor: pointer;
          ">
            ${index + 1}
          </div>
        `,
        offset: new window.AMap.Pixel(-10, -10),
        zIndex: 10
      })
      marker.setMap(mapInstanceRef.current)
      polygonMarkersRef.current.push(marker)
    })
  }

  const clearPolygon = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    polygonMarkersRef.current.forEach(marker => {
      marker.setMap(null)
    })
    polygonMarkersRef.current = []
    setCurrentPath([])
    if (onPolygonChange) {
      onPolygonChange([])
    }
  }

  return (
    <div className="amap-picker">
      <div
        ref={mapContainerRef}
        className="map-container"
        style={{ height }}
      />

      {loading && !error && (
        <div className="map-loading">
          <div className="loading-spinner" />
          <span>地图加载中...</span>
        </div>
      )}

      {error && (
        <div className="map-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <span className="error-hint">请刷新页面重试</span>
        </div>
      )}

      {!loading && !error && mode === 'polygon' && (
        <div className="map-controls">
          <button className="control-btn" onClick={clearPolygon} title="清除多边形">
            🗑️
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="map-hint">
          {mode === 'point' ? '点击地图选择位置' : '点击地图添加多边形顶点（至少3个点）'}
        </div>
      )}
    </div>
  )
}