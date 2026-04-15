import { View, Text, Button, Input, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../../utils/supabase'
import { useAuth } from '../../hooks/useAuth'
import { calculateDistance, formatDistance } from '../../utils/distance'
import { getWalkingRoute, formatDuration, RouteInfo } from '../../utils/amap'
import { normalizeCoordinate, sanitizeLocationList, sanitizeTaskMarkers } from '../../utils/mapData'
import { DEFAULT_CAMPUS_LOCATION, getCurrentLocationWithFallback } from '../../utils/location'
import AmapView from '../../components/AmapView'
import WebviewAmapView from '../../components/WebviewAmapView'
import './index.scss'

type WorkStatus = 'off' | 'standby' | 'active'
type ViewMode = 'list' | 'map'

const isWeapp = process.env.TARO_ENV === 'weapp'

interface NearbyTask {
  id: string
  title: string
  reward: number
  type: 'delivery' | 'help' | 'tutoring' | 'other'
  priority: 'normal' | 'urgent'
  location: {
    latitude: number
    longitude: number
    name: string
    address: string
  }
  created_at: string
  distance?: number
}

interface Location {
  name: string
  latitude: number
  longitude: number
}

export default function Index() {
  const { user, isAuthenticated, loading: authLoading, toggleWorkStatus, checkAndInitAuth } = useAuth()

  useDidShow(() => {
    console.log('首页显示，重新检查认证状态')
    checkAndInitAuth()
  })
  const [workStatus, setWorkStatus] = useState<WorkStatus>('off')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<NearbyTask[]>([])
  const [currentLocation, setCurrentLocation] = useState({ latitude: 39.9155, longitude: 116.5568 })
  const [locationName, setLocationName] = useState('主楼')
  const [statusChanging, setStatusChanging] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showNavigationPicker, setShowNavigationPicker] = useState(false)
  const [webviewMapUnavailable, setWebviewMapUnavailable] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'delivery' | 'help' | 'tutoring'>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | 'normal' | 'urgent'>('all')
  const [filterDistance, setFilterDistance] = useState<'all' | 'near' | 'medium' | 'far'>('all')
  const [locations, setLocations] = useState<Location[]>([])
  const [locationsLoading, setLocationsLoading] = useState(false)
  const sanitizedCurrentLocation = useMemo(
    () => normalizeCoordinate(currentLocation) || { latitude: 39.9155, longitude: 116.5568 },
    [currentLocation]
  )

  const loadLocations = async () => {
    setLocationsLoading(true)
    try {
      const { data, error } = await supabase
        .from('campus_locations')
        .select('name, latitude, longitude')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error loading locations:', error)
        return
      }

      if (data) {
        const sanitized = sanitizeLocationList(data, '地点')
        setLocations(sanitized)
        const isUsingFallbackLocation =
          locationError !== null ||
          locationName === '主楼' ||
          locationName === '图书馆' ||
          (currentLocation.latitude === 39.9155 && currentLocation.longitude === 116.5568)

        if (sanitized.length > 0 && isUsingFallbackLocation) {
          setCurrentLocation({ latitude: sanitized[0].latitude, longitude: sanitized[0].longitude })
          setLocationName(sanitized[0].name)
          setLocationError(null)
        }
      }
    } catch (err) {
      console.error('Failed to load locations:', err)
    } finally {
      setLocationsLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      fetchTasks()
      getCurrentLocation()
      loadLocations()
    }
  }, [authLoading])

  useEffect(() => {
    if (user?.work_status) {
      setWorkStatus(user.work_status as WorkStatus)
    }
  }, [user?.work_status])

  const isVerifiedUser = user?.status === 'verified'

  const urgentCount = useMemo(
    () => tasks.filter(item => item.priority === 'urgent').length,
    [tasks]
  )

  const sortedTasks = useMemo(() => {
    let filtered = tasks
      .map(task => ({
        ...task,
        distance: calculateDistance(
          sanitizedCurrentLocation.latitude,
          sanitizedCurrentLocation.longitude,
          task.location.latitude,
          task.location.longitude
        )
      }))

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.location.name.toLowerCase().includes(query) ||
        (task.location.address && task.location.address.toLowerCase().includes(query))
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(task => task.type === filterType)
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority)
    }

    if (filterDistance !== 'all') {
      filtered = filtered.filter(task => {
        const dist = task.distance || 0
        if (filterDistance === 'near') return dist <= 500
        if (filterDistance === 'medium') return dist > 500 && dist <= 1500
        if (filterDistance === 'far') return dist > 1500
        return true
      })
    }
    return filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }, [tasks, sanitizedCurrentLocation, searchQuery, filterType, filterPriority, filterDistance])

  const mapTasks = useMemo(() => {
    return sanitizeTaskMarkers(
      sortedTasks.map(task => ({
        id: task.id,
        latitude: task.location.latitude,
        longitude: task.location.longitude,
        title: task.title,
        reward: task.reward,
        priority: task.priority || 'normal'
      })),
      '首页地图任务'
    )
  }, [sortedTasks])

  const selectedTask = useMemo(() => {
    return sortedTasks.find(t => t.id === selectedTaskId) || null
  }, [sortedTasks, selectedTaskId])

  const handleMapNavigate = useCallback((location: { latitude: number; longitude: number; name: string; address: string }) => {
    const env = Taro.getEnv()
    if (env === 'WEAPP') {
      Taro.openLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        address: location.address,
        scale: 18
      })
      return
    }

    const url = `https://uri.amap.com/navigation?to=${location.longitude},${location.latitude},${encodeURIComponent(location.name)}&mode=walk&policy=1&src=campus-helper&coordinate=gaode`
    window.open(url, '_blank')
  }, [])

  const fetchRoute = useCallback(async (origin: { latitude: number; longitude: number }, dest: { latitude: number; longitude: number }) => {
    try {
      const route = await getWalkingRoute(origin, dest)
      setRouteInfo(route)
    } catch (error) {
      console.error('获取路线失败:', error)
      setRouteInfo(null)
    }
  }, [])

  useEffect(() => {
    if (selectedTaskId && sanitizedCurrentLocation) {
      const task = sortedTasks.find(t => t.id === selectedTaskId)
      if (task) {
        fetchRoute(sanitizedCurrentLocation, task.location)
      }
    }
  }, [selectedTaskId, sanitizedCurrentLocation, sortedTasks, fetchRoute])

  const handleStatusChange = useCallback(async (newStatus: WorkStatus) => {
    if (statusChanging) return
    if (!isAuthenticated) {
      Taro.showToast({ title: '请先登录认证', icon: 'none' })
      setTimeout(() => Taro.navigateTo({ url: '/pages/login/index' }), 1500)
      return
    }
    if (newStatus !== 'off' && !isVerifiedUser) {
      Taro.showToast({ title: '请先完成校园认证', icon: 'none' })
      setTimeout(() => Taro.navigateTo({ url: '/pages/auth/verify' }), 1200)
      return
    }
    setStatusChanging(true)
    try {
      await toggleWorkStatus(newStatus)
      setWorkStatus(newStatus)
      Taro.showToast({ title: getStatusToast(newStatus), icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: '状态切换失败', icon: 'none' })
    } finally {
      setStatusChanging(false)
    }
  }, [statusChanging, isAuthenticated, isVerifiedUser, toggleWorkStatus])

  const getStatusToast = (status: WorkStatus) => {
    const map = { off: '已休息', standby: '待命中', active: '接单中' }
    return map[status]
  }

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id,title,reward,type,priority,location,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(12)

      if (error) {
        console.error('Error fetching tasks:', error)
      } else {
        const formatted = (data || [])
          .map(item => {
            const location = normalizeCoordinate(item.location)
            if (!location) {
              console.warn('[首页] 过滤非法任务地点:', item)
              return null
            }

            return {
              ...item,
              location: {
                latitude: location.latitude,
                longitude: location.longitude,
                name: item.location?.name || '校园内',
                address: item.location?.address || item.location?.name || '校园内'
              }
            }
          })
          .filter((item): item is NearbyTask => Boolean(item))
        setTasks(formatted)
      }
    } catch (_error) {
      console.error('Error in fetchTasks:', _error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = async () => {
    try {
      const location = await getCurrentLocationWithFallback()
      if (location) {
        setCurrentLocation({ latitude: location.latitude, longitude: location.longitude })
        setLocationName(location.name || '当前位置')
        setLocationError(location.source === 'default' ? '定位失败，已切换到校园默认点' : null)
      } else {
        setCurrentLocation({ latitude: DEFAULT_CAMPUS_LOCATION.latitude, longitude: DEFAULT_CAMPUS_LOCATION.longitude })
        setLocationName(DEFAULT_CAMPUS_LOCATION.name)
        setLocationError('定位失败，已切换到校园默认点')
      }
    } catch (error) {
      console.error('获取位置失败:', error)
      setCurrentLocation({ latitude: DEFAULT_CAMPUS_LOCATION.latitude, longitude: DEFAULT_CAMPUS_LOCATION.longitude })
      setLocationName(DEFAULT_CAMPUS_LOCATION.name)
      setLocationError('定位失败，已切换到校园默认点')
    }
  }

  const handleSelectLocation = (loc: Location) => {
    setCurrentLocation({ latitude: loc.latitude, longitude: loc.longitude })
    setLocationName(loc.name)
    setLocationError(null)
    setShowLocationPicker(false)
    Taro.showToast({ title: `已切换到${loc.name}`, icon: 'success' })
  }

  const handleMapLocate = useCallback(async () => {
    try {
      const location = await getCurrentLocationWithFallback()
      if (location) {
        setCurrentLocation({ latitude: location.latitude, longitude: location.longitude })
        setLocationName(location.name || '当前位置')
        setLocationError(location.source === 'default' ? '定位失败，已切换到校园默认点' : null)
        return
      }
      const fallbackLocation = locations[0]
      if (fallbackLocation) {
        setCurrentLocation({ latitude: fallbackLocation.latitude, longitude: fallbackLocation.longitude })
        setLocationName(fallbackLocation.name)
        setLocationError('定位失败，已切换到校园默认点')
        return
      }
      Taro.showToast({ title: '定位失败', icon: 'none' })
    } catch (error) {
      console.error('地图定位失败:', error)
      const fallbackLocation = locations[0]
      if (fallbackLocation) {
        setCurrentLocation({ latitude: fallbackLocation.latitude, longitude: fallbackLocation.longitude })
        setLocationName(fallbackLocation.name)
        setLocationError('定位失败，已切换到校园默认点')
        return
      }
      Taro.showToast({ title: '定位失败', icon: 'none' })
    }
  }, [locations])



  const toLogin = () => Taro.navigateTo({ url: '/pages/login/index' })
  const toPublish = () => Taro.switchTab({ url: '/pages/task/publish/index' })
  const toMyTasks = () => Taro.switchTab({ url: '/pages/my-tasks/index' })
  const toDetail = (id: string) => Taro.navigateTo({ url: `/pages/task/detail/index?id=${id}` })
  const displayName = user?.nickname || user?.name || '同学'

  const statusConfig = {
    off: { label: '休息', emoji: '😴' },
    standby: { label: '待命', emoji: '⏳' },
    active: { label: '接单', emoji: '🚀' }
  }

  const typeEmoji: Record<string, string> = {
    delivery: '📦',
    help: '🤝',
    tutoring: '📚',
    other: '📋'
  }

  const viewSwitcher = (
    <View className='view-switcher'>
      <View className={`switch-btn ${viewMode === 'list' || isWeapp ? 'active' : ''}`} onClick={() => setViewMode('list')}>
        <Text className='switch-icon'>📋</Text>
        <Text className='switch-text'>列表</Text>
      </View>
      <View className={`switch-btn ${!isWeapp && viewMode === 'map' ? 'active' : ''}`} onClick={() => {
        setShowLocationPicker(false)
        if (isWeapp) {
          Taro.navigateTo({ url: '/pages/map/index' })
          return
        }
        setViewMode('map')
      }}>
        <Text className='switch-icon'>🗺️</Text>
        <Text className='switch-text'>地图</Text>
      </View>
    </View>
  )

  if (authLoading) {
    return (
      <View className='page-loading'>
        <View className='spinner' />
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='index-page'>
      <View className='status-switcher'>
        {(Object.keys(statusConfig) as WorkStatus[]).map(status => (
          <View
            key={status}
            className={`switch-item ${workStatus === status ? 'active' : ''} switch-${status}`}
            onClick={() => handleStatusChange(status)}
          >
            <Text className='icon'>{statusConfig[status].emoji}</Text>
            <Text className='text'>{statusConfig[status].label}</Text>
          </View>
        ))}
      </View>

      {workStatus === 'off' && (
        <View className='content off-content'>
          <View className='welcome-card'>
            <Text className='welcome-emoji'>👋</Text>
            <View className='welcome-text'>
              <Text className='welcome-title'>欢迎回来，{displayName}</Text>
              <Text className='welcome-desc'>当前有 {tasks.length} 个可接任务，紧急任务 {urgentCount} 个</Text>
            </View>
          </View>

          <View className='stats-row'>
            <View className='stat-card'>
              <Text className='stat-num'>{tasks.length}</Text>
              <Text className='stat-label'>待接任务</Text>
            </View>
            <View className='stat-card urgent'>
              <Text className='stat-num'>{urgentCount}</Text>
              <Text className='stat-label'>紧急任务</Text>
            </View>
            <View className='stat-card'>
              <Text className='stat-num'>{isVerifiedUser ? '已认证' : '未认证'}</Text>
              <Text className='stat-label'>账号状态</Text>
            </View>
          </View>

          <View className='action-buttons'>
            {isAuthenticated ? (
              <>
                <Button className='btn btn-primary' onClick={() => handleStatusChange('active')}>
                  🚀 开始接单
                </Button>
                <Button className='btn btn-secondary' onClick={() => handleStatusChange('standby')}>
                  ⏳ 进入待命
                </Button>
                <View className='btn-row'>
                  <Button className='btn btn-outline' onClick={toPublish}>发布任务</Button>
                  <Button className='btn btn-outline' onClick={toMyTasks}>我的任务</Button>
                </View>
              </>
            ) : (
              <Button className='btn btn-primary' onClick={toLogin}>
                去登录并认证
              </Button>
            )}
          </View>
        </View>
      )}

      {workStatus === 'standby' && (
        <View className='content standby-content'>
          <View className='standby-card'>
            <Text className='standby-emoji'>⏳</Text>
            <Text className='standby-title'>待命中</Text>
            <Text className='standby-desc'>有新任务时会通知你</Text>
            <View className='standby-stats'>
              <View className='standby-stat'>
                <Text className='standby-num'>{tasks.length}</Text>
                <Text className='standby-label'>可接任务</Text>
              </View>
              <View className='divider' />
              <View className='standby-stat'>
                <Text className='standby-num urgent'>{urgentCount}</Text>
                <Text className='standby-label'>紧急任务</Text>
              </View>
            </View>
          </View>
          <View className='standby-btns'>
            <Button className='btn btn-primary' onClick={() => handleStatusChange('active')}>
              立即开始接单
            </Button>
            <Button className='btn btn-outline' onClick={() => handleStatusChange('off')}>
              休息一下
            </Button>
          </View>
        </View>
      )}

      {workStatus === 'active' && viewMode === 'list' && (
        <View className='content active-content'>
          <View className='location-bar' onClick={() => setShowLocationPicker(!showLocationPicker)}>
            <Text className='location-icon'>📍</Text>
            <View className='location-info'>
              <Text className='location-name'>{locationName}</Text>
              {locationError && (
                <Text className='location-error'>⚠️ {locationError}</Text>
              )}
            </View>
            <Text className='location-arrow'>▼</Text>
          </View>

          {showLocationPicker && (
            <View className='location-picker'>
              <View className='picker-header'>
                <Text className='picker-title'>选择你的位置</Text>
                <Text className='picker-auto' onClick={getCurrentLocation}>🎯 自动定位</Text>
              </View>
              <View className='picker-list'>
                {locationsLoading ? (
                  <View className='picker-loading'>
                    <Text>加载中...</Text>
                  </View>
                ) : locations.length === 0 ? (
                  <View className='picker-empty'>
                    <Text>暂无地点数据</Text>
                  </View>
                ) : (
                  locations.map(loc => (
                    <View
                      key={loc.name}
                      className={`picker-item ${locationName === loc.name ? 'active' : ''}`}
                      onClick={() => handleSelectLocation(loc)}
                    >
                      <Text className='picker-icon'>📍</Text>
                      <Text className='picker-name'>{loc.name}</Text>
                      {locationName === loc.name && <Text className='picker-check'>✓</Text>}
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          <View className='search-bar'>
            <View className='search-input-wrapper'>
              <Text className='search-icon'>🔍</Text>
              <Input
                className='search-input'
                placeholder='搜索任务标题或地点...'
                value={searchQuery}
                onInput={e => setSearchQuery(e.detail.value)}
              />
              {searchQuery && (
                <Text className='search-clear' onClick={() => setSearchQuery('')}>✕</Text>
              )}
            </View>
          </View>

          <View className='filter-section'>
            <ScrollView className='filter-scroll' scrollX>
              <View className='filter-group'>
                <Text className='filter-label'>类型:</Text>
                <View
                  className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  <Text>全部</Text>
                </View>
                <View
                  className={`filter-chip ${filterType === 'delivery' ? 'active' : ''}`}
                  onClick={() => setFilterType('delivery')}
                >
                  <Text>代取</Text>
                </View>
                <View
                  className={`filter-chip ${filterType === 'help' ? 'active' : ''}`}
                  onClick={() => setFilterType('help')}
                >
                  <Text>求助</Text>
                </View>
                <View
                  className={`filter-chip ${filterType === 'tutoring' ? 'active' : ''}`}
                  onClick={() => setFilterType('tutoring')}
                >
                  <Text>辅导</Text>
                </View>
              </View>

              <View className='filter-group'>
                <Text className='filter-label'>紧急:</Text>
                <View
                  className={`filter-chip ${filterPriority === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterPriority('all')}
                >
                  <Text>全部</Text>
                </View>
                <View
                  className={`filter-chip urgent ${filterPriority === 'urgent' ? 'active' : ''}`}
                  onClick={() => setFilterPriority('urgent')}
                >
                  <Text>🔥 紧急</Text>
                </View>
              </View>

              <View className='filter-group'>
                <Text className='filter-label'>距离:</Text>
                <View
                  className={`filter-chip ${filterDistance === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterDistance('all')}
                >
                  <Text>全部</Text>
                </View>
                <View
                  className={`filter-chip ${filterDistance === 'near' ? 'active' : ''}`}
                  onClick={() => setFilterDistance('near')}
                >
                  <Text>&lt; 500m</Text>
                </View>
                <View
                  className={`filter-chip ${filterDistance === 'medium' ? 'active' : ''}`}
                  onClick={() => setFilterDistance('medium')}
                >
                  <Text>500m-1.5km</Text>
                </View>
                <View
                  className={`filter-chip ${filterDistance === 'far' ? 'active' : ''}`}
                  onClick={() => setFilterDistance('far')}
                >
                  <Text>&gt; 1.5km</Text>
                </View>
              </View>
            </ScrollView>
          </View>

          {viewSwitcher}

          <View className='task-panel'>
            <View className='panel-header'>
              <View className='header-left'>
                <Text className='panel-title'>附近任务</Text>
                <View className='task-count'>{sortedTasks.length}</View>
              </View>
              <Text className='refresh-btn' onClick={fetchTasks}>🔄 刷新</Text>
            </View>
            {loading ? (
              <View className='panel-loading'>
                <View className='mini-spinner' />
                <Text>加载中...</Text>
              </View>
            ) : sortedTasks.length === 0 ? (
              <View className='panel-empty'>
                <Text className='empty-icon'>📭</Text>
                <Text>暂无可抢任务</Text>
              </View>
            ) : (
              <View className='task-list'>
                {sortedTasks.slice(0, 8).map(item => (
                  <View
                    className='task-card'
                    key={item.id}
                    onClick={() => toDetail(item.id)}
                  >
                    <View className='task-left'>
                      <Text className='task-emoji'>{typeEmoji[item.type] || '📋'}</Text>
                    </View>
                    <View className='task-info'>
                      <Text className='task-title'>{item.title}</Text>
                      <View className='task-meta'>
                        <Text className='task-loc'>📍 {item.location?.name || '校园内'}</Text>
                        <Text className='task-distance'>
                          📏 {formatDistance(item.distance || 0)}
                        </Text>
                      </View>
                    </View>
                    <View className='task-price'>
                      <Text className='price'>¥{item.reward}</Text>
                      <Text className={`priority ${item.priority}`}>
                        {item.priority === 'urgent' ? '🔥紧急' : '普通'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Button className='view-all-btn' onClick={toMyTasks}>查看全部任务</Button>
          </View>
        </View>
      )}

      {workStatus === 'active' && viewMode === 'map' && isWeapp && (
        <View className='map-fullscreen map-weapp-only'>
          <View className='map-weapp-webview'>
            {!webviewMapUnavailable ? (
              <WebviewAmapView
                userLocation={sanitizedCurrentLocation}
                tasks={mapTasks}
                selectedTaskId={selectedTaskId}
                mode='view'
                showRoute
                showBack
                dockMode
                layout='fill'
                onMarkerClick={(id) => {
                  setSelectedTaskId(id)
                }}
                onOpenTaskDetail={(id) => {
                  toDetail(id)
                }}
                onNavigate={handleMapNavigate}
                onLocationSelect={(location) => {
                  setCurrentLocation({ latitude: location.latitude, longitude: location.longitude })
                  setLocationName(location.name || '当前位置')
                  setLocationError(null)
                }}
                onLocate={handleMapLocate}
                onBack={() => {
                  setViewMode('list')
                  setShowLocationPicker(false)
                  setSelectedTaskId(null)
                  setRouteInfo(null)
                }}
                onUnavailable={() => {
                  setWebviewMapUnavailable(true)
                  Taro.showToast({ title: '网页地图不可用，已切换原生地图', icon: 'none' })
                }}
              />
            ) : (
              <View className='map-weapp-fallback'>
                <View className='map-weapp-fallback-banner'>
                  <Text className='map-weapp-fallback-text'>网页地图当前不可访问，已切换原生地图</Text>
                  <Text
                    className='map-weapp-fallback-retry'
                    onClick={() => setWebviewMapUnavailable(false)}
                  >
                    重试网页地图
                  </Text>
                </View>
                <AmapView
                  initialLocation={sanitizedCurrentLocation}
                  markers={mapTasks}
                  selectedMarkerId={selectedTaskId}
                  mode='view'
                  showRoute
                  onMarkerClick={(id) => {
                    setSelectedTaskId(id)
                  }}
                  onLocationSelect={(location) => {
                    setCurrentLocation({ latitude: location.latitude, longitude: location.longitude })
                    setLocationName(location.name || '当前位置')
                    setLocationError(null)
                  }}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {workStatus === 'active' && viewMode === 'map' && !isWeapp && (
        <View className='map-fullscreen'>
          <View className='map-header'>
            <View className='map-back' onClick={() => {
              setViewMode('list')
              setSelectedTaskId(null)
              setRouteInfo(null)
            }}>
              <Text className='back-icon'>←</Text>
              <Text className='back-text'>返回列表</Text>
            </View>
            <View className='map-location' onClick={() => {
              setViewMode('list')
              setShowLocationPicker(true)
            }}>
              <Text className='location-label'>📍 {locationName} ▼</Text>
            </View>
            <Text className='map-refresh' onClick={getCurrentLocation}>🎯</Text>
          </View>

          <View className='amap-container'>
            <AmapView
              initialLocation={sanitizedCurrentLocation}
              markers={mapTasks}
              selectedMarkerId={selectedTaskId}
              mode='view'
              showRoute
              onMarkerClick={(id) => {
                setSelectedTaskId(id)
              }}
              onLocationSelect={(location) => {
                setCurrentLocation({ latitude: location.latitude, longitude: location.longitude })
                setLocationName(location.name || '当前位置')
                setLocationError(null)
              }}
            />
          </View>

          {selectedTask && (
            <View className='task-popup'>
              <View className='popup-content' onClick={() => toDetail(selectedTask.id)}>
                <View className='popup-header'>
                  <Text className='popup-emoji'>{typeEmoji[selectedTask.type] || '📋'}</Text>
                  <View className='popup-info'>
                    <Text className='popup-title'>{selectedTask.title}</Text>
                    <View className='popup-meta'>
                      <Text className='popup-loc'>📍 {selectedTask.location?.name}</Text>
                      <Text className='popup-distance'>📏 {formatDistance(selectedTask.distance || 0)}</Text>
                    </View>
                  </View>
                  <View className='popup-price'>
                    <Text className='popup-reward'>¥{selectedTask.reward}</Text>
                    <Text className={`popup-priority ${selectedTask.priority}`}>
                      {selectedTask.priority === 'urgent' ? '🔥紧急' : '普通'}
                    </Text>
                  </View>
                </View>

                {routeInfo && (
                  <View className='popup-route'>
                    <View className='route-summary'>
                      <View className='route-item'>
                        <Text className='route-label'>步行距离</Text>
                        <Text className='route-value'>{(routeInfo.distance / 1000).toFixed(2)} 公里</Text>
                      </View>
                      <View className='route-divider' />
                      <View className='route-item'>
                        <Text className='route-label'>预计时间</Text>
                        <Text className='route-value'>{formatDuration(routeInfo.duration)}</Text>
                      </View>
                    </View>
                    {routeInfo.steps && routeInfo.steps.length > 0 && (
                      <View className='route-steps'>
                        <Text className='steps-title'>路线指引</Text>
                        {routeInfo.steps.map((step, index) => {
                          const cleanInstruction = step.instruction.replace(/<[^>]*>/g, '')
                          return (
                            <View key={index} className='route-step'>
                              <View className='step-number'>{index + 1}</View>
                              <View className='step-content'>
                                <Text className='step-instruction'>{cleanInstruction}</Text>
                                <View className='step-meta'>
                                  <Text className='step-distance'>{formatDistance(step.distance)}</Text>
                                  <Text className='step-duration'>{formatDuration(step.duration)}</Text>
                                </View>
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    )}
                  </View>
                )}

                <View className='popup-actions'>
                  <View className='action-btn' onClick={(e) => {
                    e.stopPropagation()
                    setShowNavigationPicker(true)
                  }}>
                    <Text className='action-icon'>🧭</Text>
                    <Text className='action-text'>导航前往</Text>
                  </View>
                  <View className='action-btn primary' onClick={() => toDetail(selectedTask.id)}>
                    <Text className='action-icon'>📝</Text>
                    <Text className='action-text'>查看详情</Text>
                  </View>
                </View>
              </View>
              <View className='popup-close' onClick={(e) => {
                e.stopPropagation()
                setSelectedTaskId(null)
                setRouteInfo(null)
              }}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>
          )}

          {!selectedTask && sortedTasks.length > 0 && (
            <View className='map-hint'>
              <Text className='hint-text'>👆 点击地图上的标记查看任务详情</Text>
            </View>
          )}
        </View>
      )}

      {!isWeapp && showNavigationPicker && selectedTask && (
        <View className='navigation-picker-overlay' onClick={() => setShowNavigationPicker(false)}>
          <View className='navigation-picker' onClick={(e) => e.stopPropagation()}>
            <View className='nav-picker-header'>
              <View className='nav-picker-indicator' />
              <Text className='nav-picker-title'>选择导航方式</Text>
            </View>

            <View className='nav-picker-content'>
              <View className='nav-destination'>
                <Text className='nav-dest-label'>目的地</Text>
                <Text className='nav-dest-name'>{selectedTask.location.name}</Text>
                <Text className='nav-dest-address'>{selectedTask.location.address || selectedTask.location.name}</Text>
              </View>

              <View className='nav-options'>
                <View
                  className='nav-option'
                  onClick={() => {
                    const env = Taro.getEnv()
                    if (env === 'WEAPP') {
                      Taro.openLocation({
                        latitude: selectedTask.location.latitude,
                        longitude: selectedTask.location.longitude,
                        name: selectedTask.location.name,
                        address: selectedTask.location.address,
                        scale: 18
                      })
                    } else {
                      const url = `https://uri.amap.com/navigation?to=${selectedTask.location.longitude},${selectedTask.location.latitude},${encodeURIComponent(selectedTask.location.name)}&mode=walk&policy=1&src=campus-helper&coordinate=gaode`
                      window.open(url, '_blank')
                    }
                    setShowNavigationPicker(false)
                  }}
                >
                  <View className='nav-icon amap'>🗺️</View>
                  <View className='nav-info'>
                    <Text className='nav-name'>高德地图</Text>
                    <Text className='nav-desc'>推荐 · 步行导航</Text>
                  </View>
                  <Text className='nav-arrow'>→</Text>
                </View>

                <View
                  className='nav-option'
                  onClick={() => {
                    const env = Taro.getEnv()
                    if (env === 'WEAPP') {
                      Taro.openLocation({
                        latitude: selectedTask.location.latitude,
                        longitude: selectedTask.location.longitude,
                        name: selectedTask.location.name,
                        address: selectedTask.location.address,
                        scale: 18
                      })
                    } else {
                      const url = `https://map.baidu.com/marker?location=${selectedTask.location.latitude},${selectedTask.location.longitude}&title=${encodeURIComponent(selectedTask.location.name)}&content=${encodeURIComponent(selectedTask.location.address || '')}&output=html`
                      window.open(url, '_blank')
                    }
                    setShowNavigationPicker(false)
                  }}
                >
                  <View className='nav-icon baidu'>📍</View>
                  <View className='nav-info'>
                    <Text className='nav-name'>百度地图</Text>
                    <Text className='nav-desc'>智能路线规划</Text>
                  </View>
                  <Text className='nav-arrow'>→</Text>
                </View>

                <View
                  className='nav-option'
                  onClick={() => {
                    const env = Taro.getEnv()
                    if (env === 'WEAPP') {
                      Taro.openLocation({
                        latitude: selectedTask.location.latitude,
                        longitude: selectedTask.location.longitude,
                        name: selectedTask.location.name,
                        address: selectedTask.location.address,
                        scale: 18
                      })
                    } else {
                      const url = `https://apis.map.qq.com/uri/v1/marker?marker=coord:${selectedTask.location.latitude},${selectedTask.location.longitude};title:${encodeURIComponent(selectedTask.location.name)};addr:${encodeURIComponent(selectedTask.location.address || '')}&referer=campus-helper`
                      window.open(url, '_blank')
                    }
                    setShowNavigationPicker(false)
                  }}
                >
                  <View className='nav-icon tencent'>🌐</View>
                  <View className='nav-info'>
                    <Text className='nav-name'>腾讯地图</Text>
                    <Text className='nav-desc'>精准定位</Text>
                  </View>
                  <Text className='nav-arrow'>→</Text>
                </View>

                {currentLocation && (
                  <View
                    className='nav-option'
                    onClick={() => {
                      const env = Taro.getEnv()
                      if (env === 'WEAPP') {
                        Taro.openLocation({
                          latitude: selectedTask.location.latitude,
                          longitude: selectedTask.location.longitude,
                          name: selectedTask.location.name,
                          address: selectedTask.location.address,
                          scale: 18
                        })
                      } else {
                        const url = `https://www.google.com/maps/dir/${currentLocation.latitude},${currentLocation.longitude}/${selectedTask.location.latitude},${selectedTask.location.longitude}`
                        window.open(url, '_blank')
                      }
                      setShowNavigationPicker(false)
                    }}
                  >
                    <View className='nav-icon google'>🌍</View>
                    <View className='nav-info'>
                      <Text className='nav-name'>Google Maps</Text>
                      <Text className='nav-desc'>国际通用</Text>
                    </View>
                    <Text className='nav-arrow'>→</Text>
                  </View>
                )}
              </View>
            </View>

            <View className='nav-picker-cancel' onClick={() => setShowNavigationPicker(false)}>
              <Text className='nav-cancel-text'>取消</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
