import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { calculateDistance } from '../../utils/distance'
import { normalizeCoordinate, sanitizeTaskMarkers } from '../../utils/mapData'
import { DEFAULT_CAMPUS_LOCATION, getCurrentLocationWithFallback } from '../../utils/location'
import AmapView from '../../components/AmapView'
import WebviewAmapView from '../../components/WebviewAmapView'
import './index.scss'

interface NearbyTask {
  id: string
  title: string
  reward: number
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

export default function MapPage() {
  const [tasks, setTasks] = useState<NearbyTask[]>([])
  const [currentLocation, setCurrentLocation] = useState({
    latitude: DEFAULT_CAMPUS_LOCATION.latitude,
    longitude: DEFAULT_CAMPUS_LOCATION.longitude
  })
  const [locationName, setLocationName] = useState(DEFAULT_CAMPUS_LOCATION.name)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [webviewMapUnavailable, setWebviewMapUnavailable] = useState(false)

  const sanitizedCurrentLocation = useMemo(
    () => normalizeCoordinate(currentLocation) || { latitude: 39.9155, longitude: 116.5568 },
    [currentLocation]
  )

  const sortedTasks = useMemo(() => {
    return tasks
      .map(task => ({
        ...task,
        distance: calculateDistance(
          sanitizedCurrentLocation.latitude,
          sanitizedCurrentLocation.longitude,
          task.location.latitude,
          task.location.longitude
        )
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }, [tasks, sanitizedCurrentLocation])

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
      '独立地图任务'
    )
  }, [sortedTasks])

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id,title,reward,priority,location,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(60)

      if (error) {
        console.error('[MapPage] 获取任务失败:', error)
        return
      }

      const formatted = (data || [])
        .map(item => {
          const location = normalizeCoordinate(item.location)
          if (!location || !item.id) {
            return null
          }
          return {
            id: String(item.id),
            title: item.title || '任务',
            reward: Number(item.reward || 0),
            priority: item.priority === 'urgent' ? 'urgent' : 'normal',
            created_at: item.created_at || '',
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              name: item.location?.name || '校园内',
              address: item.location?.address || item.location?.name || '校园内'
            }
          } as NearbyTask
        })
        .filter((item): item is NearbyTask => Boolean(item))

      setTasks(formatted)
    } catch (error) {
      console.error('[MapPage] 获取任务异常:', error)
    }
  }, [])

  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await getCurrentLocationWithFallback()
      if (location) {
        setCurrentLocation({ latitude: location.latitude, longitude: location.longitude })
        setLocationName(location.name || '当前位置')
        setLocationError(location.source === 'default' ? '定位失败，已切换到校园默认点' : null)
        return
      }
      setCurrentLocation({ latitude: DEFAULT_CAMPUS_LOCATION.latitude, longitude: DEFAULT_CAMPUS_LOCATION.longitude })
      setLocationName(DEFAULT_CAMPUS_LOCATION.name)
      setLocationError('定位失败，已切换到校园默认点')
    } catch (error) {
      console.error('[MapPage] 定位失败:', error)
      setCurrentLocation({ latitude: DEFAULT_CAMPUS_LOCATION.latitude, longitude: DEFAULT_CAMPUS_LOCATION.longitude })
      setLocationName(DEFAULT_CAMPUS_LOCATION.name)
      setLocationError('定位失败，已切换到校园默认点')
    }
  }, [])

  useDidShow(() => {
    fetchTasks()
    getCurrentLocation()
  })

  const closeMapPage = useCallback(() => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack({ delta: 1 })
      return
    }
    Taro.switchTab({ url: '/pages/index/index' })
  }, [])

  const handleMapNavigate = useCallback((location: { latitude: number; longitude: number; name: string; address: string }) => {
    Taro.openLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      address: location.address,
      scale: 18
    })
  }, [])

  return (
    <View className='map-page'>
      <View className='map-page-body'>
        {!webviewMapUnavailable ? (
          <WebviewAmapView
            userLocation={sanitizedCurrentLocation}
            tasks={mapTasks}
            selectedTaskId={selectedTaskId}
            mode='view'
            showRoute
            showBack={false}
            dockMode
            layout='fill'
            onMarkerClick={setSelectedTaskId}
            onOpenTaskDetail={(id) => {
              Taro.navigateTo({ url: `/pages/task/detail/index?id=${id}` })
            }}
            onNavigate={handleMapNavigate}
            onLocationSelect={(location) => {
              setCurrentLocation({ latitude: location.latitude, longitude: location.longitude })
              setLocationName(location.name || '当前位置')
              setLocationError(null)
            }}
            onLocate={getCurrentLocation}
            onBack={closeMapPage}
            onUnavailable={() => {
              setWebviewMapUnavailable(true)
              Taro.showToast({ title: '网页地图不可用，已切换原生地图', icon: 'none' })
            }}
          />
        ) : (
          <View className='map-page-fallback'>
            <View className='fallback-banner'>
              <Text className='fallback-text'>网页地图不可访问，当前使用原生地图</Text>
              <Text className='fallback-retry' onClick={() => setWebviewMapUnavailable(false)}>重试网页地图</Text>
            </View>
            <View className='fallback-map'>
              <AmapView
                initialLocation={sanitizedCurrentLocation}
                markers={mapTasks}
                selectedMarkerId={selectedTaskId}
                mode='view'
                showRoute
                onMarkerClick={setSelectedTaskId}
                onLocationSelect={(location) => {
                  setCurrentLocation({ latitude: location.latitude, longitude: location.longitude })
                  setLocationName(location.name || '当前位置')
                  setLocationError(null)
                }}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
