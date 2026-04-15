import Taro from '@tarojs/taro'

const SUPABASE_URL = 'https://dnkhygbvdcierhmqmxbb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRua2h5Z2J2ZGNpZXJobXFteGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTgyNzcsImV4cCI6MjA4ODg3NDI3N30.0OlGWizAbt3HhvsugmmOp-gG4N5Uvp4t0QNgKeNfkYQ'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  data?: any
  headers?: Record<string, string>
}

interface RequestResult<T = any> {
  data: T | null
  error: any
}

let accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  accessToken = token
  if (token) {
    Taro.setStorageSync('sb-access-token', token)
  } else {
    Taro.removeStorageSync('sb-access-token')
  }
}

export const getAccessToken = () => {
  if (!accessToken) {
    try {
      accessToken = Taro.getStorageSync('sb-access-token') || null
    } catch {
      accessToken = null
    }
  }
  return accessToken
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = Taro.getStorageSync('sb-refresh-token')
    if (!refreshToken) {
      return false
    }

    return new Promise((resolve) => {
      Taro.request({
        url: `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        method: 'POST',
        data: { refresh_token: refreshToken },
        header: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const data = res.data as any
            if (data?.access_token) {
              setAccessToken(data.access_token)
              Taro.setStorageSync('sb-refresh-token', data.refresh_token)
              if (data.user) {
                Taro.setStorageSync('sb-user', JSON.stringify(data.user))
              }
              resolve(true)
              return
            }
          }
          resolve(false)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  } catch (error) {
    console.error('刷新 token 失败:', error)
    return false
  }
}

function handleAuthFailure() {
  console.log('处理认证失败，清除登录状态')
  setAccessToken(null)
  try {
    Taro.removeStorageSync('sb-access-token')
    Taro.removeStorageSync('sb-refresh-token')
    Taro.removeStorageSync('sb-user')
  } catch (e) {
    console.warn('清除存储失败:', e)
  }

  setTimeout(() => {
    const pages = Taro.getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage?.route !== 'pages/login/index') {
      try {
        Taro.reLaunch({ url: '/pages/login/index' })
      } catch (e) {
        console.warn('跳转登录页失败:', e)
      }
    }
  }, 100)
}

export const request = async <T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<RequestResult<T>> => {
  const { method = 'GET', data, headers = {} } = options

  let token = getAccessToken()

  const buildHeaders = (useToken: string | null) => {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...headers
    }
    if (useToken) {
      requestHeaders['Authorization'] = `Bearer ${useToken}`
    }
    return requestHeaders
  }

  let finalUrl = `${SUPABASE_URL}${url}`
  let requestData = data

  if (method === 'GET' && data) {
    const params = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    if (queryString) {
      finalUrl += `?${queryString}`
    }
    requestData = undefined
  }

  const makeRequest = (useToken: string | null, isRetry: boolean = false): Promise<RequestResult<T>> => {
    return new Promise((resolve) => {
      console.log(`发起请求: ${method} ${finalUrl}`)
      Taro.request({
        url: finalUrl,
        method,
        data: requestData,
        header: buildHeaders(useToken),
        success: async (res) => {
          console.log(`请求响应: ${res.statusCode}`, res.data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: res.data as T, error: null })
          } else if (res.statusCode === 401) {
            const errorData = res.data as any
            const errorMsg = JSON.stringify(errorData || {})
            const isJwtExpired = errorData?.code === 'PGRST303' ||
              errorMsg.includes('JWT expired') ||
              errorMsg.includes('401')

            console.log(`401 错误, isJwtExpired: ${isJwtExpired}, isRetry: ${isRetry}`)

            if (isJwtExpired && !isRetry && useToken === token) {
              console.log('JWT 过期，尝试刷新 token...')
              const refreshed = await refreshAccessToken()
              if (refreshed) {
                console.log('Token 刷新成功，重试请求...')
                const newToken = getAccessToken()
                const retryResult = await makeRequest(newToken, true)
                resolve(retryResult)
                return
              } else {
                console.log('Token 刷新失败')
              }
            }

            console.log('认证失败，清除登录状态并跳转登录页')
            handleAuthFailure()
            resolve({ data: null, error: res.data })
          } else {
            resolve({ data: null, error: res.data })
          }
        },
        fail: (err) => {
          console.error('请求失败:', err)
          resolve({ data: null, error: err })
        }
      })
    })
  }

  return makeRequest(token)
}

export const auth = {
  signInWithOtp: async ({ email, options }: { email: string; options?: { shouldCreateUser?: boolean } }) => {
    return await request('/auth/v1/otp', {
      method: 'POST',
      data: { email, create_user: options?.shouldCreateUser ?? true }
    })
  },

  verifyOtp: async ({ email, token, type }: { email: string; token: string; type: string }) => {
    const result = await request<{ access_token: string; refresh_token: string; user: any }>('/auth/v1/verify', {
      method: 'POST',
      data: { email, token, type }
    })
    if (result.data?.access_token) {
      setAccessToken(result.data.access_token)
      Taro.setStorageSync('sb-refresh-token', result.data.refresh_token)
      Taro.setStorageSync('sb-user', JSON.stringify(result.data.user))
    }
    return result
  },

  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const result = await request<{ access_token: string; refresh_token: string; user: any; session: any }>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      data: { email, password }
    })
    if (result.data?.access_token) {
      setAccessToken(result.data.access_token)
      Taro.setStorageSync('sb-refresh-token', result.data.refresh_token)
      Taro.setStorageSync('sb-user', JSON.stringify(result.data.user))
    }
    return {
      data: {
        user: result.data?.user,
        session: result.data
      },
      error: result.error
    }
  },

  signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: any } }) => {
    const result = await request<{ access_token: string; refresh_token: string; user: any; session: any }>('/auth/v1/signup', {
      method: 'POST',
      data: { email, password, data: options?.data }
    })
    if (result.data?.access_token) {
      setAccessToken(result.data.access_token)
      Taro.setStorageSync('sb-refresh-token', result.data.refresh_token)
      Taro.setStorageSync('sb-user', JSON.stringify(result.data.user))
    }
    return {
      data: {
        user: result.data?.user,
        session: result.data
      },
      error: result.error
    }
  },

  getUser: async () => {
    try {
      const userStr = Taro.getStorageSync('sb-user')
      if (userStr) {
        const user = JSON.parse(userStr)
        return { data: { user }, error: null }
      }
    } catch {
    }
    return { data: { user: null }, error: null }
  },

  getSession: async () => {
    try {
      const token = getAccessToken()
      const userStr = Taro.getStorageSync('sb-user')
      if (token && userStr) {
        const user = JSON.parse(userStr)
        return {
          data: {
            session: {
              access_token: token,
              user
            }
          },
          error: null
        }
      }
    } catch {
    }
    return { data: { session: null }, error: null }
  },

  updateUser: async ({ password }: { password?: string }) => {
    return await request('/auth/v1/user', {
      method: 'PUT',
      data: password ? { password } : {}
    })
  },

  signOut: async () => {
    setAccessToken(null)
    Taro.removeStorageSync('sb-access-token')
    Taro.removeStorageSync('sb-refresh-token')
    Taro.removeStorageSync('sb-user')
    return { error: null }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    let user: any = null
    try {
      const userStr = Taro.getStorageSync('sb-user')
      if (userStr) {
        user = JSON.parse(userStr)
      }
    } catch {
    }

    if (user) {
      callback('SIGNED_IN', { user })
    } else {
      callback('SIGNED_OUT', null)
    }

    return {
      data: {
        subscription: {
          unsubscribe: () => { }
        }
      }
    }
  }
}

export { SUPABASE_URL, SUPABASE_ANON_KEY }
