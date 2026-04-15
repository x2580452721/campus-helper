import { View, Text, Input, Button, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useAuth } from '../../hooks/useAuth'
import { authStore } from '../../utils/authStore'
import './edit.scss'

export default function EditProfile() {
    const { user, refreshUser } = useAuth()
    const [loading, setLoading] = useState(false)
    const [nickname, setNickname] = useState('')
    const [bio, setBio] = useState('')

    useEffect(() => {
        if (!user) return
        setNickname(user.nickname || '')
        setBio(user.bio || '')
    }, [user?.id, user?.nickname, user?.bio])

    const trimmedNickname = nickname.trim()
    const trimmedBio = bio.trim()
    const initialNickname = user?.nickname?.trim() || ''
    const initialBio = user?.bio?.trim() || ''
    const hasChanges = useMemo(() => {
        return trimmedNickname !== initialNickname || trimmedBio !== initialBio
    }, [initialNickname, initialBio, trimmedBio, trimmedNickname])

    const formatErrorMessage = (error: any) => {
        if (!error) return '未知错误'
        if (typeof error === 'string') return error
        return error.message || error.details || error.error || '保存失败'
    }

    const buildPayloadCandidates = () => {
        const updatedAt = new Date().toISOString()
        const base = { updated_at: updatedAt }
        const wantsBio = trimmedBio !== initialBio
        const bioValue = wantsBio ? (trimmedBio || null) : undefined

        const candidates: Array<Record<string, string | null>> = []

        candidates.push({
            ...base,
            nickname: trimmedNickname,
            name: trimmedNickname,
            ...(bioValue !== undefined ? { bio: bioValue } : {})
        })

        candidates.push({
            ...base,
            name: trimmedNickname,
            ...(bioValue !== undefined ? { bio: bioValue } : {})
        })

        candidates.push({
            ...base,
            name: trimmedNickname
        })

        return candidates
    }

    const shouldRetryWithoutBio = (error: any) => {
        const message = formatErrorMessage(error).toLowerCase()
        return message.includes('bio') && (message.includes('does not exist') || message.includes('column'))
    }

    const shouldRetryWithoutNickname = (error: any) => {
        const message = formatErrorMessage(error).toLowerCase()
        return message.includes('nickname') && (message.includes('does not exist') || message.includes('column'))
    }

    const handleSave = async () => {
        if (!trimmedNickname) {
            Taro.showToast({ title: '请输入昵称', icon: 'none' })
            return
        }

        if (!user) return

        if (!hasChanges) {
            Taro.showToast({ title: '没有需要保存的修改', icon: 'none' })
            return
        }

        setLoading(true)
        try {
            const payloads = buildPayloadCandidates()
            let updateError: any = null
            let savedPayload: Record<string, string | null> | null = null

            for (const payload of payloads) {
                const { error } = await supabase
                    .from('users')
                    .update(payload)
                    .eq('id', user.id)

                if (!error) {
                    savedPayload = payload
                    updateError = null
                    break
                }

                updateError = error

                const retryable = shouldRetryWithoutBio(error) || shouldRetryWithoutNickname(error)
                if (!retryable) {
                    break
                }
            }

            if (updateError || !savedPayload) {
                throw updateError || new Error('保存失败')
            }

            authStore.setState({
                user: {
                    ...user,
                    nickname: trimmedNickname,
                    name: trimmedNickname,
                    bio: trimmedBio || null,
                    updated_at: new Date().toISOString()
                },
                isAuthenticated: true,
                loading: false
            })

            refreshUser().catch(error => {
                console.warn('保存后刷新资料失败，已保留本地更新:', error)
            })

            Taro.showToast({ title: '保存成功', icon: 'success' })
            setTimeout(() => {
                Taro.navigateBack()
            }, 1500)
        } catch (error) {
            console.error('保存失败:', error)
            Taro.showToast({ title: `保存失败：${formatErrorMessage(error)}`, icon: 'none', duration: 2500 })
        } finally {
            setLoading(false)
        }
    }

    if (!user) {
        return (
            <View className='edit-container'>
                <View className='not-logged-in'>
                    <Text className='icon'>🔐</Text>
                    <Text className='title'>请先登录</Text>
                </View>
            </View>
        )
    }

    return (
        <View className='edit-container'>
            <View className='page-header'>
                <View className='back-btn' onClick={() => Taro.navigateBack()}>
                    <Text className='back-icon'>←</Text>
                    <Text className='back-text'>返回</Text>
                </View>
                <Text className='page-title'>编辑资料</Text>
                <View style={{ width: '80px' }} />
            </View>

            <View className='edit-content'>
                <View className='avatar-section'>
                    <View className='avatar-preview'>
                        <Text className='avatar-text'>{trimmedNickname[0] || '?'}</Text>
                    </View>
                    <Text className='avatar-hint'>头像（暂不支持自定义）</Text>
                </View>

                <View className='form-section'>
                    <View className='form-group'>
                        <Text className='label'>昵称</Text>
                        <Input
                            className='input'
                            placeholder='请输入昵称'
                            value={nickname}
                            onInput={e => setNickname(e.detail.value)}
                            maxlength={20}
                        />
                        <Text className='input-hint'>最多20个字符</Text>
                    </View>

                    <View className='form-group'>
                        <Text className='label'>个人简介</Text>
                        <Textarea
                            className='input bio-input'
                            placeholder='介绍一下自己吧...'
                            value={bio}
                            onInput={e => setBio(e.detail.value)}
                            maxlength={100}
                            autoHeight
                            showConfirmBar={false}
                        />
                        <Text className='input-hint'>{trimmedBio.length}/100</Text>
                    </View>
                </View>

                <View className='save-section'>
                    <Button
                        className={`save-btn ${!hasChanges || loading ? 'disabled' : ''}`}
                        loading={loading}
                        disabled={loading || !hasChanges}
                        onClick={handleSave}
                    >
                        保存修改
                    </Button>
                </View>
            </View>
        </View>
    )
}
