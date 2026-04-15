import Taro from '@tarojs/taro'

const AUTH_PROFILE_KEY = 'campus-helper-user-profile'

interface AuthState {
  user: any
  isAuthenticated: boolean
  loading: boolean
}

type AuthListener = (state: AuthState) => void

class AuthStore {
  private state: AuthState
  
  private listeners: AuthListener[] = []

  constructor() {
    const persistedUser = this.readPersistedUser()
    this.state = {
      user: persistedUser,
      isAuthenticated: Boolean(persistedUser),
      loading: true
    }
  }

  getState() {
    return this.state
  }

  setState(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState }
    this.persistUser(this.state.user)
    this.notify()
  }

  subscribe(listener: AuthListener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state))
  }

  async loginSuccess(user: any) {
    this.setState({
      user,
      isAuthenticated: true,
      loading: false
    })
  }

  async logout() {
    try {
      Taro.removeStorageSync('sb-access-token')
      Taro.removeStorageSync('sb-refresh-token')
      Taro.removeStorageSync('sb-user')
      Taro.removeStorageSync(AUTH_PROFILE_KEY)
    } catch (e) {
      console.error('清除存储失败:', e)
    }
    
    this.setState({
      user: null,
      isAuthenticated: false,
      loading: false
    })
  }

  private readPersistedUser() {
    try {
      return Taro.getStorageSync(AUTH_PROFILE_KEY) || null
    } catch (error) {
      console.error('读取用户缓存失败:', error)
      return null
    }
  }

  private persistUser(user: any) {
    try {
      if (user) {
        Taro.setStorageSync(AUTH_PROFILE_KEY, user)
      } else {
        Taro.removeStorageSync(AUTH_PROFILE_KEY)
      }
    } catch (error) {
      console.error('持久化用户信息失败:', error)
    }
  }
}

export const authStore = new AuthStore()
