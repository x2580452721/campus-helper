import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { authStore } from '../../utils/authStore'
import { useAuth } from '../../hooks/useAuth'
import './verify.scss'

const STUDENT_ID_REGEX = /^[0-9]{8,12}$/

export default function Verify() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    college: '',
    major: ''
  })
  const [errors, setErrors] = useState({
    name: '',
    studentId: '',
    college: ''
  })
  const [loading, setLoading] = useState(false)
  const [checkingStudentId, setCheckingStudentId] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<'none' | 'verified'>('none')

  useEffect(() => {
    if (!user) return

    setFormData(prev => ({
      ...prev,
      name: user.name || user.nickname || prev.name || '',
      studentId: user.student_id || prev.studentId || '',
      college: user.college || prev.college || '',
      major: user.major || prev.major || ''
    }))

    if (user.status === 'verified') {
      setVerifyStatus('verified')
      return
    }

    setVerifyStatus('none')
  }, [user])

  useEffect(() => {
    if (verifyStatus === 'verified' && user?.status === 'verified') {
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' })
      }, 500)
    }
  }, [verifyStatus, user])

  const validateStudentId = (value: string) => {
    const normalizedValue = value.trim()

    if (!normalizedValue) {
      return '请输入学号'
    }
    if (!STUDENT_ID_REGEX.test(normalizedValue)) {
      return '学号格式不正确（应为8-12位数字）'
    }
    return ''
  }

  const checkStudentIdExists = async (studentId: string) => {
    const normalizedStudentId = studentId.trim()

    if (!normalizedStudentId || !STUDENT_ID_REGEX.test(normalizedStudentId)) {
      return false
    }

    setCheckingStudentId(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('student_id', normalizedStudentId)
        .neq('id', user?.id || '')
        .limit(1)

      if (error) {
        console.error('检查学号失败:', error)
        return false
      }

      return Boolean(data && data.length > 0)
    } catch (error) {
      console.error('检查学号异常:', error)
      return false
    } finally {
      setCheckingStudentId(false)
    }
  }

  const handleStudentIdBlur = async () => {
    const error = validateStudentId(formData.studentId)
    if (error) {
      setErrors(prev => ({ ...prev, studentId: error }))
      return
    }

    const exists = await checkStudentIdExists(formData.studentId)
    setErrors(prev => ({
      ...prev,
      studentId: exists ? '该学号已被注册' : ''
    }))
  }

  const handleSubmit = async () => {
    const nextErrors = {
      name: !formData.name.trim() ? '请输入真实姓名' : '',
      studentId: validateStudentId(formData.studentId),
      college: (user?.status !== 'verified' && !formData.college.trim()) ? '请输入所在学院' : ''
    }
    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    const exists = await checkStudentIdExists(formData.studentId)
    if (exists) {
      setErrors(prev => ({ ...prev, studentId: '该学号已被注册' }))
      Taro.showToast({ title: '该学号已被注册', icon: 'none' })
      return
    }

    if (!user) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      Taro.redirectTo({ url: '/pages/login/index' })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name.trim(),
          nickname: user.nickname || formData.name.trim(),
          student_id: formData.studentId.trim(),
          college: formData.college.trim() || null,
          major: formData.major.trim() || null,
          status: 'verified',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      const updatedUser = await refreshUser()
      if (updatedUser) {
        authStore.setState({ user: updatedUser, isAuthenticated: true })
      }

      Taro.showToast({ title: '认证成功', icon: 'success' })
      setVerifyStatus('verified')

      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' })
      }, 1200)
    } catch (error) {
      console.error('认证失败:', error)
      Taro.showToast({ title: '认证失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    Taro.switchTab({ url: '/pages/index/index' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    await authStore.logout()
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  if (authLoading) {
    return (
      <View className='verify-page'>
        <View className='loading-state'>
          <Text>加载中...</Text>
        </View>
      </View>
    )
  }

  if (!user) {
    return (
      <View className='verify-page'>
        <View className='not-logged-in'>
          <Text className='icon'>🔐</Text>
          <Text className='title'>请先登录</Text>
          <Text className='desc'>登录后才能进行校园认证</Text>
          <Button className='login-btn' onClick={() => Taro.redirectTo({ url: '/pages/login/index' })}>
            去登录
          </Button>
        </View>
      </View>
    )
  }

  if (verifyStatus === 'verified') {
    return (
      <View className='verify-page'>
        <View className='verified-card'>
          <Text className='icon'>✅</Text>
          <Text className='title'>认证成功</Text>
          <Text className='desc'>您已完成校园身份认证</Text>
          <View className='info-card'>
            <View className='info-row'>
              <Text className='label'>姓名</Text>
              <Text className='value'>{user.name || user.nickname}</Text>
            </View>
            <View className='info-row'>
              <Text className='label'>学号</Text>
              <Text className='value'>{user.student_id || formData.studentId}</Text>
            </View>
          </View>
          <Button className='home-btn' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            返回首页
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className='verify-page'>
      <View className='verify-header'>
        <Text className='icon'>🎓</Text>
        <Text className='title'>校园身份认证</Text>
        <Text className='subtitle'>完成认证后即可接单赚取酬金</Text>
      </View>

      <View className='verify-card'>
        <View className='card-header'>
          <Text className='card-title'>填写认证信息</Text>
          <Text className='card-desc'>请确保信息真实有效</Text>
        </View>

        <View className='form'>
          <View className='form-item'>
            <Text className='label'>👤 真实姓名</Text>
            <Input
              className={`input ${errors.name ? 'error' : ''}`}
              placeholder='请输入真实姓名'
              maxlength={20}
              value={formData.name}
              onInput={e => {
                setFormData({ ...formData, name: e.detail.value })
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
              }}
            />
            {errors.name && <Text className='error-text'>{errors.name}</Text>}
          </View>

          <View className='form-item'>
            <Text className='label'>🆔 学号</Text>
            <Input
              className={`input ${errors.studentId ? 'error' : ''}`}
              type='number'
              placeholder='请输入学号（8-12位数字）'
              maxlength={12}
              value={formData.studentId}
              onInput={e => {
                setFormData({ ...formData, studentId: e.detail.value })
                if (errors.studentId) setErrors(prev => ({ ...prev, studentId: '' }))
              }}
              onBlur={handleStudentIdBlur}
            />
            {errors.studentId && <Text className='error-text'>{errors.studentId}</Text>}
            {checkingStudentId && <Text className='checking-text'>正在检查学号...</Text>}
          </View>

          <View className='form-item'>
            <Text className='label'>🏫 学院</Text>
            <Input
              className={`input ${errors.college ? 'error' : ''}`}
              placeholder='请输入所在学院'
              maxlength={30}
              value={formData.college}
              onInput={e => {
                setFormData({ ...formData, college: e.detail.value })
                if (errors.college) setErrors(prev => ({ ...prev, college: '' }))
              }}
            />
            {errors.college && <Text className='error-text'>{errors.college}</Text>}
          </View>

          <View className='form-item'>
            <Text className='label'>📚 专业（选填）</Text>
            <Input
              className='input'
              placeholder='请输入专业名称'
              maxlength={30}
              value={formData.major}
              onInput={e => setFormData({ ...formData, major: e.detail.value })}
            />
          </View>
        </View>

        <View className='tips-card'>
          <Text className='tips-title'>💡 认证说明</Text>
          <Text className='tips-text'>• 认证信息仅用于身份核验</Text>
          <Text className='tips-text'>• 请确保信息与校园卡一致</Text>
          <Text className='tips-text'>• 学号格式为8-12位数字</Text>
          <Text className='tips-text'>• 认证后可接单赚取酬金</Text>
        </View>

        <Button
          className='submit-btn'
          loading={loading}
          onClick={handleSubmit}
        >
          提交认证
        </Button>

        <View className='action-links'>
          <Text className='link skip' onClick={handleSkip}>稍后认证</Text>
          <Text className='link logout' onClick={handleLogout}>退出登录</Text>
        </View>
      </View>
    </View>
  )
}
