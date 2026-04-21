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

export const ESTADO_COLORS: Record<string, string> = {
  INVOICE_RECIBIDO:    'bg-gray-100 text-gray-700',
  PAGO_PENDIENTE:      'bg-yellow-100 text-yellow-800',
  PAGO_PARCIAL:        'bg-blue-100 text-blue-800',
  PAGO_COMPLETO:       'bg-blue-200 text-blue-900',
  EN_ADUANA:           'bg-purple-100 text-purple-800',
  PROVISION_RECIBIDA:  'bg-orange-100 text-orange-800',
  MERCADERIA_RECIBIDA: 'bg-teal-100 text-teal-800',
  RECONCILIADO:        'bg-green-100 text-green-800',
}
