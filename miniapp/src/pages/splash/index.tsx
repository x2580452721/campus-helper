import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

export default function Splash() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' })
      }, 500)
    }, 3800)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  if (!isVisible) return null

  return (
    <View className='splash-container'>
      <View className='splash-bg' />

      <View className='splash-content'>
        <View className='logo-wrapper'>
          <View className='logo-icon'>
            <Text className='logo-emoji'>🎓</Text>
          </View>
        </View>

        <View className='app-name'>
          <Text className='app-name-text'>Campus Helper</Text>
        </View>

        <View className='tagline'>
          <Text className='tagline-text'>让校园生活更简单</Text>
        </View>

        <View className='footer'>
          <View className='dots'>
            <View className='dot active' />
            <View className='dot' />
            <View className='dot' />
          </View>
        </View>
      </View>
    </View>
  )
}
