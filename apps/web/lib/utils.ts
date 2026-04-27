import type { Currency } from '@/types'

const CMF_BASE = 'https://api.cmfchile.cl/api-sbifv3/recursos_api'

const CMF_ENDPOINT: Partial<Record<string, string>> = {
  USD: 'dolar',
  JPY: 'yen',
  EUR: 'euro',
  CNH: 'dolar', // CMF no tiene CNH — aproximar con USD
}

export async function getFxRate(moneda: Currency, fecha?: string): Promise<number | null> {
  const endpoint = CMF_ENDPOINT[moneda]
  if (!endpoint) return null

  const dateStr = fecha ?? new Date().toISOString().split('T')[0]
  const [year, month, day] = dateStr.split('-')

  const url = `${CMF_BASE}/${endpoint}/${year}/${month}/${day}?apikey=${process.env.CMF_API_KEY}&formato=json`

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null

    const data = await res.json() as Record<string, Array<{ Valor: string }>>

    const valor =
      data?.Dolares?.[0]?.Valor ??
      data?.Yenes?.[0]?.Valor ??
      data?.Euros?.[0]?.Valor ??
      null

    return valor ? parseFloat(String(valor).replace(',', '.')) : null
  } catch {
    return null
  }
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrency(amount: number, currency: Currency): string {
  const locales: Record<string, string> = {
    USD: 'en-US', JPY: 'ja-JP', EUR: 'es-ES', CNY: 'zh-CN', CNH: 'zh-CN',
  }
  const codes: Record<string, string> = {
    USD: 'USD', JPY: 'JPY', EUR: 'EUR', CNY: 'CNY', CNH: 'CNY',
  }
  return new Intl.NumberFormat(locales[currency] ?? 'en-US', {
    style: 'currency',
    currency: codes[currency] ?? currency,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isUrgent(fechaVencimiento: string | null): boolean {
  if (!fechaVencimiento) return false
  return daysUntil(fechaVencimiento) <= 3
}

export const ESTADO_LABELS: Record<string, string> = {
  INVOICE_RECIBIDO:    'Invoice recibido',
  PAGO_PENDIENTE:      'Pago pendiente',
  PAGO_PARCIAL:        'Pago parcial',
  PAGO_COMPLETO:       'Pago completo',
  EN_ADUANA:           'En aduana',
  PROVISION_RECIBIDA:  'Provisión recibida',
  MERCADERIA_RECIBIDA: 'Mercadería recibida',
  RECONCILIADO:        'Reconciliado',
}

export const ESTADO_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  INVOICE_RECIBIDO:    { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' },
  PAGO_PENDIENTE:      { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  PAGO_PARCIAL:        { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  PAGO_COMPLETO:       { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  EN_ADUANA:           { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  PROVISION_RECIBIDA:  { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  MERCADERIA_RECIBIDA: { bg: '#ECFEFF', color: '#0E7490', border: '#A5F3FC' },
  RECONCILIADO:        { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
}
