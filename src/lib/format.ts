export function krw(n: number | null | undefined): string {
  if (n == null) return '-'
  const abs = Math.abs(Math.round(n))
  const formatted = abs.toLocaleString('ko-KR')
  return n < 0 ? `-${formatted}원` : `${formatted}원`
}

export function krwShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return `${n.toLocaleString()}`
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

export function dateStr(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
