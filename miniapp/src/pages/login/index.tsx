import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { supabase, request } from '../../utils/supabase'
import { authStore } from '../../utils/authStore'
import { UserProfile } from '../../hooks/useAuth'
import './index.scss'

type Mode = 'login' | 'register'

const DEV_MODE = true
const DEV_EMAILS = [
  'test@campus.edu',
  'user@campus.edu',
  'demo@campus.edu'
]
const DEV_PHONE_PREFIX = '1380013800'
const TEST_PHONE_REGEX = /^1380013800\d$/
const DEV_CODE = '123456'

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeAccount(value: string) {
  const trimmedValue = value.trim()
  if (TEST_PHONE_REGEX.test(trimmedValue)) {
    return `${trimmedValue}@campus.local`
  }
  return trimmedValue
}

function isDevAccount(value: string) {
  const normalizedValue = normalizeAccount(value)
  return DEV_EMAILS.includes(normalizedValue) || normalizedValue.endsWith('@campus.local')
}

function isValidLoginAccount(value: string) {
  return validateEmail(normalizeAccount(value))
}

function validatePassword(password: string) {
  return password.trim().length >= 6
}

function normalizeProfile(data: any): UserProfile {
  const fallbackName = data?.nickname || data?.name || data?.email?.split('@')[0] || '同学'

  return {
    id: String(data?.id || ''),
    student_id: data?.student_id || null,
    email: data?.email || '',
    phone: data?.phone || null,
    name: data?.name || fallbackName,
    nickname: data?.nickname || fallbackName,
    bio: data?.bio || null,
    avatar_url: data?.avatar_url || null,
    credit_score: Number.isFinite(data?.credit_score) ? data.credit_score : 100,
    role: data?.role === 'admin' ? 'admin' : 'student',
    status: data?.status === 'verified' || data?.status === 'banned' ? data.status : 'unverified',
    created_at: data?.created_at || new Date().toISOString(),
    updated_at: data?.updated_at || new Date().toISOString(),
    work_status: data?.work_status === 'active' || data?.work_status === 'standby' ? data.work_status : 'off'
  }
}

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    nickname: '',
    password: '',
    confirmPassword: ''
  })
  const [countdown, setCountdown] = useState(0)
  const [usePassword, setUsePassword] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return

    const timer = setTimeout(() => {
      setCountdown(prev => Math.max(prev - 1, 0))
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  const ensureUserProfile = async (userId: string, email: string, nickname?: string) => {
    const existingResult = await request<any[]>('/rest/v1/users', {
      method: 'GET',
      data: {
        id: `eq.${userId}`,
        select: '*'
      }
    })

    if (existingResult.error) {
      console.error('查询用户资料失败:', existingResult.error)
      throw existingResult.error
    }

    if (existingResult.data && existingResult.data.length > 0) {
      const existingProfile = existingResult.data[0]

      if (nickname && nickname.trim() && !existingProfile.nickname) {
        await request(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          data: {
            nickname: nickname.trim(),
            name: existingProfile.name || nickname.trim(),
            updated_at: new Date().toISOString()
          },
          headers: { Prefer: 'return=minimal' }
        })
        existingProfile.nickname = nickname.trim()
      }

      return normalizeProfile(existingProfile)
    }

    const insertPayload = {
      id: userId,
      student_id: null,
      email,
      phone: TEST_PHONE_REGEX.test(formData.email.trim()) ? formData.email.trim() : null,
      name: nickname?.trim() || '用户',
      nickname: nickname?.trim() || '用户',
      credit_score: 100,
      role: 'student',
      status: 'unverified',
      work_status: 'off'
    }

    const newResult = await request<any[]>('/rest/v1/users?select=*', {
      method: 'POST',
      data: insertPayload,
      headers: {
        Prefer: 'return=representation,resolution=ignore-duplicates'
      }
    })

    if (newResult.error) {
      console.error('创建用户记录失败:', newResult.error)
      throw newResult.error
    }

    if (newResult.data && newResult.data.length > 0) {
      return normalizeProfile(newResult.data[0])
    }

    return normalizeProfile(insertPayload)
  }

  const completeLogin = async (authUserId?: string) => {
    const { data: userResult } = await supabase.auth.getUser()
    const authUser = userResult.user
    const targetUserId = authUserId || authUser?.id

    if (!targetUserId) {
      throw new Error('获取用户信息失败')
    }

    const profile = await ensureUserProfile(targetUserId, normalizeAccount(formData.email), formData.nickname)
    await authStore.loginSuccess(profile)

    Taro.showToast({
      title: profile.status === 'verified' ? '登录成功' : '请先完成校园认证',
      icon: profile.status === 'verified' ? 'success' : 'none'
    })

    setTimeout(() => {
      if (profile.status === 'verified') {
        Taro.switchTab({ url: '/pages/index/index' })
      } else {
        Taro.redirectTo({ url: '/pages/auth/verify' })
      }
    }, 900)
  }

  const handleDevLogin = async () => {
    const email = normalizeAccount(formData.email)
    const password = formData.password || `dev_${email.split('@')[0]}`

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInData?.user && signInData?.session) {
      await ensureUserProfile(signInData.user.id, email, formData.nickname)
      return signInData.user.id
    }

    if (signInError && !String(signInError.message || '').includes('Invalid login credentials')) {
      throw signInError
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          email,
          nickname: formData.nickname || '用户',
          phone: TEST_PHONE_REGEX.test(formData.email.trim()) ? formData.email.trim() : null
        }
      }
    })

    if (signUpError) {
      console.error('注册失败:', signUpError)
      throw signUpError
    }

    if (signUpData?.user) {
      await ensureUserProfile(signUpData.user.id, email, formData.nickname)

      if (!signUpData.session) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (loginError) {
          throw loginError
        }
        return loginData.user?.id || signUpData.user.id
      }

      return signUpData.user.id
    }

    throw new Error('登录失败，请重试')
  }

  const sendCode = async () => {
    const account = formData.email.trim()
    const email = normalizeAccount(account)

    if (!email || !isValidLoginAccount(account)) {
      Taro.showToast({ title: '请输入正确的邮箱地址或测试手机号', icon: 'none' })
      return
    }

    if (countdown > 0) return

    setLoading(true)
    try {
      if (DEV_MODE && isDevAccount(account)) {
        Taro.showToast({ title: '测试验证码: 123456', icon: 'none', duration: 3000 })
        setCountdown(60)
        return
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: mode === 'register'
        }
      })

      if (error) throw error

      Taro.showToast({
        title: mode === 'register' ? '验证码已发送，完成验证后将创建账号' : '验证码已发送到邮箱',
        icon: 'success'
      })
      setCountdown(60)
    } catch (error: any) {
      console.error('发送验证码失败:', error)
      Taro.showToast({ title: error.message || '发送失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    const account = formData.email.trim()
    const email = normalizeAccount(account)

    if (!email) {
      Taro.showToast({ title: '请输入邮箱地址或测试手机号', icon: 'none' })
      return
    }

    if (!isValidLoginAccount(account)) {
      Taro.showToast({ title: '请输入正确的邮箱地址或测试手机号', icon: 'none' })
      return
    }

    if (usePassword) {
      if (!formData.password.trim()) {
        Taro.showToast({ title: '请输入密码', icon: 'none' })
        return
      }

      setLoading(true)
      try {
        if (DEV_MODE && isDevAccount(account)) {
          const userId = await handleDevLogin()
          await completeLogin(userId)
          return
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password
        })

        if (error) throw error
        if (!data?.user?.id) {
          throw new Error('登录失败，请重试')
        }

        await completeLogin(data.user.id)
      } catch (error: any) {
        console.error('登录失败:', error)
        Taro.showToast({ title: error.message || '登录失败', icon: 'none' })
      } finally {
        setLoading(false)
      }
      return
    }

    if (!formData.code.trim()) {
      Taro.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      if (DEV_MODE && isDevAccount(account)) {
        if (formData.code.trim() !== DEV_CODE) {
          throw new Error('验证码错误')
        }

        const userId = await handleDevLogin()
        await completeLogin(userId)
        return
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: formData.code.trim(),
        type: 'email'
      })

      if (error) throw error
      if (!data?.user?.id) {
        throw new Error('验证码校验失败')
      }

      await completeLogin(data.user.id)
    } catch (error: any) {
      console.error('登录失败:', error)
      Taro.showToast({ title: error.message || '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    const account = formData.email.trim()
    const email = normalizeAccount(account)
    const nickname = formData.nickname.trim()

    if (!email || !isValidLoginAccount(account)) {
      Taro.showToast({ title: '请输入正确的邮箱地址或测试手机号', icon: 'none' })
      return
    }
    if (!formData.code.trim()) {
      Taro.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    if (!nickname) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (!validatePassword(formData.password)) {
      Taro.showToast({ title: '密码长度至少6位', icon: 'none' })
      return
    }
    if (formData.password !== formData.confirmPassword) {
      Taro.showToast({ title: '两次密码输入不一致', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      if (DEV_MODE && isDevAccount(account)) {
        if (formData.code.trim() !== DEV_CODE) {
          throw new Error('验证码错误')
        }

        const userId = await handleDevLogin()
        await completeLogin(userId)
        return
      }

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: formData.code.trim(),
        type: 'email'
      })

      if (verifyError) throw verifyError
      if (!verifyData?.user?.id) {
        throw new Error('验证码校验失败')
      }

      await ensureUserProfile(verifyData.user.id, email, nickname)

      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (updateError) {
        console.error('设置密码失败:', updateError)
      }

      await completeLogin(verifyData.user.id)
    } catch (error: any) {
      console.error('注册失败:', error)
      Taro.showToast({ title: error.message || '注册失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (mode === 'login') {
      handleLogin()
      return
    }

    handleRegister()
  }

  const resetForm = (nextMode: Mode) => {
    setMode(nextMode)
    setFormData({ email: '', code: '', nickname: '', password: '', confirmPassword: '' })
    setUsePassword(false)
    setCountdown(0)
  }

  return (
    <View className='login-page'>
      <View className='login-header'>
        <Text className='logo'>🎓</Text>
        <Text className='title'>校园互助</Text>
        <Text className='subtitle'>纯净校园 · 互助无忧</Text>
      </View>

      <View className='login-card'>
        <View className='tabs'>
          <View
            className={`tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => resetForm('login')}
          >
            登录
          </View>
          <View
            className={`tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => resetForm('register')}
          >
            注册
          </View>
        </View>

        <View className='form'>
          <View className='form-item'>
            <Text className='label'>📧 邮箱地址 / 测试手机号</Text>
            <Input
              className='input'
              type='text'
              placeholder='请输入邮箱地址或测试手机号'
              value={formData.email}
              onInput={(e) => {
                const val = e.detail?.value ?? e.target?.value ?? ''
                console.log('[login] 输入邮箱/手机号:', val)
                setFormData({ ...formData, email: val })
              }}
              onChange={(e) => {
                const val = e.detail?.value ?? e.target?.value ?? ''
                console.log('[login] 邮箱/手机号变化:', val)
                setFormData({ ...formData, email: val })
              }}
            />
          </View>

          {mode === 'login' && (
            <View className='login-mode-switch'>
              <View
                className={`mode-switch-item ${!usePassword ? 'active' : ''}`}
                onClick={() => setUsePassword(false)}
              >
                验证码登录
              </View>
              <View
                className={`mode-switch-item ${usePassword ? 'active' : ''}`}
                onClick={() => setUsePassword(true)}
              >
                密码登录
              </View>
            </View>
          )}

          {(!usePassword || mode === 'register') && (
            <View className='form-item'>
              <Text className='label'>🔐 验证码</Text>
              <View className='code-row'>
                <Input
                  className='input code-input'
                  type='number'
                  placeholder='请输入验证码'
                  maxlength={6}
                  value={formData.code}
                  onInput={(e) => {
                    const val = e.detail?.value ?? e.target?.value ?? ''
                    console.log('[login] 输入验证码:', val)
                    setFormData({ ...formData, code: val })
                  }}
                  onChange={(e) => {
                    const val = e.detail?.value ?? e.target?.value ?? ''
                    setFormData({ ...formData, code: val })
                  }}
                />
                <Button
                  className='code-btn'
                  onClick={sendCode}
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </View>
            </View>
          )}

          {usePassword && mode === 'login' && (
            <View className='form-item'>
              <Text className='label'>🔑 密码</Text>
              <Input
                className='input'
                type='text'
                password
                placeholder='请输入密码'
                value={formData.password}
                onInput={(e) => {
                  const val = e.detail?.value ?? e.target?.value ?? ''
                  setFormData({ ...formData, password: val })
                }}
                onChange={(e) => {
                  const val = e.detail?.value ?? e.target?.value ?? ''
                  setFormData({ ...formData, password: val })
                }}
              />
            </View>
          )}

          {mode === 'register' && (
            <>
              <View className='form-item'>
                <Text className='label'>👤 昵称</Text>
                <Input
                  className='input'
                  placeholder='请输入昵称'
                  maxlength={20}
                  value={formData.nickname}
                  onInput={(e) => {
                    const val = e.detail?.value ?? e.target?.value ?? ''
                    setFormData({ ...formData, nickname: val })
                  }}
                  onChange={(e) => {
                    const val = e.detail?.value ?? e.target?.value ?? ''
                    setFormData({ ...formData, nickname: val })
                  }}
                />
              </View>
              <View className='form-item'>
                <Text className='label'>🔑 设置密码</Text>
                <Input
                  className='input'
                  type='text'
                  password
                  placeholder='请设置密码（至少6位）'
                  value={formData.password}
                  onInput={(e) => {
                    const val = e.detail?.value ?? e.target?.value ?? ''
                    setFormData({ ...formData, password: val })
                  }}
                  onChange={(e) => {
                    const val = e.detail?.value ?? e.target?.value ?? ''
                    setFormData({ ...formData, password: val })
                  }}
                />
              </View>
              <View className='form-item'>
                <Text className='label'>🔑 确认密码</Text>
                <Input
                  className='input'
                  type='text'
                  password
                  placeholder='请再次输入密码'
                  value={formData.confirmPassword}
                  onInput={(e) => {
                    const val = e.detail?.value ?? e.target?.value ?? ''
                    setFormData({ ...formData, confirmPassword: val })
                  }}
                  onChange={(e) => {
                    const val = e.detail?.value ?? e.target?.value ?? ''
                    setFormData({ ...formData, confirmPassword: val })
                  }}
                />
              </View>
            </>
          )}
        </View>

        <Button
          className='submit-btn'
          loading={loading}
          onClick={handleSubmit}
        >
          {mode === 'login' ? '登录' : '注册'}
        </Button>

        <View className='footer-links'>
          <Text
            className='link'
            onClick={() => resetForm(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '没有账号？立即注册' : '已有账号？立即登录'}
          </Text>
        </View>
      </View>

      {DEV_MODE && (
        <View className='dev-tips'>
          <Text className='dev-title'>🔧 开发模式</Text>
          <Text className='dev-text'>测试邮箱: {DEV_EMAILS.join(', ')}</Text>
          <Text className='dev-text'>测试手机号: {DEV_PHONE_PREFIX}0 - {DEV_PHONE_PREFIX}9</Text>
          <Text className='dev-text'>测试验证码: {DEV_CODE}</Text>
        </View>
      )}

      <View className='tips'>
        <Text>登录后需完成校园身份认证才能接单</Text>
      </View>
    </View>
  )
}
