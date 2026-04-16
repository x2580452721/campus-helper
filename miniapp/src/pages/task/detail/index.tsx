import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter, useLoad, useDidShow } from '@tarojs/taro'
import { useState, useEffect, useMemo } from 'react'
import { request } from '../../../utils/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { getWalkingRoute, formatDuration, RouteInfo, buildFallbackRouteInfo } from '../../../utils/amap'
import { calculateDistance, formatDistance } from '../../../utils/distance'
import { normalizeCoordinate } from '../../../utils/mapData'
import { DEFAULT_CAMPUS_LOCATION, getCurrentLocationWithFallback } from '../../../utils/location'
import AmapView from '../../../components/AmapView'
import WebviewAmapView from '../../../components/WebviewAmapView'
import './index.scss'

interface Review {
  id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer?: {
    name: string
  }
}

interface TaskDetail {
  id: string
  title: string
  description: string
  reward: number
  type: string
  status: string
  location: {
    latitude: number
    longitude: number
    address: string
    name: string
  }
  publisher_id: string
  deadline: string
  publisher?: {
    nickname: string
    name?: string
    credit_score: number
  }
  acceptor?: {
    id: string
    nickname: string
    name?: string
  }
}

function getDisplayName(profile?: { nickname?: string; name?: string } | null) {
  return profile?.nickname || profile?.name || '匿名用户'
}

export default function TaskDetail() {
  const router = useRouter()
  const { user } = useAuth()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [acceptorId, setAcceptorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number }>(DEFAULT_CAMPUS_LOCATION)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [showNavigationPicker, setShowNavigationPicker] = useState(false)
  const [showFullMap, setShowFullMap] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [currentUserHasReviewed, setCurrentUserHasReviewed] = useState(false)
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const [showMapPreview, setShowMapPreview] = useState(false)
  const env = Taro.getEnv()
  const isWeapp = env === 'WEAPP'
  const miniMapMarker = useMemo(() => {
    if (!task) {
      return []
    }

    return [{
      id: task.id,
      latitude: task.location.latitude,
      longitude: task.location.longitude,
      title: task.title,
      reward: task.reward,
      priority: 'normal'
    }]
  }, [task])
  const displayRouteInfo = useMemo(() => {
    if (routeInfo && routeInfo.steps && routeInfo.steps.length > 0) {
      return routeInfo
    }

    if (!task) {
      return null
    }

    return buildFallbackRouteInfo(currentLocation || DEFAULT_CAMPUS_LOCATION, task.location)
  }, [routeInfo, task, currentLocation])

  useLoad(() => {
    const { id } = router.params
    if (id) {
      fetchTaskDetail(id)
    }
    getCurrentLocation()
  })

  useDidShow(() => {
    const { id } = router.params
    if (id) {
      fetchTaskDetail(id)
    }
  })

  useEffect(() => {
    const { id } = router.params
    if (id && user) {
      fetchTaskDetail(id)
    }
  }, [user])

  useEffect(() => {
    if (currentLocation && task) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        task.location.latitude,
        task.location.longitude
      )
      setDistance(dist)

      fetchRoute(currentLocation, task.location)
    }
  }, [currentLocation, task])

  useEffect(() => {
    setShowMapPreview(false)
  }, [task?.id])

  const getCurrentLocation = async () => {
    try {
      const location = await getCurrentLocationWithFallback()
      if (location) {
        setCurrentLocation({
          latitude: location.latitude,
          longitude: location.longitude
        })
        if (location.source === 'default') {
          setLocationHint('定位暂时不可用，已使用校园默认点')
        } else if (location.source === 'stored') {
          setLocationHint('已使用最近一次记录的位置补位')
        } else {
          setLocationHint(null)
        }
      } else {
        setCurrentLocation({
          latitude: DEFAULT_CAMPUS_LOCATION.latitude,
          longitude: DEFAULT_CAMPUS_LOCATION.longitude
        })
        setLocationHint('定位暂时不可用，已使用校园默认点')
      }
    } catch (error) {
      console.error('获取位置失败:', error)
      setCurrentLocation({
        latitude: DEFAULT_CAMPUS_LOCATION.latitude,
        longitude: DEFAULT_CAMPUS_LOCATION.longitude
      })
      setLocationHint('定位暂时不可用，已使用校园默认点')
    }
  }

  const fetchRoute = async (origin: { latitude: number; longitude: number }, dest: { latitude: number; longitude: number }) => {
    try {
      const route = await getWalkingRoute(origin, dest)
      setRouteInfo(route || buildFallbackRouteInfo(origin, dest))
    } catch (error) {
      console.error('获取路线失败:', error)
      setRouteInfo(buildFallbackRouteInfo(origin, dest))
    }
  }

  const fetchTaskDetail = async (id: string) => {
    try {
      setLoading(true)
      const taskResult = await request<any[]>(`/rest/v1/tasks?id=eq.${encodeURIComponent(id)}&select=*`, {
        method: 'GET'
      })

      if (taskResult.error || !taskResult.data || taskResult.data.length === 0) {
        throw taskResult.error || new Error('任务不存在')
      }

      const taskData = taskResult.data[0]
      const normalizedLocation = normalizeCoordinate(taskData.location)
      if (!normalizedLocation) {
        throw new Error('任务地点数据异常')
      }

      taskData.location = {
        latitude: normalizedLocation.latitude,
        longitude: normalizedLocation.longitude,
        address: taskData.location?.address || taskData.location?.name || '校园内',
        name: taskData.location?.name || '校园内'
      }

      const publisherResult = await request<any[]>(`/rest/v1/users?id=eq.${encodeURIComponent(taskData.publisher_id)}&select=nickname,name,credit_score`, {
        method: 'GET'
      })

      if (publisherResult.data && publisherResult.data.length > 0) {
        taskData.publisher = {
          ...publisherResult.data[0],
          nickname: getDisplayName(publisherResult.data[0])
        }
      }

      const acceptanceResult = await request<any[]>(`/rest/v1/task_acceptances?task_id=eq.${encodeURIComponent(id)}&select=acceptor_id,status`, {
        method: 'GET'
      })

      if (acceptanceResult.data && acceptanceResult.data.length > 0) {
        const acceptance = acceptanceResult.data[0]
        setAcceptorId(acceptance.acceptor_id)

        const acceptorResult = await request<any[]>(`/rest/v1/users?id=eq.${encodeURIComponent(acceptance.acceptor_id)}&select=id,nickname,name`, {
          method: 'GET'
        })

        if (acceptorResult.data && acceptorResult.data.length > 0) {
          taskData.acceptor = {
            ...acceptorResult.data[0],
            nickname: getDisplayName(acceptorResult.data[0])
          }
        }
      } else {
        setAcceptorId(null)
      }

      setTask(taskData)

      const reviewsResult = await request<any[]>(`/rest/v1/reviews?task_id=eq.${encodeURIComponent(id)}&select=*`, {
        method: 'GET'
      })

      if (reviewsResult.data) {
        const reviewsData = reviewsResult.data

        const reviewsWithReviewer = await Promise.all(
          reviewsData.map(async (review: any) => {
            const reviewerResult = await request<any[]>(`/rest/v1/users?id=eq.${encodeURIComponent(review.reviewer_id)}&select=name`, {
              method: 'GET'
            })
            if (reviewerResult.data && reviewerResult.data.length > 0) {
              return { ...review, reviewer: reviewerResult.data[0] }
            }
            return review
          })
        )

        setReviews(reviewsWithReviewer)

        if (user && taskData && acceptanceResult.data && acceptanceResult.data.length > 0) {
          const acceptance = acceptanceResult.data[0]
          let targetRevieweeId: string | null = null

          if (user.id === taskData.publisher_id) {
            targetRevieweeId = acceptance.acceptor_id
          } else if (acceptance.acceptor_id === user.id) {
            targetRevieweeId = taskData.publisher_id
          }

          if (targetRevieweeId) {
            const userReview = reviewsData.find((r: Review) =>
              r.reviewer_id === user.id && r.reviewee_id === targetRevieweeId
            )
            setCurrentUserHasReviewed(!!userReview)
          } else {
            setCurrentUserHasReviewed(false)
          }
        } else {
          setCurrentUserHasReviewed(false)
        }
      } else {
        setReviews([])
        setCurrentUserHasReviewed(false)
      }
    } catch (error) {
      console.error('Fetch detail error:', error)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!user || !task) return

    if (user.status !== 'verified') {
      Taro.showToast({ title: '请先完成校园认证', icon: 'none' })
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/auth/verify' })
      }, 1500)
      return
    }

    if (user.id === task.publisher_id) {
      Taro.showToast({ title: '不能抢自己的单哦', icon: 'none' })
      return
    }

    if (user.credit_score < 60) {
      Taro.showToast({ title: '信用分不足60，无法接单', icon: 'none' })
      return
    }

    if (task.status !== 'published') {
      Taro.showToast({ title: '当前任务不可抢', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const acceptanceCheck = await request<any[]>(`/rest/v1/task_acceptances?task_id=eq.${encodeURIComponent(task.id)}&select=acceptor_id,status`, {
        method: 'GET'
      })

      if (acceptanceCheck.error) throw acceptanceCheck.error

      if (acceptanceCheck.data && acceptanceCheck.data.length > 0) {
        const existingAcceptance = acceptanceCheck.data[0]
        if (existingAcceptance.acceptor_id === user.id) {
          Taro.showToast({ title: '你已经抢到这个任务了', icon: 'none' })
        } else {
          Taro.showToast({ title: '手慢了，任务已被抢走', icon: 'none' })
        }
        await fetchTaskDetail(task.id)
        return
      }

      const insertResult = await request('/rest/v1/task_acceptances', {
        method: 'POST',
        data: {
          task_id: task.id,
          acceptor_id: user.id,
          status: 'accepted'
        },
        headers: { 'Prefer': 'return=minimal' }
      })

      if (insertResult.error) {
        if ((insertResult.error as any)?.code === '23505') {
          Taro.showToast({ title: '手慢了，任务已被抢走', icon: 'none' })
          await fetchTaskDetail(task.id)
        } else {
          throw insertResult.error
        }
        return
      }

      const updateResult = await request(`/rest/v1/tasks?id=eq.${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        data: { status: 'accepted' },
        headers: { 'Prefer': 'return=minimal' }
      })

      if (updateResult.error) {
        console.error('Update task status error:', updateResult.error)
      }

      Taro.showToast({ title: '抢单成功！', icon: 'success' })

      await fetchTaskDetail(task.id)

    } catch (error: any) {
      console.error('Accept error:', error)
      Taro.showToast({ title: error.message || '抢单失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async () => {
    if (!user || !task) return

    if (task.status !== 'accepted') {
      Taro.showToast({ title: '当前任务无需完成', icon: 'none' })
      return
    }

    if (acceptorId !== user.id) {
      Taro.showToast({ title: '只有接单人可以完成任务', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const rewardReason = `完成任务奖励 - ${task.title} (${task.id})`
      const existingRewardResult = await request<any[]>('/rest/v1/credit_history', {
        method: 'GET',
        data: {
          select: 'id',
          user_id: `eq.${user.id}`,
          reason: `eq.${rewardReason}`
        }
      })

      await request(`/rest/v1/tasks?id=eq.${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        data: { status: 'completed' },
        headers: { 'Prefer': 'return=minimal' }
      })

      await request(`/rest/v1/task_acceptances?task_id=eq.${encodeURIComponent(task.id)}&acceptor_id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        data: {
          status: 'completed',
          completed_at: new Date().toISOString()
        },
        headers: { 'Prefer': 'return=minimal' }
      })

      const userResult = await request<any[]>(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}&select=credit_score`, {
        method: 'GET'
      })

      if (userResult.data && userResult.data.length > 0) {
        const userData = userResult.data[0]
        const creditReward = 3
        const newCreditScore = Math.max(0, Math.min(1000, userData.credit_score + creditReward))

        if (!existingRewardResult.error && (!existingRewardResult.data || existingRewardResult.data.length === 0)) {
          await request(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`, {
            method: 'PATCH',
            data: { credit_score: newCreditScore },
            headers: { 'Prefer': 'return=minimal' }
          })

          await request('/rest/v1/credit_history', {
            method: 'POST',
            data: {
              user_id: user.id,
              change_amount: creditReward,
              reason: rewardReason
            },
            headers: { 'Prefer': 'return=minimal' }
          })
        }
      }

      Taro.showToast({ title: '任务已完成！', icon: 'success' })

      await fetchTaskDetail(task.id)

    } catch (error: any) {
      console.error('Complete error:', error)
      Taro.showToast({ title: error.message || '操作失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleNavigate = () => {
    if (!task) return
    setShowFullMap(true)
  }

  const handleCancel = async () => {
    if (!task) return

    Taro.showModal({
      title: '确认取消',
      content: '确定要取消这个任务吗？此操作不可撤销。',
      success: async (res) => {
        if (res.confirm) {
          setSubmitting(true)
          try {
            await request(`/rest/v1/tasks?id=eq.${encodeURIComponent(task.id)}`, {
              method: 'PATCH',
              data: { status: 'cancelled' },
              headers: { 'Prefer': 'return=minimal' }
            })

            Taro.showToast({ title: '任务已取消', icon: 'success' })
            await fetchTaskDetail(task.id)
          } catch (error) {
            console.error('取消任务失败:', error)
            Taro.showToast({ title: '取消失败', icon: 'none' })
          } finally {
            setSubmitting(false)
          }
        }
      }
    })
  }

  const handleReview = () => {
    if (!task || !user) return

    let revieweeId: string
    if (user.id === task.publisher_id) {
      if (!acceptorId) {
        Taro.showToast({ title: '暂无接单人', icon: 'none' })
        return
      }
      revieweeId = acceptorId
    } else {
      revieweeId = task.publisher_id
    }

    console.log('handleReview - 跳转评价页面')
    console.log('  taskId:', task.id)
    console.log('  revieweeId:', revieweeId)

    Taro.navigateTo({
      url: `/pages/task/review/index?taskId=${task.id}&revieweeId=${revieweeId}`
    })
  }

  const renderStars = (rating: number) => {
    console.log('[renderStars] rating:', rating)
    return (
      <View className='stars-small'>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text
            key={star}
            className={`star-small ${star <= rating ? 'active' : ''}`}
          >
            ★
          </Text>
        ))}
      </View>
    )
  }

  if (loading) return <View className='loading'>加载中...</View>
  if (!task) return <View className='error'>任务不存在</View>

  const statusText = {
    pending: '待审核',
    published: '可接单',
    accepted: '已接单',
    completed: '已完成',
    cancelled: '已取消'
  }

  const isMyTask = user && user.id === task.publisher_id
  const isMyAcceptedTask = user && acceptorId === user.id
  const isAcceptedByOther = acceptorId && acceptorId !== user?.id
  const canReview = user && task.status === 'completed' && (isMyTask || isMyAcceptedTask)



  return (
    <View className='detail-container'>
      <View className='page-back-pill' onClick={() => Taro.navigateBack()}>
        <Text className='page-back-arrow'>←</Text>
        <Text className='page-back-text'>返回列表</Text>
      </View>

      <View className='header'>
        <View className='title-row'>
          <Text className='title'>{task.title}</Text>
          <Text className='reward'>¥{task.reward}</Text>
        </View>
        <View className='tags'>
          <Text className={`status-tag ${task.status}`}>
            {statusText[task.status as keyof typeof statusText] || task.status}
          </Text>
          <Text className='tag'>{task.type === 'delivery' ? '生活代取' : task.type === 'help' ? '校园求助' : '学业辅导'}</Text>
          <Text className='tag time'>截止: {new Date(task.deadline).toLocaleString()}</Text>
        </View>
      </View>

      <View className='card'>
        <Text className='section-title'>任务描述</Text>
        <Text className='content'>{task.description}</Text>
      </View>

      <View className='card'>
        <Text className='section-title'>位置信息</Text>
        <View className='location-box'>
          <View className='location-header'>
            <View className='location-name'>
              <Text className='address'>{task.location.name}</Text>
              <Text className='sub-address'>{task.location.address}</Text>
              {locationHint && (
                <Text className='location-note'>{locationHint}</Text>
              )}
            </View>
            {distance !== null && (
              <View className='distance-badge'>
                <Text className='distance-text'>📏 {formatDistance(distance)}</Text>
              </View>
            )}
          </View>

          {displayRouteInfo && (
            <View className='route-summary-panel'>
              <View className='route-summary-header'>
                <Text className='route-summary-title'>路线摘要</Text>
                <Text className='route-summary-subtitle'>
                  {locationHint ? '定位已兜底，路线先展示' : '路线优先展示，地图可展开查看'}
                </Text>
              </View>

              <View className='route-info'>
                <View className='route-item'>
                  <Text className='route-label'>步行距离</Text>
                  <Text className='route-value'>{formatDistance(displayRouteInfo.distance)}</Text>
                </View>
                <View className='route-divider' />
                <View className='route-item'>
                  <Text className='route-label'>预计时间</Text>
                  <Text className='route-value'>{formatDuration(displayRouteInfo.duration)}</Text>
                </View>
              </View>

              <View className='route-path-card'>
                <View className='route-waypoint'>
                  <Text className='route-waypoint-label'>出发点</Text>
                  <Text className='route-waypoint-value'>
                    {currentLocation ? '当前位置' : '等待定位'}
                  </Text>
                  <Text className='route-waypoint-note'>
                    {locationHint || '系统会自动从当前定位出发'}
                  </Text>
                </View>
                <View className='route-waypoint-divider' />
                <View className='route-waypoint'>
                  <Text className='route-waypoint-label'>目的地</Text>
                  <Text className='route-waypoint-value'>{task.location.name}</Text>
                  <Text className='route-waypoint-note'>{task.location.address}</Text>
                </View>
              </View>

              {displayRouteInfo.steps && displayRouteInfo.steps.length > 0 && (
                <View className='route-steps'>
                  <View className='steps-header'>
                    <Text className='steps-title'>路线指引</Text>
                    <Text className='steps-subtitle'>共 {displayRouteInfo.steps.length} 步，按顺序执行即可</Text>
                  </View>
                  {displayRouteInfo.steps.map((step, index) => {
                    const cleanInstruction = step.instruction.replace(/<[^>]*>/g, '')
                    return (
                      <View key={index} className='route-step-card'>
                        <View className='step-rail'>
                          <View className='step-number'>{index + 1}</View>
                          {index < displayRouteInfo.steps.length - 1 && <View className='step-rail-line' />}
                        </View>
                        <View className='step-content'>
                          <Text className='step-instruction'>{cleanInstruction}</Text>
                          <View className='step-meta'>
                            <Text className='step-chip'>{formatDistance(step.distance)}</Text>
                            <Text className='step-chip'>{formatDuration(step.duration)}</Text>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}

              <View className='map-preview-toggle' onClick={() => setShowMapPreview(!showMapPreview)}>
                <View className='map-preview-toggle-text'>
                  <Text className='map-preview-title'>地图缩略预览</Text>
                  <Text className='map-preview-desc'>
                    {showMapPreview ? '点击收起地图' : '点击展开查看地图'}
                  </Text>
                </View>
                <Text className='map-preview-arrow'>{showMapPreview ? '▾' : '▸'}</Text>
              </View>

              {showMapPreview && (
                <View className='mini-map-shell'>
                  <View className='mini-map-header'>
                    <Text className='mini-map-title'>地图预览</Text>
                    <Text className='mini-map-subtitle'>仅作参考，不抢路线焦点</Text>
                  </View>
                  <View className='mini-map'>
                    {!isWeapp ? (
                      <AmapView
                        initialLocation={currentLocation || DEFAULT_CAMPUS_LOCATION}
                        markers={miniMapMarker}
                        selectedMarkerId={task.id}
                        mode='view'
                        showRoute
                        compact
                      />
                    ) : (
                      <WebviewAmapView
                        userLocation={currentLocation || DEFAULT_CAMPUS_LOCATION}
                        tasks={miniMapMarker}
                        selectedTaskId={task.id}
                        mode='view'
                        showRoute
                        onNavigate={handleNavigate}
                        onOpenTaskDetail={() => {
                          Taro.showToast({ title: '当前已在任务详情页', icon: 'none' })
                        }}
                        onLocate={getCurrentLocation}
                        compact
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          <View className='action-buttons'>
            {isMyTask && task.status === 'published' && (
              <>
                <Button
                  className='edit-btn'
                  onClick={() => Taro.navigateTo({ url: `/pages/task/publish/index?id=${task.id}` })}
                >
                  ✏️ 编辑
                </Button>
                <Button
                  className='cancel-btn'
                  onClick={handleCancel}
                >
                  ❌ 取消
                </Button>
              </>
            )}
            <Button className='navigate-btn' onClick={handleNavigate}>
              🧭 导航前往
            </Button>
          </View>
        </View>
      </View>

      <View className='card publisher-info'>
        <Text className='label'>发布人</Text>
        <View className='info'>
          <Text className='name'>{getDisplayName(task.publisher)}</Text>
          <Text className='credit'>信用分: {task.publisher?.credit_score || 100}</Text>
        </View>
      </View>

      {task.acceptor && (
        <View className='card acceptor-info'>
          <Text className='label'>接单人</Text>
          <View className='info'>
            <Text className='name'>{getDisplayName(task.acceptor)}</Text>
          </View>
        </View>
      )}

      {reviews.length > 0 && (
        <View className='card reviews-section'>
          <Text className='section-title'>评价</Text>
          {reviews.map((review) => (
            <View key={review.id} className='review-item'>
              <View className='review-header'>
                <Text className='reviewer-name'>{review.reviewer?.name || '匿名用户'}</Text>
                {renderStars(review.rating)}
              </View>
              {review.comment && (
                <Text className='review-comment'>{review.comment}</Text>
              )}
              <Text className='review-time'>{new Date(review.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}

      <View className='footer'>
        {task.status === 'published' && !isMyTask && !acceptorId && (
          <Button
            className='accept-btn'
            loading={submitting}
            onClick={handleAccept}
          >
            立即抢单
          </Button>
        )}

        {task.status === 'published' && isMyTask && (
          <View className='status-info my-task'>
            <Text className='status-icon'>📝</Text>
            <Text className='status-text'>这是我发布的任务</Text>
            <Text className='status-hint'>等待他人接单中...</Text>
          </View>
        )}

        {task.status === 'accepted' && isMyAcceptedTask && (
          <View className='action-group'>
            <View className='status-info my-accepted'>
              <Text className='status-icon'>✅</Text>
              <Text className='status-text'>你已接下此任务</Text>
            </View>
            <Button
              className='complete-btn'
              loading={submitting}
              onClick={handleComplete}
            >
              完成任务
            </Button>
          </View>
        )}

        {(task.status === 'accepted' || acceptorId) && isAcceptedByOther && (
          <View className='status-info other-accepted'>
            <Text className='status-icon'>🔒</Text>
            <Text className='status-text'>已被他人接走</Text>
          </View>
        )}

        {task.status === 'accepted' && isMyTask && !isMyAcceptedTask && (
          <View className='status-info waiting'>
            <Text className='status-icon'>⏳</Text>
            <Text className='status-text'>任务进行中</Text>
            <Text className='status-hint'>接单人: {getDisplayName(task.acceptor)}</Text>
          </View>
        )}

        {task.status === 'completed' && (
          <View className='action-group'>
            <View className='status-info completed'>
              <Text className='status-icon'>🎉</Text>
              <Text className='status-text'>任务已完成</Text>
            </View>
            {canReview && (
              <Button
                className='review-btn'
                onClick={handleReview}
              >
                {currentUserHasReviewed ? '追加评价' : '去评价'}
              </Button>
            )}
            {currentUserHasReviewed && (
              <View className='reviewed-info'>
                <Text className='reviewed-text'>✓ 已评价</Text>
              </View>
            )}
          </View>
        )}

        {task.status === 'cancelled' && (
          <View className='status-info cancelled'>
            <Text className='status-icon'>❌</Text>
            <Text className='status-text'>任务已取消</Text>
          </View>
        )}

        {task.status === 'pending' && (
          <View className='status-info pending'>
            <Text className='status-icon'>⏳</Text>
            <Text className='status-text'>等待审核</Text>
          </View>
        )}
      </View>

      {showFullMap && task && (
        <View className='full-map-overlay'>
          <View className='full-map-container'>
            <View className='full-map-header'>
              <View className='back-btn' onClick={() => setShowFullMap(false)}>
                <Text className='back-icon'>←</Text>
                <Text className='back-text'>返回</Text>
              </View>
              <Text className='header-title'>导航到任务地点</Text>
              <View style={{ width: '120px' }} />
            </View>
            <View className='full-map-wrapper'>
              {!isWeapp ? (
                <AmapView
                  initialLocation={currentLocation || DEFAULT_CAMPUS_LOCATION}
                  markers={miniMapMarker}
                  selectedMarkerId={task.id}
                  mode='view'
                  showRoute
                />
              ) : (
                <WebviewAmapView
                  userLocation={currentLocation || DEFAULT_CAMPUS_LOCATION}
                  tasks={miniMapMarker}
                  selectedTaskId={task.id}
                  mode='view'
                  showRoute
                  onNavigate={() => { }}
                  onOpenTaskDetail={() => { }}
                  onLocate={getCurrentLocation}
                />
              )}
            </View>
            <View className='full-map-footer'>
              <View className='location-info'>
                <Text className='loc-label'>目的地</Text>
                <Text className='loc-name'>{task.location.name}</Text>
                <Text className='loc-address'>{task.location.address || task.location.name}</Text>
              </View>
              <Button className='close-map-btn' onClick={() => setShowFullMap(false)}>
                关闭地图
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
