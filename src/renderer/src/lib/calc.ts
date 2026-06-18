import type { CostSettings, CostInputs, CostResult } from '../types'

// Defaults — idénticos a la app original (Aa/La en el bundle)
export const DEFAULT_COST_SETTINGS: CostSettings = {
  precioKg: 16000,
  precioKwh: 140,
  consumoW: 120,
  desgasteHoras: 4320,
  precioRepuestos: 150000,
  margenError: 20
}

// Multiplicadores preestablecidos (Ra en el bundle original)
export const MULTIPLIERS = [
  { label: 'Minorista', value: 4 },
  { label: 'Mayorista', value: 3 },
  { label: 'Llaveros', value: 5 }
] as const

/**
 * Fórmula EXACTA de la app original (función `za`):
 *   horas = h + min/60
 *   material   = precioKg/1000 * gramos
 *   luz        = consumoW/1000 * precioKwh * horas
 *   desgaste   = precioRepuestos/desgasteHoras * horas
 *   margenErr  = (material+luz+desgaste) * margenError/100
 *   subtotal   = material+luz+desgaste+margenErr      (precio de fabricación)
 *   totalACobrar = subtotal*multiplicador + insumos
 *   precioML   = subtotal*1.8*multiplicador + insumos
 */
export function calcCost(s: CostSettings, t: CostInputs, multiplicador: number): CostResult {
  const horas = (t.horas || 0) + (t.minutos || 0) / 60
  const precioMaterial = (s.precioKg / 1000) * (t.gramos || 0)
  const precioLuz = (s.consumoW / 1000) * s.precioKwh * horas
  const desgasteMaquina = (s.precioRepuestos / s.desgasteHoras) * horas
  const margenErrorVal = (precioMaterial + precioLuz + desgasteMaquina) * (s.margenError / 100)
  const subtotalSinInsumos = precioMaterial + precioLuz + desgasteMaquina + margenErrorVal
  const totalSinInsumos = subtotalSinInsumos * multiplicador
  return {
    precioMaterial,
    precioLuz,
    desgasteMaquina,
    margenErrorVal,
    subtotalSinInsumos,
    totalSinInsumos,
    totalACobrar: totalSinInsumos + (t.insumos || 0),
    precioML: subtotalSinInsumos * 1.8 * multiplicador + (t.insumos || 0)
  }
}

export function settingsFromMap(map: Record<string, string>): CostSettings {
  const num = (k: string, d: number) => {
    const v = parseFloat(map[k])
    return Number.isFinite(v) ? v : d
  }
  return {
    precioKg: num('calc_precioKg', DEFAULT_COST_SETTINGS.precioKg),
    precioKwh: num('calc_precioKwh', DEFAULT_COST_SETTINGS.precioKwh),
    consumoW: num('calc_consumoW', DEFAULT_COST_SETTINGS.consumoW),
    desgasteHoras: num('calc_desgasteHoras', DEFAULT_COST_SETTINGS.desgasteHoras),
    precioRepuestos: num('calc_precioRepuestos', DEFAULT_COST_SETTINGS.precioRepuestos),
    margenError: num('calc_margenError', DEFAULT_COST_SETTINGS.margenError)
  }
}
