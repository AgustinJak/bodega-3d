export function formatARS(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0,00'
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatInt(n: number | null | undefined): string {
  if (n == null) return '0'
  return n.toLocaleString('es-AR')
}

export function formatPrintTime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h <= 0) return `${m}min`
  return `${h}h ${m}min`
}

export function formatGrams(g: number | null | undefined): string {
  if (g == null || !Number.isFinite(g)) return '—'
  return `${g.toLocaleString('es-AR', { maximumFractionDigits: 1 })} g`
}
