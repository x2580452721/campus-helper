type CoordinateValue = number | string | null | undefined

export interface CoordinateInput {
  latitude?: CoordinateValue
  longitude?: CoordinateValue
  lat?: CoordinateValue
  lng?: CoordinateValue
}

export interface NormalizedCoordinate {
  latitude: number
  longitude: number
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() === '') {
    return null
  }

  const num = typeof value === 'string' ? Number(value) : value
  return typeof num === 'number' && Number.isFinite(num) ? num : null
}

function isValidLatitude(value: number) {
  return value >= -90 && value <= 90
}

function isValidLongitude(value: number) {
  return value >= -180 && value <= 180
}

export function normalizeCoordinate<T extends CoordinateInput>(point: T | null | undefined): (T & NormalizedCoordinate) | null {
  if (!point) return null

  const latitude = toFiniteNumber(point.latitude ?? point.lat)
  const longitude = toFiniteNumber(point.longitude ?? point.lng)

  if (latitude === null || longitude === null) {
    return null
  }

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null
  }

  return {
    ...point,
    latitude,
    longitude
  }
}

export function sanitizeLocationList<T extends CoordinateInput>(items: T[] | null | undefined, label: string): Array<T & NormalizedCoordinate> {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      const normalized = normalizeCoordinate(item)
      if (!normalized) {
        console.warn(`[mapData] 过滤非法${label}:`, item)
      }
      return normalized
    })
    .filter((item): item is T & NormalizedCoordinate => Boolean(item))
}
