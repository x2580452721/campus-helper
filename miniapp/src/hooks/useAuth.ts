import { useState, useEffect, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { supabase, request } from '../utils/supabase'
import { authStore } from '../utils/authStore'

export interface UserProfile {
  id: string
  student_id: string | null
  email: string
  phone?: string | null
  name: string | null
  nickname: string
  bio?: string | null
  college?: string | null
  major?: string | null
  avatar_url: string | null
  credit_score: number
  role: 'student' | 'admin'
  status: 'unverified' | 'verified' | 'banned'
  created_at: string
  updated_at: string
  work_status: 'off' | 'active' | 'standby'
}

interface AuthUser {
  id: string
  email?: string | null
  phone?: string | null
  user_metadata?: Record<string, any>
}

function normalizeUserProfile(data: any): UserProfile {
  const fallbackName = data?.nickname || data?.name || data?.email?.split('@')[0] || '同学'

  return {
    id: String(data?.id || ''),
    student_id: data?.student_id || null,
    email: data?.email || '',
    phone: data?.phone || null,
    name: data?.name || null,
    nickname: data?.nickname || fallbackName,
    bio: data?.bio || null,
    college: data?.college || null,
    major: data?.major || null,
    avatar_url: data?.avatar_url || null,
    credit_score: Number.isFinite(data?.credit_score) ? data.credit_score : 100,
    role: data?.role === 'admin' ? 'admin' : 'student',
    status: data?.status === 'verified' || data?.status === 'banned' ? data.status : 'unverified',
    created_at: data?.created_at || new Date().toISOString(),
    updated_at: data?.updated_at || new Date().toISOString(),
    work_status: data?.work_status === 'active' || data?.work_status === 'standby' ? data.work_status : 'off'
  }
}

async function ensureProfileExists(authUser: AuthUser) {
  const fallbackProfile = normalizeUserProfile({
    id: authUser.id,
    email: authUser.email || `${authUser.phone || authUser.id}@campus.local`,
    phone: authUser.phone || authUser.user_metadata?.phone || null,
    nickname: authUser.user_metadata?.nickname || authUser.user_metadata?.name || '同学',
    name: authUser.user_metadata?.name || authUser.user_metadata?.nickname || '同学',
    credit_score: 100,
    role: 'student',
    status: 'unverified',
    work_status: 'off'
  })

  const insertResult = await request<any[]>('/rest/v1/users?select=*', {
    method: 'POST',
    data: fallbackProfile,
    headers: {
      Prefer: 'return=representation,resolution=ignore-duplicates'
    }
  })

  if (insertResult.error) {
    console.error('创建用户资料失败:', insertResult.error)
  }

  return fallbackProfile
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(authStore.getState().user as UserProfile | null)
  const [loading, setLoading] = useState(authStore.getState().loading)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async (userId: string, authUser?: AuthUser) => {
    try {
      setError(null)

      const result = await request<any[]>('/rest/v1/users', {
        method: 'GET',
        data: {
          id: `eq.${encodeURIComponent(userId)}`,
          select: '*'
        }
      })

      if (result.error) {
        console.error('获取用户资料失败:', result.error)
        setError('获取用户信息失败')
        authStore.setState({ loading: false })
        return null
      }

      if (result.data && result.data.length > 0) {
        const userProfile = normalizeUserProfile(result.data[0])
        setUser(userProfile)
        authStore.setState({ user: userProfile, isAuthenticated: true, loading: false })
        return userProfile
      }

      if (authUser) {
        const fallbackProfile = await ensureProfileExists(authUser)
        setUser(fallbackProfile)
        authStore.setState({ user: fallbackProfile, isAuthenticated: true, loading: false })
        return fallbackProfile
      }

      authStore.setState({ user: null, isAuthenticated: false, loading: false })
      setUser(null)
      return null
    } catch (err) {
      console.error('获取用户资料异常:', err)
      setError('获取用户信息失败')
      authStore.setState({ loading: false })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const checkAndInitAuth = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('获取会话失败:', sessionError)
        setError('获取会话失败')
        authStore.setState({ user: null, isAuthenticated: false, loading: false })
        return
      }

      if (session?.user?.id) {
        await fetchProfile(session.user.id, session.user as AuthUser)
      } else {
        setUser(null)
        authStore.setState({ user: null, isAuthenticated: false, loading: false })
      }
    } catch (err) {
      console.error('认证初始化失败:', err)
      setError('认证初始化失败')
      setUser(null)
      authStore.setState({ user: null, isAuthenticated: false, loading: false })
    } finally {
      setLoading(false)
    }
  }, [fetchProfile])

  useEffect(() => {
    const unsubscribe = authStore.subscribe((state) => {
      setUser((state.user as UserProfile | null) || null)
      setLoading(state.loading)
    })

    checkAndInitAuth()

    return unsubscribe
  }, [checkAndInitAuth])

  const toggleWorkStatus = async (status: 'off' | 'active' | 'standby') => {
    if (!user) return

    try {
      setLoading(true)

      const result = await request(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        data: { work_status: status },
        headers: { Prefer: 'return=minimal' }
      })

      if (result.error) {
        console.error('更新工作状态失败:', result.error)
        throw result.error
      }

      const updatedUser = { ...user, work_status: status }
      setUser(updatedUser)
      authStore.setState({ user: updatedUser, isAuthenticated: true })
      Taro.showToast({ title: '状态更新成功', icon: 'success' })
    } catch (err) {
      console.error('更新工作状态异常:', err)
      Taro.showToast({ title: '状态更新失败', icon: 'none' })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    if (!user) return null
    return fetchProfile(user.id)
  }

  return {
    user,
    loading,
    error,
    toggleWorkStatus,
    refreshUser,
    isAuthenticated: !!user,
    checkAndInitAuth
  }
}
