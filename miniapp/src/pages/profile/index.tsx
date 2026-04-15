import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useAuth } from '../../hooks/useAuth'
import { authStore } from '../../utils/authStore'
import './index.scss'

interface CreditRecord {
    id: string
    reason: string
    change_amount: number
    created_at: string
}

export default function Profile() {
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const [history, setHistory] = useState<CreditRecord[]>([])
    const historyLoadingRef = useRef(false)
    const lastHistoryUserIdRef = useRef<string | null>(null)

    const fetchCreditHistory = useCallback(async (force = false) => {
        if (!user?.id) {
            setHistory([])
            return
        }

        if (historyLoadingRef.current && !force) {
            return
        }

        historyLoadingRef.current = true
        lastHistoryUserIdRef.current = user.id
        try {
            const { data, error } = await supabase
                .from('credit_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error
            setHistory(data as CreditRecord[])
        } catch (error) {
            console.error('Fetch credit history error:', error)
        } finally {
            historyLoadingRef.current = false
        }
    }, [user?.id])

    useEffect(() => {
        if (!user?.id) {
            setHistory([])
            lastHistoryUserIdRef.current = null
            return
        }

        if (lastHistoryUserIdRef.current !== user.id) {
            lastHistoryUserIdRef.current = user.id
            fetchCreditHistory(true)
        }
    }, [fetchCreditHistory, user?.id])

    const handleLogout = async () => {
        const result = await Taro.showModal({
            title: '提示',
            content: '确定要退出登录吗？'
        })
        
        if (result.confirm) {
            await supabase.auth.signOut()
            await authStore.logout()
            Taro.reLaunch({ url: '/pages/login/index' })
        }
    }

    const handleLogin = () => {
        Taro.navigateTo({ url: '/pages/login/index' })
    }

    const handleVerify = () => {
        Taro.navigateTo({ url: '/pages/auth/verify' })
    }

    const handleMyTasks = () => {
        Taro.switchTab({ url: '/pages/my-tasks/index' })
    }

    if (authLoading) {
        return (
            <View className='profile-container'>
                <View className='loading-state'>
                    <View className='loading-spinner' />
                    <Text className='loading-text'>加载中...</Text>
                </View>
            </View>
        )
    }

    if (!user || !isAuthenticated) {
        return (
            <View className='profile-container'>
                <View className='guest-section'>
                    <View className='guest-card'>
                        <View className='guest-avatar'>👤</View>
                        <Text className='guest-title'>欢迎使用校园互助</Text>
                        <Text className='guest-desc'>登录后可查看个人信息、接单赚取酬金</Text>
                        <Button className='login-btn' onClick={handleLogin}>立即登录</Button>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View className='profile-container'>
            <View className='profile-header'>
                <View className='user-info'>
                    <View className='avatar'>{(user.nickname || user.name || '同')[0]}</View>
                    <View className='user-meta'>
                        <View className='nickname-row'>
                            <Text className='nickname'>{user.nickname || user.name || '同学'}</Text>
                            <View className='edit-profile-btn' onClick={() => Taro.navigateTo({ url: '/pages/profile/edit' })}>
                                <Text className='edit-icon'>✏️</Text>
                            </View>
                        </View>
                        <View className='status-row'>
                            <Text className={`status-tag ${user.status === 'verified' ? 'verified' : ''}`}>
                                {user.status === 'verified' ? '✓ 已认证' : '未认证'}
                            </Text>
                            {user.status !== 'verified' && (
                                <Text className='verify-link' onClick={handleVerify}>去认证</Text>
                            )}
                        </View>
                        {user.bio && (
                            <Text className='user-bio'>{user.bio}</Text>
                        )}
                    </View>
                </View>
            </View>

            <View className='credit-section'>
                <View className='credit-card'>
                    <View className='credit-score'>
                        <Text className='score-value'>{user.credit_score}</Text>
                        <Text className='score-label'>信用分</Text>
                    </View>
                    <View className='credit-level'>
                        <Text className='level-text'>
                            {user.credit_score >= 90 ? '信用极好' : 
                             user.credit_score >= 70 ? '信用良好' : 
                             user.credit_score >= 60 ? '信用一般' : '信用较低'}
                        </Text>
                        <Text className='level-desc'>
                            {user.credit_score >= 90 ? '优先派单，享受更多权益' : 
                             user.credit_score >= 70 ? '正常接单，继续保持' : 
                             user.credit_score >= 60 ? '部分任务受限' : '请提高信用分'}
                        </Text>
                    </View>
                </View>
            </View>

            <View className='menu-section'>
                <View className='menu-item' onClick={handleMyTasks}>
                    <View className='menu-icon'>📋</View>
                    <Text className='menu-text'>我的任务</Text>
                    <Text className='menu-arrow'>›</Text>
                </View>
                
                {user.status !== 'verified' && (
                    <View className='menu-item' onClick={handleVerify}>
                        <View className='menu-icon'>🎓</View>
                        <Text className='menu-text'>校园认证</Text>
                        <Text className='menu-badge'>待完成</Text>
                        <Text className='menu-arrow'>›</Text>
                    </View>
                )}
            </View>

            <View className='history-section'>
                <View className='section-header'>
                    <Text className='section-title'>信用记录</Text>
                    <Text className='section-more'>最近10条</Text>
                </View>
                <View className='history-list'>
                    {history.length === 0 ? (
                        <View className='empty-state'>
                            <Text className='empty-icon'>📊</Text>
                            <Text className='empty-text'>暂无信用变更记录</Text>
                        </View>
                    ) : (
                        history.map(item => (
                            <View key={item.id} className='history-item'>
                                <View className='item-left'>
                                    <Text className='item-reason'>{item.reason}</Text>
                                    <Text className='item-time'>{new Date(item.created_at).toLocaleDateString()}</Text>
                                </View>
                                <Text className={`item-amount ${item.change_amount > 0 ? 'plus' : 'minus'}`}>
                                    {item.change_amount > 0 ? '+' : ''}{item.change_amount}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            </View>

            <View className='settings-section'>
                <View className='menu-item logout' onClick={handleLogout}>
                    <View className='menu-icon'>🚪</View>
                    <Text className='menu-text'>退出登录</Text>
                </View>
            </View>
        </View>
    )
}
