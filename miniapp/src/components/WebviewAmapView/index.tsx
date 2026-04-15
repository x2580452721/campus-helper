import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { View, WebView, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AMAP_WEBVIEW_URL } from '../../utils/amap'
import { normalizeCoordinate, sanitizeTaskMarkers } from '../../utils/mapData'
import './index.scss'

interface TaskWithLocation {
  id: string
  title?: string
  reward?: number
  priority?: 'normal' | 'urgent'
  latitude: number
  longitude: number
}

interface WebviewAmapViewProps {
  userLocation?: { latitude: number; longitude: number } | null
  tasks?: TaskWithLocation[]
  selectedTaskId?: string | null
  mode?: 'view' | 'select'
  showRoute?: boolean
  debugOverlay?: boolean
  showBack?: boolean
  onMarkerClick?: (taskId: string) => void
  onLocationSelect?: (location: { latitude: number; longitude: number; name: string; address: string }) => void
  onLocationConfirm?: (location: { latitude: number; longitude: number; name: string; address: string }) => void
  onLocate?: () => void
  onBack?: () => void
  onNavigate?: (location: { latitude: number; longitude: number; name: string; address: string }) => void
  onOpenTaskDetail?: (taskId: string) => void
  onUnavailable?: (reason: string) => void
  hideTaskActions?: boolean
  compact?: boolean
  layout?: 'default' | 'fill'
  dockMode?: boolean
}

function buildWebviewUrl(baseUrl: string, params: URLSearchParams) {
  if (!baseUrl) return ''
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`
}

export default function WebviewAmapView({
  userLocation,
  tasks = [],
  selectedTaskId,
  mode = 'view',
  showRoute,
  debugOverlay = false,
  showBack = true,
  onMarkerClick,
  onLocationSelect,
  onLocationConfirm,
  onLocate,
  onBack,
  onNavigate,
  onOpenTaskDetail,
  onUnavailable,
  hideTaskActions = false,
  compact = false,
  layout = 'default',
  dockMode = false
}: WebviewAmapViewProps) {
  const env = Taro.getEnv()
  const [webviewError, setWebviewError] = useState<string | null>(null)
  const [showSlowLoadHint, setShowSlowLoadHint] = useState(false)
  const [webviewLoaded, setWebviewLoaded] = useState(false)
  const cacheKeyRef = useRef(`${Date.now()}`)
  const sanitizedUserLocation = useMemo(() => normalizeCoordinate(userLocation), [userLocation])
  const sanitizedTasks = useMemo(() => sanitizeTaskMarkers(tasks, '高德 WebView 任务'), [tasks])

  const handleUnavailable = useCallback((reason: string) => {
    console.warn('WebView 高德地图不可用:', reason)
    setWebviewError(reason)
    onUnavailable?.(reason)
  }, [onUnavailable])

  const src = useMemo(() => {
    const params = new URLSearchParams()

    if (sanitizedUserLocation) {
      params.set('lat', sanitizedUserLocation.latitude.toString())
      params.set('lng', sanitizedUserLocation.longitude.toString())
    }

    if (sanitizedTasks.length > 0) {
      console.log('WebView 高德地图 markers:', sanitizedTasks)
      params.set('markers', encodeURIComponent(JSON.stringify(sanitizedTasks)))
    }

    if (selectedTaskId) {
      params.set('selected', selectedTaskId)
    }

    params.set('mode', mode)
    if (showRoute !== undefined) {
      params.set('showRoute', showRoute ? '1' : '0')
    }
    if (compact) {
      params.set('compact', '1')
      params.set('hideLocate', '1')
    }
    if (showBack && (mode === 'view' || mode === 'select') && !compact) {
      params.set('showBack', '1')
    }
    if (hideTaskActions) {
      params.set('hideTaskActions', '1')
      params.set('forceRouteExpanded', '1')
    }
    if (dockMode) {
      params.set('dockMode', '1')
    }
    params.set('debug', '0')
    params.set('preferHostLocation', '1')
    params.set('_wv', cacheKeyRef.current)

    if (env === 'WEAPP') {
      return buildWebviewUrl(AMAP_WEBVIEW_URL, params)
    }

    return `/static/amap-h5.html?${params.toString()}`
  }, [compact, dockMode, env, hideTaskActions, mode, sanitizedTasks, sanitizedUserLocation, selectedTaskId, showBack, showRoute])

  const handleMessage = useCallback((event: any) => {
    try {
      if (env === 'WEAPP') {
        const payload = event.detail?.data || []
        const data = Array.isArray(payload) ? payload[payload.length - 1] : payload
        if (!data) return

        switch (data.type) {
          case 'pageReady':
          case 'mapReady':
            console.log('WebView 高德地图已就绪:', data.type)
            setShowSlowLoadHint(false)
            setWebviewError(null)
            break
          case 'mapError':
            handleUnavailable(data.message || '高德地图页面初始化失败')
            break
          case 'markerClick':
            onMarkerClick?.(data.id)
            break
          case 'openTaskDetail':
            onOpenTaskDetail?.(data.id)
            break
          case 'navigate':
            onNavigate?.(data.location)
            break
          case 'locationSelect':
            onLocationSelect?.(data.location)
            break
          case 'locationConfirm':
            onLocationConfirm?.(data.location)
            break
          case 'locate':
            onLocate?.()
            break
          case 'back':
            onBack?.()
            break
        }
        return
      }

      const raw = event.detail?.data ?? event.data
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!data) return

      switch (data.type) {
        case 'pageReady':
        case 'mapReady':
          console.log('WebView 高德地图已就绪:', data.type)
          setShowSlowLoadHint(false)
          setWebviewError(null)
          break
        case 'mapError':
          handleUnavailable(data.message || '高德地图页面初始化失败')
          break
        case 'markerClick':
          onMarkerClick?.(data.id)
          break
        case 'openTaskDetail':
          onOpenTaskDetail?.(data.id)
          break
        case 'navigate':
          onNavigate?.(data.location)
          break
        case 'locationSelect':
          onLocationSelect?.(data.location)
          break
        case 'locationConfirm':
          onLocationConfirm?.(data.location)
          break
        case 'locate':
          onLocate?.()
          break
        case 'back':
          onBack?.()
          break
      }
    } catch (error) {
      console.error('WebView message parse failed:', error)
    }
  }, [env, handleUnavailable, onBack, onLocate, onLocationConfirm, onLocationSelect, onMarkerClick, onNavigate, onOpenTaskDetail])

  useEffect(() => {
    setWebviewLoaded(false)
    setShowSlowLoadHint(false)
    setWebviewError(null)
  }, [src])

  useEffect(() => {
    if (env !== 'WEAPP' || !src || !AMAP_WEBVIEW_URL || webviewLoaded) return
    const timer = setTimeout(() => {
      console.warn('WebView 高德地图加载较慢，暂不自动回退')
      setShowSlowLoadHint(true)
    }, 12000)
    return () => clearTimeout(timer)
  }, [env, src, webviewLoaded])

  if (env === 'WEAPP' && !AMAP_WEBVIEW_URL) {
    return (
      <View className='webview-amap-view webview-empty'>
        <Text className='empty-title'>高德地图 H5 页面未配置</Text>
        <Text className='empty-desc'>请把部署后的 `amap-h5.html` HTTPS 地址写入 `TARO_APP_MAP_WEBVIEW_URL`，并加入微信业务域名。</Text>
      </View>
    )
  }

  return (
    <View
      className={`webview-amap-view ${compact ? 'compact' : ''}`}
      style={{
        minHeight: compact ? '120px' : (layout === 'fill' ? '0px' : '400px'),
        height: compact ? '120px' : (layout === 'fill' ? '100%' : 'auto'),
        pointerEvents: compact ? 'none' : 'auto'
      }}
    >
      {src ? (
          <WebView
          src={src}
          onLoad={(event) => {
            console.log('WebView 页面已加载:', event?.detail || src)
            setWebviewLoaded(true)
            setShowSlowLoadHint(false)
            setWebviewError(null)
          }}
          onMessage={handleMessage}
          onError={(event) => {
            console.error('WebView 页面加载失败:', event?.detail || event)
            handleUnavailable('高德地图 H5 页面加载失败，请检查业务域名和页面地址')
          }}
          className='amap-webview'
          style={{
            minHeight: compact ? '120px' : (layout === 'fill' ? '0px' : '400px'),
            height: compact ? '120px' : (layout === 'fill' ? '100%' : 'auto'),
            pointerEvents: compact ? 'none' : 'auto'
          }}
        />
      ) : (
        <View className='amap-loading'>
          <View className='loading-spinner' />
          <View className='loading-text'>加载地图中...</View>
        </View>
      )}

      {webviewError && (
        <View className='webview-error'>
          <Text className='error-title'>地图未加载成功</Text>
          <Text className='error-desc'>{webviewError}</Text>
        </View>
      )}

      {!webviewError && showSlowLoadHint && env === 'WEAPP' && (
        <View className='webview-error'>
          <Text className='error-title'>高德地图加载较慢</Text>
          <Text className='error-desc'>页面正在加载 WebView 高德地图，请稍等一下；如果一直空白，检查 `TARO_APP_MAP_WEBVIEW_URL`、H5 页面可访问性和微信业务域名配置。</Text>
        </View>
      )}
    </View>
  )
}
