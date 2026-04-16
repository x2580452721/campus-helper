import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { request, supabase } from '../../utils/supabase'
import { useAuth } from '../../hooks/useAuth'
import './index.scss'

interface TaskItem {
    id: string
    title: string
    reward: number
    status: string
    created_at: string
    publisher_id?: string
    hasReviewed?: boolean
}

const TASK_SELECT = 'id,title,reward,status,created_at,publisher_id'

function buildInFilter(values: string[]) {
    return `in.(${values.join(',')})`
}

export default function MyTasks() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState<'published' | 'accepted' | 'history'>('published')
    const [tasks, setTasks] = useState<TaskItem[]>([])
    const [loading, setLoading] = useState(false)
    const [historySubTab, setHistorySubTab] = useState<'all' | 'reviewed' | 'unreviewed'>('all')

    useLoad(() => {
        fetchTasks()
    })

    useDidShow(() => {
        fetchTasks()
    })

    useEffect(() => {
        if (user) {
            fetchTasks(activeTab)
        } else {
            setTasks([])
        }
    }, [user?.id, activeTab])

    const handleTabChange = (tab: 'published' | 'accepted' | 'history') => {
        setActiveTab(tab)
        fetchTasks(tab)
    }

    const fetchAcceptanceTaskIds = async () => {
        if (!user) return []

        const result = await request<Array<{ task_id: string }>>('/rest/v1/task_acceptances', {
            method: 'GET',
            data: {
                select: 'task_id',
                acceptor_id: `eq.${user.id}`
            }
        })

        if (result.error) throw result.error
        return (result.data || []).map(item => item.task_id).filter(Boolean)
    }

    const fetchTasksByIds = async (taskIds: string[], statusFilter: string) => {
        if (taskIds.length === 0) return []

        const result = await request<TaskItem[]>('/rest/v1/tasks', {
            method: 'GET',
            data: {
                select: TASK_SELECT,
                id: buildInFilter(taskIds),
                status: statusFilter,
                order: 'created_at.desc'
            }
        })

        if (result.error) throw result.error
        return result.data || []
    }

    const fetchTasks = async (tab = activeTab) => {
        if (!user) {
            setTasks([])
            return
        }

        setLoading(true)

        try {
            let data: TaskItem[] = []

            if (tab === 'published') {
                const result = await request<TaskItem[]>('/rest/v1/tasks', {
                    method: 'GET',
                    data: {
                        select: TASK_SELECT,
                        publisher_id: `eq.${user.id}`,
                        status: 'not.in.(completed,cancelled)',
                        order: 'created_at.desc'
                    }
                })

                if (result.error) throw result.error
                data = result.data || []

            } else if (tab === 'accepted') {
                const taskIds = await fetchAcceptanceTaskIds()
                data = await fetchTasksByIds(taskIds, 'not.in.(completed,cancelled)')
            } else {
                const [publishedResult, acceptedTaskIds] = await Promise.all([
                    request<TaskItem[]>('/rest/v1/tasks', {
                        method: 'GET',
                        data: {
                            select: TASK_SELECT,
                            publisher_id: `eq.${user.id}`,
                            status: 'in.(completed,cancelled)',
                            order: 'created_at.desc'
                        }
                    }),
                    fetchAcceptanceTaskIds()
                ])

                if (publishedResult.error) throw publishedResult.error

                let allHistoryTasks: TaskItem[] = publishedResult.data || []

                if (acceptedTaskIds.length > 0) {
                    const acceptedTasks = await fetchTasksByIds(acceptedTaskIds, 'in.(completed,cancelled)')
                    if (acceptedTasks.length > 0) {
                        allHistoryTasks = [...allHistoryTasks, ...acceptedTasks]
                    }
                }

                const dedupedHistoryTasks = Array.from(
                    new Map(allHistoryTasks.map(task => [task.id, task])).values()
                )

                dedupedHistoryTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                data = dedupedHistoryTasks

                const taskIds = data.map(t => t.id)
                if (taskIds.length > 0) {
                    const [reviewsResult, taskAcceptancesResult] = await Promise.all([
                        request<Array<{ id: string; task_id: string; reviewer_id: string; reviewee_id: string; rating: number; comment?: string; created_at: string }>>('/rest/v1/reviews', {
                            method: 'GET',
                            data: {
                                select: 'id,task_id,reviewer_id,reviewee_id,rating,comment,created_at',
                                task_id: buildInFilter(taskIds)
                            }
                        }),
                        request<Array<{ task_id: string; acceptor_id: string }>>('/rest/v1/task_acceptances', {
                            method: 'GET',
                            data: {
                                select: 'task_id,acceptor_id',
                                task_id: buildInFilter(taskIds)
                            }
                        })
                    ])

                    if (reviewsResult.error) throw reviewsResult.error
                    if (taskAcceptancesResult.error) throw taskAcceptancesResult.error

                    const reviewsData = reviewsResult.data || []
                    const taskAcceptances = taskAcceptancesResult.data || []

                    const acceptancesMap = new Map()
                    taskAcceptances.forEach(ta => {
                        acceptancesMap.set(ta.task_id, ta.acceptor_id)
                    })

                    const reviewsMap = new Map()
                    reviewsData.forEach(review => {
                        console.log('[my-tasks] review data:', review)
                        reviewsMap.set(review.task_id, review)
                    })

                    data = data.map(task => {
                        let targetRevieweeId: string | null = null
                        const acceptorId = acceptancesMap.get(task.id) || null

                        if (user.id === task.publisher_id) {
                            targetRevieweeId = acceptorId
                        } else if (acceptorId === user.id) {
                            targetRevieweeId = task.publisher_id || null
                        }

                        const hasReviewed = reviewsData?.some(r =>
                            r.task_id === task.id &&
                            r.reviewer_id === user.id &&
                            r.reviewee_id === targetRevieweeId
                        )

                        const review = reviewsMap.get(task.id)
                        console.log('[my-tasks] task:', task.id, 'review:', review)

                        return { ...task, hasReviewed, review }
                    })
                }
            }

            setTasks(data)
        } catch (error) {
            console.error('Fetch tasks error:', error)
            Taro.showToast({ title: '加载失败', icon: 'none' })
            setTasks([])
        } finally {
            setLoading(false)
        }
    }

    const handleTaskClick = (id: string) => {
        Taro.navigateTo({ url: `/pages/task/detail/index?id=${id}` })
    }

    const handleReviewClick = (e: any, task: TaskItem) => {
        e.stopPropagation()
        Taro.navigateTo({ url: `/pages/task/detail/index?id=${task.id}` })
    }

    const getFilteredTasks = () => {
        if (activeTab !== 'history') return tasks

        switch (historySubTab) {
            case 'reviewed':
                return tasks.filter(t => t.hasReviewed)
            case 'unreviewed':
                return tasks.filter(t => !t.hasReviewed)
            default:
                return tasks
        }
    }

    const getReviewButtonState = (task: TaskItem) => {
        if (historySubTab === 'reviewed') {
            return { isReviewed: true, text: '追加评价' }
        }
        if (historySubTab === 'unreviewed') {
            return { isReviewed: false, text: '去评价' }
        }
        return {
            isReviewed: !!task.hasReviewed,
            text: task.hasReviewed ? '追加评价' : '去评价'
        }
    }

    const handleCancelTask = (id: string) => {
        Taro.showModal({
            title: '确认取消',
            content: '确定要取消这个任务吗？此操作不可撤销。',
            success: async (res) => {
                if (res.confirm) {
                    setLoading(true)
                    try {
                        const { error } = await supabase
                            .from('tasks')
                            .update({ status: 'cancelled' })
                            .eq('id', id)

                        if (error) throw error

                        Taro.showToast({ title: '任务已取消', icon: 'success' })
                        await fetchTasks()
                    } catch (error) {
                        console.error('取消任务失败:', error)
                        Taro.showToast({ title: '取消失败', icon: 'none' })
                    } finally {
                        setLoading(false)
                    }
                }
            }
        })
    }

    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            pending: '审核中',
            published: '待接单',
            accepted: '进行中',
            completed: '已完成',
            cancelled: '已取消'
        }
        return map[status] || status
    }

    if (!user) {
        return (
            <View className='my-tasks-container'>
                <View className='not-logged-in'>
                    <Text className='icon'>🔐</Text>
                    <Text className='title'>请先登录</Text>
                    <Text className='desc'>登录后查看您的任务</Text>
                </View>
            </View>
        )
    }

    return (
        <View className='my-tasks-container'>
            <View className='tabs'>
                <View
                    className={`tab-item ${activeTab === 'published' ? 'active' : ''}`}
                    onClick={() => handleTabChange('published')}
                >
                    <Text>我发布的</Text>
                    <View className='line' />
                </View>
                <View
                    className={`tab-item ${activeTab === 'accepted' ? 'active' : ''}`}
                    onClick={() => handleTabChange('accepted')}
                >
                    <Text>我接受的</Text>
                    <View className='line' />
                </View>
                <View
                    className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => handleTabChange('history')}
                >
                    <Text>历史记录</Text>
                    <View className='line' />
                </View>
            </View>

            {activeTab === 'history' && (
                <View className='sub-tabs'>
                    <View
                        className={`sub-tab-item ${historySubTab === 'all' ? 'active' : ''}`}
                        onClick={() => setHistorySubTab('all')}
                    >
                        <Text>全部</Text>
                        <View className='sub-line' />
                    </View>
                    <View
                        className={`sub-tab-item ${historySubTab === 'unreviewed' ? 'active' : ''}`}
                        onClick={() => setHistorySubTab('unreviewed')}
                    >
                        <Text>待评价</Text>
                        <View className='sub-line' />
                    </View>
                    <View
                        className={`sub-tab-item ${historySubTab === 'reviewed' ? 'active' : ''}`}
                        onClick={() => setHistorySubTab('reviewed')}
                    >
                        <Text>已评价</Text>
                        <View className='sub-line' />
                    </View>
                </View>
            )}
            <ScrollView scrollY className='task-list'>
                {loading ? (
                    <View className='loading'>加载中...</View>
                ) : getFilteredTasks().length === 0 ? (
                    <View className='empty'>
                        <Text className='empty-icon'>📭</Text>
                        <Text className='empty-text'>
                            {activeTab === 'published' ? '暂无发布的任务' : activeTab === 'accepted' ? '暂无接受的任务' : '暂无历史记录'}
                        </Text>
                    </View>
                ) : (
                    getFilteredTasks().map(task => (
                        <View key={task.id} className='task-card'>
                            <View className='card-content' onClick={() => handleTaskClick(task.id)}>
                                <View className='card-header'>
                                    <Text className='title'>{task.title}</Text>
                                    <Text className={`status ${task.status}`}>{getStatusText(task.status)}</Text>
                                </View>
                                <View className='card-footer'>
                                    <Text className='time'>{new Date(task.created_at).toLocaleDateString()}</Text>
                                    <Text className='reward'>¥{task.reward}</Text>
                                </View>
                                {task.review && (
                                    <View className='task-review'>
                                        <View className='review-stars'>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Text
                                                    key={star}
                                                    className={`review-star ${star <= task.review.rating ? 'active' : ''}`}
                                                >
                                                    ★
                                                </Text>
                                            ))}
                                        </View>
                                        {task.review.comment && (
                                            <Text className='review-comment'>{task.review.comment}</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                            {activeTab === 'published' && task.status === 'published' && (
                                <View className='task-actions'>
                                    <View
                                        className='action-btn edit'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            Taro.navigateTo({ url: `/pages/task/publish/index?id=${task.id}` })
                                        }}
                                    >
                                        <Text className='action-icon'>✏️</Text>
                                    </View>
                                    <View
                                        className='action-btn cancel'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCancelTask(task.id)
                                        }}
                                    >
                                        <Text className='action-icon'>❌</Text>
                                    </View>
                                </View>
                            )}
                            {activeTab === 'history' && (
                                <View className='history-badge'>
                                    <Text className='history-label'>
                                        {user && task.publisher_id === user.id ? '我发布的' : '我接受的'}
                                    </Text>
                                    {task.status === 'completed' && (
                                        <View
                                            className={`review-btn-small ${getReviewButtonState(task).isReviewed ? 'reviewed' : ''}`}
                                            onClick={(e) => handleReviewClick(e, task)}
                                        >
                                            <Text className='review-btn-text'>
                                                {getReviewButtonState(task).text}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    )
}
