import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

export default function Splash() {
  const [isVisible, setIsVisible] = useState(true)
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationPhase(1), 300)
    const timer2 = setTimeout(() => setAnimationPhase(2), 1200)
    const timer3 = setTimeout(() => setAnimationPhase(3), 2200)
    const timer4 = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' })
      }, 500)
    }, 4000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  if (!isVisible) return null

  return (
    <View className='splash-container'>
      <View className='splash-bg' />

      <View className='splash-content'>
        <View className={`logo-wrapper phase-${animationPhase}`}>
          <View className='logo-icon'>
            <Text className='logo-emoji'>🎓</Text>
          </View>
        </View>

        <View className={`app-name phase-${animationPhase}`}>
          <Text className='app-name-text'>Campus Helper</Text>
        </View>

        <View className={`tagline phase-${animationPhase}`}>
          <Text className='tagline-text'>让校园生活更简单</Text>
        </View>

        <View className={`footer phase-${animationPhase}`}>
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
