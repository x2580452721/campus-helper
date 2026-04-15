import { calculateDistance } from './distance'

interface DistanceCacheEntry {
  distance: number
  timestamp: number
  prev: string | null
  next: string | null
}

const MAX_CACHE_SIZE = 200
const CACHE_TTL = 10 * 60 * 1000
const KEY_PRECISION = 5

class DistanceCache {
  private cache: Map<string, DistanceCacheEntry> = new Map()
  private head: string | null = null
  private tail: string | null = null

  private getKey(lat1: number, lng1: number, lat2: number, lng2: number): string {
    const lat1F = lat1.toFixed(KEY_PRECISION)
    const lng1F = lng1.toFixed(KEY_PRECISION)
    const lat2F = lat2.toFixed(KEY_PRECISION)
    const lng2F = lng2.toFixed(KEY_PRECISION)

    const key1 = `${lat1F},${lng1F},${lat2F},${lng2F}`
    const key2 = `${lat2F},${lng2F},${lat1F},${lng1F}`
    return key1 < key2 ? key1 : key2
  }

  private isExpired(entry: DistanceCacheEntry): boolean {
    return Date.now() - entry.timestamp > CACHE_TTL
  }

  private moveToHead(key: string): void {
    if (this.head === key) return

    const entry = this.cache.get(key)
    if (!entry) return

    if (entry.prev !== null) {
      const prevEntry = this.cache.get(entry.prev)
      if (prevEntry) prevEntry.next = entry.next
    }

    if (entry.next !== null) {
      const nextEntry = this.cache.get(entry.next)
      if (nextEntry) nextEntry.prev = entry.prev
    }

    if (this.tail === key) {
      this.tail = entry.prev
    }

    entry.prev = null
    entry.next = this.head

    if (this.head !== null) {
      const headEntry = this.cache.get(this.head)
      if (headEntry) headEntry.prev = key
    }

    this.head = key

    if (this.tail === null) {
      this.tail = key
    }
  }

  private evictTail(): void {
    if (this.tail === null) return

    const tailKey = this.tail
    const tailEntry = this.cache.get(tailKey)

    if (tailEntry && tailEntry.prev !== null) {
      const newTail = tailEntry.prev
      const newTailEntry = this.cache.get(newTail)
      if (newTailEntry) newTailEntry.next = null
      this.tail = newTail
    } else {
      this.head = null
      this.tail = null
    }

    this.cache.delete(tailKey)
  }

  get(lat1: number, lng1: number, lat2: number, lng2: number): number | null {
    const key = this.getKey(lat1, lng1, lat2, lng2)
    const entry = this.cache.get(key)

    if (!entry) return null

    if (this.isExpired(entry)) {
      if (entry.prev !== null) {
        const prevEntry = this.cache.get(entry.prev)
        if (prevEntry) prevEntry.next = entry.next
      }
      if (entry.next !== null) {
        const nextEntry = this.cache.get(entry.next)
        if (nextEntry) nextEntry.prev = entry.prev
      }
      if (this.head === key) this.head = entry.next
      if (this.tail === key) this.tail = entry.prev
      this.cache.delete(key)
      return null
    }

    this.moveToHead(key)
    return entry.distance
  }

  set(lat1: number, lng1: number, lat2: number, lng2: number, distance: number): void {
    const key = this.getKey(lat1, lng1, lat2, lng2)

    if (this.cache.has(key)) {
      const entry = this.cache.get(key)
      if (entry) {
        entry.distance = distance
        entry.timestamp = Date.now()
        this.moveToHead(key)
      }
      return
    }

    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictTail()
    }

    this.cache.set(key, {
      distance,
      timestamp: Date.now(),
      prev: null,
      next: this.head
    })

    if (this.head !== null) {
      const headEntry = this.cache.get(this.head)
      if (headEntry) headEntry.prev = key
    }

    this.head = key

    if (this.tail === null) {
      this.tail = key
    }
  }

  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
  }

  get size(): number {
    return this.cache.size
  }
}

const distanceCache = new DistanceCache()

export function calculateDistanceCached(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const cached = distanceCache.get(lat1, lng1, lat2, lng2)
  if (cached !== null) {
    return cached
  }

  const distance = calculateDistance(lat1, lng1, lat2, lng2)
  distanceCache.set(lat1, lng1, lat2, lng2, distance)
  return distance
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  let lastArgs: Parameters<T> | null = null

  const later = () => {
    timeout = null
    if (lastArgs) {
      func(...lastArgs)
      lastArgs = null
    }
  }

  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = window.setTimeout(later, wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastArgs: Parameters<T> | null = null

  const trailing = () => {
    if (lastArgs) {
      func(...lastArgs)
      lastArgs = null
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
        if (lastArgs) trailing()
      }, limit)
    } else {
      inThrottle = false
    }
  }

  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args
    if (!inThrottle) {
      func(...args)
      lastArgs = null
      inThrottle = true
      setTimeout(trailing, limit)
    }
  }
}

export function sortByDistance<T extends { distance?: number }>(arr: T[]): T[] {
  return arr.slice().sort((a, b) => {
    const distA = a.distance ?? Infinity
    const distB = b.distance ?? Infinity
    return distA - distB
  })
}

export function clearDistanceCache(): void {
  distanceCache.clear()
}

export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: distanceCache.size,
    maxSize: MAX_CACHE_SIZE
  }
}

export function createMemoizer<K extends string, V>(maxSize: number = 100) {
  const cache = new Map<K, V>()
  const keys: K[] = []

  return {
    get: (key: K): V | undefined => cache.get(key),
    set: (key: K, value: V): void => {
      if (cache.has(key)) {
        const index = keys.indexOf(key)
        if (index > -1) keys.splice(index, 1)
      } else if (cache.size >= maxSize) {
        const oldestKey = keys.shift()
        if (oldestKey !== undefined) cache.delete(oldestKey)
      }
      cache.set(key, value)
      keys.push(key)
    },
    clear: (): void => {
      cache.clear()
      keys.length = 0
    },
    size: () => cache.size
  }
}

export function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => R,
  batchSize: number = 50
): R[] {
  const results: R[] = []
  const len = items.length

  for (let i = 0; i < len; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    for (const item of batch) {
      results.push(processor(item))
    }
  }

  return results
}

export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now()
  try {
    return fn()
  } finally {
    const end = performance.now()
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`)
  }
}
