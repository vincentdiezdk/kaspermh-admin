/**
 * Danish formatting utilities
 */

const priceFormatter = new Intl.NumberFormat('da-DK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const priceFormatterNoDecimals = new Intl.NumberFormat('da-DK', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('da-DK', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('da-DK', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '–'
  return `${priceFormatter.format(amount)} kr`
}

export function formatPriceShort(amount: number | null | undefined): string {
  if (amount == null) return '–'
  return `${priceFormatterNoDecimals.format(amount)} kr`
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '–'
  return dateFormatter.format(new Date(date))
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return '–'
  // time comes as HH:MM:SS from DB
  const [h, m] = time.split(':')
  return `${h}:${m}`
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '–'
  // Format as +45 XX XX XX XX if it's 8 digits
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 8) {
    return `+45 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`
  }
  return phone
}

export function unitLabel(unit: string): string {
  switch (unit) {
    case 'm2': return 'm²'
    case 'stk': return 'stk'
    case 'time': return 'time'
    case 'fast_pris': return 'fast pris'
    default: return unit
  }
}
