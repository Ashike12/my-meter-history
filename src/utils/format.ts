export function isUnavailable(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

export function displayValue(value: unknown, fallback = 'Unavailable'): string {
  return isUnavailable(value) ? fallback : String(value)
}

export function toNumber(value: unknown): number {
  if (isUnavailable(value)) {
    return 0
  }

  const parsed = Number.parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatAmount(value: unknown): string {
  if (isUnavailable(value)) {
    return 'Unavailable'
  }

  const parsed = toNumber(value)
  if (!Number.isFinite(parsed)) {
    return displayValue(value)
  }

  return new Intl.NumberFormat('en-BD', {
    maximumFractionDigits: 2,
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed)
}

export function formatDateTime(value: unknown): string {
  return displayValue(value)
}

export function compactToken(value: unknown): string {
  if (isUnavailable(value)) {
    return 'Unavailable'
  }

  const text = String(value)
  return text.length > 14 ? `${text.slice(0, 6)}...${text.slice(-6)}` : text
}
