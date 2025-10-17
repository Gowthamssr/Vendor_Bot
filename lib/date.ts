// Utility to parse various date formats and Excel serials to YYYY-MM-DD
import { parse } from 'date-fns'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime())
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function fromExcelSerial(serial: number): Date {
  // Excel epoch: 1899-12-30 (accounts for Excel's 1900 leap year bug)
  const excelEpoch = new Date(Date.UTC(1899, 11, 30)).getTime()
  return new Date(excelEpoch + serial * MS_PER_DAY)
}

export function parseToYMD(input: unknown): string | null {
  if (input == null) return null

  // If already a Date
  if (input instanceof Date) {
    if (!isValidDate(input)) return null
    return input.toISOString().split('T')[0]
  }

  // If number → treat as Excel serial
  if (typeof input === 'number') {
    const asDate = fromExcelSerial(input)
    if (!isValidDate(asDate)) return null
    return asDate.toISOString().split('T')[0]
  }

  // If string → try multiple formats
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return null

    const lower = trimmed.toLowerCase()
    if (lower === 'today') {
      const d = new Date()
      return d.toISOString().split('T')[0]
    }
    if (lower === 'yesterday') {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    }

    // Quick pass: native Date for fully qualified formats
    const native = new Date(trimmed)
    if (isValidDate(native)) {
      return native.toISOString().split('T')[0]
    }

    // Try explicit patterns (no timezone assumed). Order matters.
    const patterns = [
      'yyyy-MM-dd',
      'dd-MM-yyyy',
      'MM-dd-yyyy',
      'dd/MM/yyyy',
      'MM/dd/yyyy',
      'dd.MM.yyyy',
      'yyyy/MM/dd',
      'yyyy.MM.dd'
    ]

    for (const pattern of patterns) {
      const d = parse(trimmed, pattern, new Date())
      if (isValidDate(d)) {
        // Construct date in UTC yyyy-mm-dd to avoid timezone shifts
        const y = d.getFullYear()
        const m = pad2(d.getMonth() + 1)
        const day = pad2(d.getDate())
        return `${y}-${m}-${day}`
      }
    }
  }

  return null
}

export function getTodayYmdInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')?.value || '0000'
  const m = parts.find(p => p.type === 'month')?.value || '01'
  const d = parts.find(p => p.type === 'day')?.value || '01'
  return `${y}-${m}-${d}`
}

export function getRelativeYmdInTimeZone(offsetDays: number, timeZone: string): string {
  // Get now in the target TZ by formatting and parsing back to Date midnight
  const todayYmd = getTodayYmdInTimeZone(timeZone)
  const [y, m, d] = todayYmd.split('-').map(Number)
  const local = new Date(Date.UTC(y, (m - 1), d))
  local.setUTCDate(local.getUTCDate() + offsetDays)
  const y2 = local.getUTCFullYear()
  const m2 = pad2(local.getUTCMonth() + 1)
  const d2 = pad2(local.getUTCDate())
  return `${y2}-${m2}-${d2}`
}


