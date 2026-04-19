import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect } from 'react'
import './index.scss'

export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(() => {
      Taro.redirectTo({ url: '/pages/index/index' })
    }, 3800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View className='splash-page'>
      <View className='decoration-orbs'>
        <View className='orb orb-1' />
        <View className='orb orb-2' />
        <View className='orb orb-3' />
      </View>
      
      <View className='splash-content'>
        <View className='logo-container'>
          <View className='logo-ring ring-outer' />
          <View className='logo-ring ring-inner' />
          <View className='logo-icon'>🎓</View>
        </View>
        
        <View className='title-container'>
          <Text className='app-title'>Campus Helper</Text>
        </View>
        
        <View className='subtitle-container'>
          <Text className='app-subtitle'>校园生活好帮手</Text>
        </View>
      </View>
    </View>
  )
}
