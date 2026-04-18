import { View, Text, Input, Textarea, Button, Picker, Switch, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { normalizeCoordinate, sanitizeLocationList } from '../../../utils/mapData'
import { reverseGeocode } from '../../../utils/amap'
import AmapView from '../../../components/AmapView'
import WebviewAmapView from '../../../components/WebviewAmapView'
import './index.scss'

interface Location {
    id: string
    name: string
    address: string | null
    latitude: number
    longitude: number
    zone_id: string | null
}

interface Zone {
    id: string
    name: string
    color: string
    border_color: string
}

export default function PublishTask() {
    const { user } = useAuth()
    const router = Taro.useRouter()
    const env = Taro.getEnv()
    const isWeapp = env === 'WEAPP'
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)
    const [loadingLocations, setLoadingLocations] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [taskId, setTaskId] = useState<string | null>(null)
    const [showMapPicker, setShowMapPicker] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'delivery',
        reward: '',
        priority: 'normal',
    })

    const [location, setLocation] = useState<Location | null>(null)
    const [tempLocation, setTempLocation] = useState<Location | null>(null)
    const [locations, setLocations] = useState<Location[]>([])
    const [zones, setZones] = useState<Zone[]>([])
    const sanitizedPickerLocation = normalizeCoordinate(tempLocation || location || undefined)

    const taskTypes = [
        { label: '生活代取', value: 'delivery' },
        { label: '校园求助', value: 'help' },
        { label: '学业辅导', value: 'tutoring' }
    ]

    const loadLocations = async () => {
        setLoadingLocations(true)
        try {
            const [locationsResult, zonesResult] = await Promise.all([
                supabase
                    .from('campus_locations')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true }),
                supabase
                    .from('campus_zones')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })
            ])

            if (!locationsResult.error) {
                setLocations(sanitizeLocationList(locationsResult.data as Location[], '发布页地点'))
            }
            if (!zonesResult.error) {
                setZones(zonesResult.data as Zone[])
            }
        } catch (error) {
            console.error('加载地点失败:', error)
        } finally {
            setLoadingLocations(false)
        }
    }

    useLoad(() => {
        const { id } = router.params
        if (id) {
            setIsEditMode(true)
            setTaskId(id)
            fetchTaskForEdit(id)
        }
        loadLocations()
    })

    const fetchTaskForEdit = async (id: string) => {
        setFetching(true)
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            if (data) {
                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    type: data.type || 'delivery',
                    reward: data.reward?.toString() || '',
                    priority: data.priority || 'normal',
                })
                const normalizedLocation = normalizeCoordinate(data.location)
                setLocation(normalizedLocation ? {
                    id: data.location?.id || 'task-location',
                    name: data.location?.name || '任务地点',
                    address: data.location?.address || data.location?.name || '校园内',
                    latitude: normalizedLocation.latitude,
                    longitude: normalizedLocation.longitude,
                    zone_id: data.location?.zone_id || null
                } : null)
            }
        } catch (error) {
            console.error('获取任务失败:', error)
            Taro.showToast({ title: '获取任务失败', icon: 'none' })
        } finally {
            setFetching(false)
        }
    }

    const handlePresetLocation = (loc: Location) => {
        const normalized = normalizeCoordinate(loc)
        if (!normalized) {
            console.warn('[发布页] 忽略非法预设地点:', loc)
            Taro.showToast({ title: '该地点坐标异常，请选择其他地点', icon: 'none' })
            return
        }
        const nextLocation = { ...loc, latitude: normalized.latitude, longitude: normalized.longitude }
        setLocation(nextLocation)
        setTempLocation(nextLocation)
    }

    const handleMapLocationSelect = (loc: { latitude: number; longitude: number; name?: string; address?: string }) => {
        const normalized = normalizeCoordinate(loc)
        if (!normalized) {
            console.warn('[发布页] 忽略非法地图选点:', loc)
            Taro.showToast({ title: '地图选点失败，请重试', icon: 'none' })
            return
        }
        setTempLocation({
            id: 'custom-map-point',
            name: loc.name || '地图选点',
            address: loc.address || loc.name || '校园内',
            latitude: normalized.latitude,
            longitude: normalized.longitude,
            zone_id: null
        })
    }

    const commitMapLocation = (loc: Location) => {
        const normalized = normalizeCoordinate(loc)
        if (!normalized) {
            Taro.showToast({ title: '地图选点失败，请重试', icon: 'none' })
            return
        }

        const nextLocation = {
            ...loc,
            latitude: normalized.latitude,
            longitude: normalized.longitude
        }
        setTempLocation(nextLocation)
        setLocation(nextLocation)
        setShowMapPicker(false)
        Taro.showToast({ title: '已使用地图选点', icon: 'success' })
    }

    const handleMapLocate = async () => {
        try {
            const res = await Taro.getLocation({
                type: 'gcj02',
                isHighAccuracy: true,
                altitude: true
            })

            let name = '当前位置'
            let address = '当前位置'

            try {
                const geo = await reverseGeocode(res.latitude, res.longitude)
                if (geo) {
                    name = geo.name || name
                    address = geo.address || address
                }
            } catch (error) {
                console.error('发布页定位后逆地理编码失败:', error)
            }

            setTempLocation({
                id: 'current-location',
                name,
                address,
                latitude: res.latitude,
                longitude: res.longitude,
                zone_id: null
            })
            Taro.showToast({ title: '已定位到当前位置', icon: 'success' })
        } catch (error) {
            console.error('发布页定位失败:', error)
            Taro.showToast({ title: '定位失败', icon: 'none' })
        }
    }

    const handleMapLocationConfirm = (loc: { latitude: number; longitude: number; name?: string; address?: string }) => {
        commitMapLocation({
            id: 'custom-map-point',
            name: loc.name || '地图选点',
            address: loc.address || loc.name || '校园内',
            latitude: loc.latitude,
            longitude: loc.longitude,
            zone_id: null
        })
    }

    const confirmMapLocation = () => {
        if (!tempLocation) {
            Taro.showToast({ title: '请先在地图上选择位置', icon: 'none' })
            return
        }
        commitMapLocation(tempLocation)
    }

    const getLocationsByZone = () => {
        const grouped: { [key: string]: Location[] } = {}

        zones.forEach(zone => {
            grouped[zone.name] = locations.filter(loc => loc.zone_id === zone.id)
        })

        const ungrouped = locations.filter(loc => !loc.zone_id)
        if (ungrouped.length > 0) {
            grouped['其他'] = ungrouped
        }

        return grouped
    }

    const handleSubmit = async () => {
        const trimmedTitle = formData.title.trim()
        const trimmedDescription = formData.description.trim()
        const rewardValue = Number(formData.reward)

        if (!trimmedTitle) {
            Taro.showToast({ title: '请填写任务标题', icon: 'none' })
            return
        }

        if (!trimmedDescription) {
            Taro.showToast({ title: '请填写详细描述', icon: 'none' })
            return
        }

        if (!Number.isFinite(rewardValue) || rewardValue <= 0) {
            Taro.showToast({ title: '请输入有效酬金', icon: 'none' })
            return
        }

        if (!location) {
            Taro.showToast({ title: '请选择任务地点', icon: 'none' })
            return
        }

        if (!user) {
            Taro.showToast({ title: '请先登录', icon: 'none' })
            return
        }

        const normalizedLocation = normalizeCoordinate(location)
        if (!normalizedLocation) {
            Taro.showToast({ title: '任务地点坐标异常，请重新选择', icon: 'none' })
            return
        }

        setLoading(true)
        try {
            if (isEditMode && taskId) {
                const { error } = await supabase
                    .from('tasks')
                    .update({
                        title: trimmedTitle,
                        description: trimmedDescription,
                        type: formData.type,
                        priority: formData.priority,
                        reward: rewardValue,
                        location: {
                            ...location,
                            latitude: normalizedLocation.latitude,
                            longitude: normalizedLocation.longitude
                        },
                    })
                    .eq('id', taskId)

                if (error) throw error

                Taro.showToast({ title: '修改成功', icon: 'success' })
            } else {
                const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

                const { error } = await supabase
                    .from('tasks')
                    .insert({
                        publisher_id: user.id,
                        title: trimmedTitle,
                        description: trimmedDescription,
                        type: formData.type,
                        priority: formData.priority,
                        reward: rewardValue,
                        location: {
                            ...location,
                            latitude: normalizedLocation.latitude,
                            longitude: normalizedLocation.longitude
                        },
                        deadline: deadline,
                        status: 'published'
                    })

                if (error) throw error

                Taro.showToast({ title: '发布成功', icon: 'success' })
            }

            setTimeout(() => {
                if (isEditMode) {
                    Taro.navigateBack()
                } else {
                    Taro.switchTab({ url: '/pages/my-tasks/index' })
                }
            }, 1500)

        } catch (error) {
            Taro.showToast({ title: isEditMode ? '修改失败' : '发布失败', icon: 'none' })
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return (
            <View className='publish-container'>
                <View className='loading-container'>
                    <Text className='loading-text'>加载中...</Text>
                </View>
            </View>
        )
    }

    const groupedLocations = getLocationsByZone()

    return (
        <View className='publish-container'>
            <View className='decoration-dots'>
                <View className='dot'></View>
                <View className='dot'></View>
                <View className='dot'></View>
            </View>
            <View className='page-header'>
                <View className='header-back' onClick={() => Taro.navigateBack()}>
                    <Text className='back-icon'>←</Text>
                </View>
                <Text className='page-title'>{isEditMode ? '编辑任务' : '发布任务'}</Text>
                <View style={{ width: '40px' }} />
            </View>

            <View className='form-group'>
                <View className='form-item'>
                    <Text className='label'>任务标题</Text>
                    <Input
                        className='input'
                        placeholder='例如：帮取中通快递'
                        value={formData.title}
                        onInput={e => setFormData({ ...formData, title: e.detail.value })}
                    />
                </View>

                <View className='form-item'>
                    <Text className='label'>任务类型</Text>
                    <Picker
                        mode='selector'
                        range={taskTypes}
                        rangeKey='label'
                        onChange={e => setFormData({ ...formData, type: taskTypes[e.detail.value].value })}
                    >
                        <View className='picker'>
                            {taskTypes.find(t => t.value === formData.type)?.label}
                        </View>
                    </Picker>
                </View>

                <View className='form-item'>
                    <Text className='label'>详细描述</Text>
                    <Textarea
                        className='textarea'
                        placeholder='请描述具体需求...'
                        value={formData.description}
                        onInput={e => setFormData({ ...formData, description: e.detail.value })}
                    />
                </View>
            </View>

            <View className='form-group'>
                <View className='form-item'>
                    <Text className='label'>任务地点</Text>
                </View>

                {loadingLocations ? (
                    <View className='loading-container'>
                        <Text className='loading-text'>加载地点中...</Text>
                    </View>
                ) : (
                    <>
                        <View className='map-select-hint' onClick={() => {
                            setTempLocation(location)
                            setShowMapPicker(true)
                        }}>
                            <Text className='hint-icon'>🗺️</Text>
                            <View className='hint-content'>
                                <Text className='hint-title'>地图选点</Text>
                                <Text className='hint-desc'>支持高德地图精确选点，发布任务时更准确</Text>
                            </View>
                            <Text className='hint-arrow'>›</Text>
                        </View>

                        <View className='location-groups'>
                            {Object.entries(groupedLocations).map(([groupName, locations]) => (
                                <View key={groupName} className='location-group'>
                                    <View className='group-header'>
                                        <Text className='group-icon'>
                                            {groupName === '教学区' ? '📚' : groupName === '生活区' ? '🏠' : groupName === '梆子井公寓' ? '🏢' : '📍'}
                                        </Text>
                                        <Text className='group-title'>{groupName}</Text>
                                    </View>
                                    <View className='location-grid'>
                                        {locations.map((loc) => (
                                            <View
                                                key={loc.id}
                                                className={`location-item ${location?.id === loc.id ? 'selected' : ''}`}
                                                onClick={() => handlePresetLocation(loc)}
                                            >
                                                <Text className='loc-name'>{loc.name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {location && (
                    <View className='selected-location'>
                        <Text className='loc-icon'>📍</Text>
                        <View className='loc-info'>
                            <Text className='loc-name'>{location.name}</Text>
                            {location.address && location.address !== location.name && (
                                <Text className='loc-address'>{location.address}</Text>
                            )}
                        </View>
                        <Text className='loc-clear' onClick={() => setLocation(null)}>✕</Text>
                    </View>
                )}
            </View>

            <View className='form-group'>
                <View className='form-item'>
                    <Text className='label'>酬金 (元)</Text>
                    <Input
                        className='input'
                        type='digit'
                        placeholder='0.00'
                        value={formData.reward}
                        onInput={e => setFormData({ ...formData, reward: e.detail.value })}
                    />
                </View>

                <View className='form-item switch-item'>
                    <Text className='label'>紧急求助 (优先推送)</Text>
                    <Switch
                        color='#ff4d4f'
                        checked={formData.priority === 'urgent'}
                        onChange={e => setFormData({ ...formData, priority: e.detail.value ? 'urgent' : 'normal' })}
                    />
                </View>
            </View>

            <View className='footer'>
                <Button
                    className='submit-btn'
                    loading={loading}
                    onClick={handleSubmit}
                >
                    {isEditMode ? '保存修改' : '立即发布'}
                </Button>
            </View>

            {showMapPicker && (
                <View className={`map-picker-page ${isWeapp ? 'weapp-mode' : ''}`}>
                    {isWeapp ? (
                        <View className='map-native-header'>
                            <View className='map-native-back' onClick={() => setShowMapPicker(false)}>
                                <Text className='back-icon'>←</Text>
                                <Text className='back-text'>返回</Text>
                            </View>
                            <Text className='header-title'>地图选点</Text>
                            <View className='map-native-spacer' />
                        </View>
                    ) : (
                        <View className='map-header'>
                            <View className='back-btn' onClick={() => setShowMapPicker(false)}>
                                <Text className='back-icon'>←</Text>
                                <Text className='back-text'>返回</Text>
                            </View>
                            <Text className='header-title'>地图选点</Text>
                            <View style={{ width: '120px' }} />
                        </View>
                    )}

                    <View className='map-location-selector'>
                        <ScrollView
                            className='location-scroll'
                            scrollX={true}
                            showsHorizontalScrollIndicator={false}
                        >
                            <View className='location-pills'>
                                {locations.map(loc => (
                                    <View
                                        key={loc.id}
                                        className={`location-pill ${tempLocation?.id === loc.id ? 'active' : ''}`}
                                        onClick={() => {
                                            const normalized = normalizeCoordinate(loc);
                                            if (normalized) {
                                                setTempLocation({
                                                    ...loc,
                                                    latitude: normalized.latitude,
                                                    longitude: normalized.longitude
                                                });
                                            }
                                        }}
                                    >
                                        <Text className='pill-text'>{loc.name}</Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    <View className='map-wrapper'>
                        {!isWeapp && (
                            <AmapView
                                initialLocation={sanitizedPickerLocation || undefined}
                                mode='select'
                                onLocationSelect={handleMapLocationSelect}
                            />
                        )}

                        {isWeapp && (
                            <WebviewAmapView
                                userLocation={sanitizedPickerLocation || undefined}
                                mode='select'
                                onLocationSelect={handleMapLocationSelect}
                                onLocationConfirm={handleMapLocationConfirm}
                                onLocate={handleMapLocate}
                                onBack={() => setShowMapPicker(false)}
                                showBack={false}
                            />
                        )}
                    </View>

                    {isWeapp ? (
                        <View className='map-native-footer'>
                            <View className='selected-location-info'>
                                <Text className='loc-icon'>📍</Text>
                                <View className='loc-details'>
                                    {tempLocation ? (
                                        <>
                                            <Text className='loc-name'>{tempLocation.name}</Text>
                                            <Text className='loc-address'>{tempLocation.address || tempLocation.name}</Text>
                                        </>
                                    ) : (
                                        <Text className='loc-hint'>请点击地图或上方地点选择任务位置</Text>
                                    )}
                                </View>
                            </View>

                            <Button
                                className='confirm-location-btn'
                                disabled={!tempLocation}
                                onClick={confirmMapLocation}
                            >
                                ✓ 确认使用这个位置
                            </Button>
                        </View>
                    ) : (
                        <View className='map-bottom-bar'>
                            <View className='selected-location-info'>
                                <Text className='loc-icon'>📍</Text>
                                <View className='loc-details'>
                                    {tempLocation ? (
                                        <>
                                            <Text className='loc-name'>{tempLocation.name}</Text>
                                            <Text className='loc-address'>{tempLocation.address || tempLocation.name}</Text>
                                        </>
                                    ) : (
                                        <Text className='loc-hint'>请点击地图或上方地点选择任务位置</Text>
                                    )}
                                </View>
                            </View>

                            <Button
                                className='confirm-location-btn'
                                disabled={!tempLocation}
                                onClick={confirmMapLocation}
                            >
                                ✓ 确认使用这个位置
                            </Button>
                        </View>
                    )}
                </View>
            )}
        </View>
    )
}
