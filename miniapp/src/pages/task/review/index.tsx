import { useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text, Textarea, Button, Image } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../utils/supabase'
import './index.scss'

interface Task {
  id: string
  title: string
  publisher_id: string
}

interface User {
  id: string
  name: string
  nickname?: string
  avatar_url: string | null
}

interface Review {
  id?: string
  task_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
}

export default function TaskReview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<Task | null>(null)
  const [reviewee, setReviewee] = useState<User | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [taskId, setTaskId] = useState('')
  const [revieweeId, setRevieweeId] = useState('')

  useLoad((params) => {
    if (params.taskId) {
      setTaskId(params.taskId)
      if (params.revieweeId) {
        setRevieweeId(params.revieweeId)
      }
    }
  })

  useDidShow(() => {
    if (taskId) {
      fetchTaskAndReviewee()
    }
  })

  const fetchTaskAndReviewee = useCallback(async () => {
    console.log('fetchTaskAndReviewee 被调用，taskId:', taskId)
    setLoading(true)
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, publisher_id')
        .eq('id', taskId)
        .single()

      console.log('taskData:', taskData)
      console.log('taskError:', taskError)

      if (taskError) throw taskError
      setTask(taskData)

      let targetRevieweeId = revieweeId
      console.log('初始 revieweeId:', targetRevieweeId)
      
      if (!targetRevieweeId) {
        console.log('从 task_acceptances 获取 acceptor_id')
        const { data: acceptanceData, error: acceptanceError } = await supabase
          .from('task_acceptances')
          .select('acceptor_id')
          .eq('task_id', taskId)
          .single()

        console.log('acceptanceData:', acceptanceData)
        console.log('acceptanceError:', acceptanceError)
        console.log('user.id:', user?.id)
        console.log('taskData.publisher_id:', taskData.publisher_id)

        if (!acceptanceError && acceptanceData) {
          targetRevieweeId = user?.id === taskData.publisher_id 
            ? acceptanceData.acceptor_id 
            : taskData.publisher_id
          console.log('计算后的 targetRevieweeId:', targetRevieweeId)
          setRevieweeId(targetRevieweeId)
        }
      }

      if (targetRevieweeId) {
        console.log('获取用户信息，targetRevieweeId:', targetRevieweeId)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, nickname, avatar_url')
          .eq('id', targetRevieweeId)
          .single()

        console.log('userData:', userData)
        console.log('userError:', userError)

        if (userError) throw userError
        setReviewee(userData)
      } else {
        console.log('没有找到 targetRevieweeId')
      }
    } catch (error) {
      console.error('获取数据失败:', error)
      Taro.showToast({ title: '获取数据失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [taskId, revieweeId, user])

  useEffect(() => {
    if (taskId && user) {
      fetchTaskAndReviewee()
    }
  }, [taskId, user?.id, fetchTaskAndReviewee])

  const calculateCreditChange = (rating: number): number => {
    switch (rating) {
      case 1: return -5
      case 2: return -2
      case 3: return 0
      case 4: return 2
      case 5: return 5
      default: return 0
    }
  }

  const handleSubmit = useCallback(async () => {
    console.log('handleSubmit 被调用')
    console.log('user:', user)
    console.log('task:', task)
    console.log('reviewee:', reviewee)

    if (!user) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!task) {
      Taro.showToast({ title: '任务信息加载失败', icon: 'none' })
      return
    }
    if (!reviewee) {
      Taro.showToast({ title: '评价对象信息加载失败', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const review: Review = {
        task_id: taskId,
        reviewer_id: user.id,
        reviewee_id: reviewee.id,
        rating,
        comment: comment.trim() || undefined
      }

      console.log('提交评价:', review)

      const { data: existingReviews, error: existingReviewsError } = await supabase
        .from('reviews')
        .select('id')
        .eq('task_id', taskId)
        .eq('reviewer_id', user.id)
        .eq('reviewee_id', reviewee.id)

      if (existingReviewsError) {
        console.error('检查历史评价失败:', existingReviewsError)
      }

      const { error: reviewError } = await supabase
        .from('reviews')
        .insert(review)

      if (reviewError) {
        console.error('评价插入失败:', reviewError)
        throw reviewError
      }

      const creditChange = calculateCreditChange(rating)
      console.log('信用分变化:', creditChange)

      if (creditChange !== 0 && (!existingReviews || existingReviews.length === 0)) {
        const { data: revieweeData, error: userError } = await supabase
          .from('users')
          .select('credit_score')
          .eq('id', reviewee.id)
          .single()

        if (userError) {
          console.error('获取被评价者信用分失败:', userError)
        }

        if (!userError && revieweeData) {
          const newCreditScore = Math.max(0, Math.min(1000, (revieweeData.credit_score || 100) + creditChange))
          console.log('新信用分:', newCreditScore)
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ credit_score: newCreditScore })
            .eq('id', reviewee.id)

          if (updateError) {
            console.error('更新信用分失败:', updateError)
          }

          try {
            const { error: creditHistoryError } = await supabase
              .from('credit_history')
              .insert({
                user_id: reviewee.id,
                change_amount: creditChange,
                reason: `任务评价: ${rating}星 - ${task.title}`
              })

            if (creditHistoryError) {
              console.error('插入信用历史失败:', creditHistoryError)
            }
          } catch (creditHistoryErr) {
            console.error('信用历史插入异常:', creditHistoryErr)
          }
        }
      }

      if (existingReviews && existingReviews.length > 0) {
        console.log('检测到追加评价，跳过重复信用分变更')
      }

      Taro.showToast({ title: '评价成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('提交评价失败:', error)
      Taro.showToast({ 
        title: error instanceof Error ? error.message : '提交评价失败', 
        icon: 'none' 
      })
    } finally {
      setLoading(false)
    }
  }, [user, task, reviewee, taskId, rating, comment])

  const renderStars = useMemo(() => {
    return (
      <View className='stars-container'>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text
            key={star}
            className={`star ${star <= rating ? 'active' : ''}`}
            onClick={() => setRating(star)}
          >
            ★
          </Text>
        ))}
      </View>
    )
  }, [rating])

  if (loading) {
    return (
      <View className='review-page loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='review-page'>
      <View className='page-header'>
        <Text className='page-title'>评价</Text>
      </View>

      <View className='content'>
        {task && (
          <View className='task-info'>
            <Text className='task-label'>任务</Text>
            <Text className='task-title'>{task.title}</Text>
          </View>
        )}

        {reviewee && (
          <View className='reviewee-info'>
            <Image
              className='reviewee-avatar'
              src={reviewee.avatar_url || 'https://via.placeholder.com/80'}
              mode='aspectFill'
            />
            <View className='reviewee-details'>
              <Text className='reviewee-label'>评价对象</Text>
              <Text className='reviewee-name'>{reviewee.name || reviewee.nickname || '匿名用户'}</Text>
            </View>
          </View>
        )}

        <View className='rating-section'>
          <Text className='section-label'>评分</Text>
          {renderStars}
        </View>

        <View className='comment-section'>
          <Text className='section-label'>评价内容</Text>
          <Textarea
            className='comment-input'
            placeholder='请输入您的评价...'
            value={comment}
            onInput={(e) => setComment(e.detail.value)}
            maxlength={500}
            autoHeight
          />
        </View>

        <Button
          className='submit-btn'
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '提交中...' : '提交评价'}
        </Button>
      </View>
    </View>
  )
}
