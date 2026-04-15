type CacheItem<T> = {
    data: T
    timestamp: number
    expiry: number
}

type RequestConfig = {
    cacheKey?: string
    cacheTime?: number
    forceRefresh?: boolean
}

const DEFAULT_CACHE_TIME = 5 * 60 * 1000

class DataCache {
    private cache: Map<string, CacheItem<any>> = new Map()
    private pendingRequests: Map<string, Promise<any>> = new Map()

    get<T>(key: string): T | null {
        const item = this.cache.get(key)
        if (!item) return null

        if (Date.now() > item.timestamp + item.expiry) {
            this.cache.delete(key)
            return null
        }

        return item.data as T
    }

    set<T>(key: string, data: T, expiry: number = DEFAULT_CACHE_TIME): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiry
        })
    }

    invalidate(pattern?: string): void {
        if (!pattern) {
            this.cache.clear()
            return
        }

        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key)
            }
        }
    }

    async fetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        config: RequestConfig = {}
    ): Promise<T> {
        const { cacheTime = DEFAULT_CACHE_TIME, forceRefresh = false } = config

        if (!forceRefresh) {
            const cached = this.get<T>(key)
            if (cached !== null) {
                return cached
            }
        }

        const pending = this.pendingRequests.get(key)
        if (pending) {
            return pending as Promise<T>
        }

        const request = fetcher()
            .then(data => {
                this.set(key, data, cacheTime)
                return data
            })
            .finally(() => {
                this.pendingRequests.delete(key)
            })

        this.pendingRequests.set(key, request)
        return request
    }
}

export const dataCache = new DataCache()

export const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timer: NodeJS.Timeout | null = null

    return (...args: Parameters<T>) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

export const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    limit: number
): ((...args: Parameters<T>) => void) => {
    let inThrottle = false

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            fn(...args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}

export const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> => {
    let lastError: Error | null = null

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error as Error
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }

    throw lastError
}

export const CACHE_KEYS = {
    USER_PROFILE: 'user_profile',
    TASKS_LIST: 'tasks_list',
    MY_TASKS: 'my_tasks',
    TASK_DETAIL: 'task_detail',
    CREDIT_HISTORY: 'credit_history'
}

export const CACHE_TIMES = {
    SHORT: 30 * 1000,
    MEDIUM: 2 * 60 * 1000,
    LONG: 5 * 60 * 1000,
    VERY_LONG: 15 * 60 * 1000
}
