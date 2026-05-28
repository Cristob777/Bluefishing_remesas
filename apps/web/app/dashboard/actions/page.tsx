'use client'

import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { AgentStrip, PageHeader } from '@/components/dashboard/Kit'
import {
  type PendingAction,
  type InstruccionPagoAction,
  type EmitirOrdenPagoAction,
  type ConfirmarPagoBancarioAction,
  type ConfirmarProvisionAction,
  type IngresarStockAction,
  type ReclamoProveedorAction,
  type VincularDespachoAction,
  type AprobarOperacionAction,
  type RegistrarNotaAgensaAction,
  type ArchivarExpedienteAction,
} from '@/types/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}
function fmtAmt(n: number, moneda: string) {
  if (moneda === 'CLP') return fmtCLP(n)
  const dec = moneda === 'JPY' ? 0 : 2
  return `${moneda} ${n.toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
}
function todayStr() { return new Date().toISOString().split('T')[0] }

// ── Action meta ───────────────────────────────────────────────────────────────

const META: Record<string, { icon: string; iconBg: string; color: string; border: string; label: string; stage: string }> = {
  INSTRUCCION_PAGO:      { icon: 'IP', iconBg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'Instrucción de pago', stage: 'I'   },
  EMITIR_ORDEN_PAGO:     { icon: 'OP', iconBg: '#F0FDF4', color: '#059669', border: '#A7F3D0', label: 'Orden de pago',       stage: 'II'  },
  CONFIRMAR_PAGO_BANCARIO:{ icon: 'PB', iconBg: '#ECFDF5', color: '#047857', border: '#6EE7B7', label: 'Confirmación banco', stage: 'II' },
  CONFIRMAR_PROVISION:   { icon: 'PA', iconBg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Provisión aduanera',  stage: 'III' },
  INGRESAR_STOCK:        { icon: 'ST', iconBg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', label: 'Ingreso de stock',    stage: 'IV'  },
  RECLAMO_PROVEEDOR:     { icon: 'RP', iconBg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: 'Reclamo a proveedor', stage: 'IV'  },
  VINCULAR_DESPACHO:     { icon: 'VD', iconBg: '#EEF2FF', color: '#4F46E5', border: '#C7D2FE', label: 'Vincular despacho',   stage: 'I-II'},
  APROBAR_OPERACION:     { icon: 'AP', iconBg: '#FFF7ED', color: '#C2410C', border: '#FDBA74', label: 'Aprobación ≥5M CLP',  stage: 'V'   },
  REGISTRAR_NOTA_AGENSA: { icon: 'NA', iconBg: '#FFF7ED', color: '#C2410C', border: '#FDBA74', label: 'Nota AGENSA',         stage: 'V'   },
  ARCHIVAR_EXPEDIENTE:   { icon: 'AR', iconBg: '#F9FAFB', color: '#374151', border: '#D1D5DB', label: 'Archivar expediente',stage: 'V'  },
}

// ── Shared: invoice detail row ────────────────────────────────────────────────

function DetailRow({ items }: { items: Array<{ label: string; value: string; highlight?: boolean }> }) {
  return (
    <div className="grid gap-3 rounded-xl p-4"
         style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
      {items.map(i => (
        <div key={i.label}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>{i.label}</p>
          <p className="text-xs font-bold" style={{ color: i.highlight ? '#2563EB' : '#374151' }}>{i.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Condition presets ─────────────────────────────────────────────────────────

const PRESETS = [
  { label: '30/70', anticipo: 30 },
  { label: '50/50', anticipo: 50 },
  { label: '100%',  anticipo: 100 },
  { label: 'Personalizado', anticipo: null },
]

// ── Form 1: Instrucción de pago ───────────────────────────────────────────────

function InstruccionPagoForm({ action, onSubmit }: { action: InstruccionPagoAction; onSubmit: (d: unknown) => void }) {
  const [preset, setPreset]       = useState<string | null>(null)
  const [customPct, setCustomPct] = useState(40)
  const [notas, setNotas]         = useState('')

  const pct        = preset === 'Personalizado' ? customPct : PRESETS.find(p => p.label === preset)?.anticipo ?? null
  const saldoPct   = pct !== null ? 100 - pct : null
  const mAnticipo  = pct !== null ? action.monto_original * pct / 100 : null
  const mSaldo     = saldoPct !== null && saldoPct > 0 ? action.monto_original * saldoPct / 100 : null
  const condicion  = preset === 'Personalizado' && pct !== null ? `${pct}/${100 - pct}` : preset ?? ''

  return (
    <div className="space-y-4 pt-4">
      <DetailRow items={[
        { label: 'Proveedor', value: action.proveedor },
        { label: 'Factura',   value: action.invoice },
        { label: 'Monto total', value: fmtAmt(action.monto_original, action.moneda), highlight: true },
      ]} />

      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#374151' }}>Condición de pago</p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setPreset(p.label)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
              style={preset === p.label
                ? { background: '#2563EB', color: '#FFF', border: '2px solid #2563EB' }
                : { background: '#FFF', color: '#374151', border: '2px solid #E5E7EB' }}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'Personalizado' && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Anticipo</span>
            <input type="number" min={1} max={99} value={customPct}
              onChange={e => setCustomPct(Math.min(99, Math.max(1, Number(e.target.value))))}
              className="w-20 px-3 py-1.5 rounded-lg text-sm font-mono border focus:outline-none"
              style={{ borderColor: '#D1D5DB', color: '#111827' }} />
            <span className="text-xs font-bold" style={{ color: '#2563EB' }}>%</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Saldo: {100 - customPct}%</span>
          </div>
        )}
        {pct !== null && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex items-center px-4 py-3" style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE' }}>
              <span className="text-xs font-bold" style={{ color: '#2563EB' }}>{pct === 100 ? 'Pago único' : `Anticipo ${pct}%`}</span>
              <span className="ml-auto text-sm font-bold mono" style={{ color: '#2563EB' }}>{mAnticipo !== null ? fmtAmt(mAnticipo, action.moneda) : '—'}</span>
            </div>
            {mSaldo !== null && saldoPct !== null && saldoPct > 0 && (
              <div className="flex items-center px-4 py-3" style={{ background: '#F9FAFB' }}>
                <span className="text-xs font-bold" style={{ color: '#6B7280' }}>Saldo {saldoPct}%</span>
                <span className="ml-auto text-sm font-bold mono" style={{ color: '#374151' }}>{fmtAmt(mSaldo, action.moneda)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Notas para Finanzas</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Banco destino, urgencia, instrucciones adicionales..."
          className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border resize-none focus:outline-none"
          style={{ borderColor: '#D1D5DB', color: '#111827' }} />
      </div>

      <button onClick={() => onSubmit({ condicion, anticipo_pct: pct, monto_anticipo: mAnticipo, monto_saldo: mSaldo, moneda: action.moneda, notas, remesa_id: action.remesa_id })}
        disabled={!preset}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: preset ? 'linear-gradient(135deg, #059669, #047857)' : '#9CA3AF' }}>
        Enviar a Finanzas →
      </button>
    </div>
  )
}

// ── Form 2: Emitir orden de pago ──────────────────────────────────────────────

function EmitirOrdenPagoForm({ action, onSubmit }: { action: EmitirOrdenPagoAction; onSubmit: (d: unknown) => void }) {
  const [numeroOrden, setNumeroOrden]   = useState('')
  const [fechaEmision, setFechaEmision] = useState(todayStr())

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        <div className="px-4 py-3" style={{ background: '#F0FDF4', borderBottom: '1px solid #D1FAE5' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#059669' }}>Instrucción del dueño</p>
          <p className="text-xs" style={{ color: '#374151' }}>{action.instruccion_notas}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 py-3" style={{ background: '#F9FAFB' }}>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Tipo</p><p className="text-xs font-bold" style={{ color: '#374151' }}>{action.tipo_pago} ({action.condicion_pago})</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Factura</p><p className="text-xs font-mono font-bold" style={{ color: '#374151' }}>{action.invoice}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Monto</p><p className="text-sm font-bold" style={{ color: '#059669' }}>{fmtAmt(action.monto_pago, action.moneda)}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>N° Orden de pago (banco)</label>
          <input type="text" value={numeroOrden} onChange={e => setNumeroOrden(e.target.value)} placeholder="Ej: OP-2026-0441"
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border font-mono focus:outline-none"
            style={{ borderColor: '#D1D5DB', color: '#111827' }} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Fecha de emisión</label>
          <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
            style={{ borderColor: '#D1D5DB', color: '#111827' }} />
        </div>
      </div>

      <button onClick={() => onSubmit({ pago_id: action.pago_id, remesa_id: action.remesa_id, numero_orden: numeroOrden, fecha_emision: fechaEmision })}
        disabled={!numeroOrden.trim() || !fechaEmision}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: (numeroOrden && fechaEmision) ? 'linear-gradient(135deg, #059669, #047857)' : '#9CA3AF' }}>
        Confirmar emisión al banco →
      </button>
    </div>
  )
}

// ── Form 3: Confirmar pago bancario (SWIFT) ───────────────────────────────────

function ConfirmarPagoBancarioForm({ action, onSubmit }: { action: ConfirmarPagoBancarioAction; onSubmit: (d: unknown) => void }) {
  const [swift, setSwift]               = useState('')
  const [fechaConfirm, setFechaConfirm] = useState(todayStr())

  return (
    <div className="space-y-4 pt-4">
      <DetailRow items={[
        { label: 'Proveedor',    value: action.proveedor },
        { label: 'Tipo / Orden', value: `${action.tipo_pago} — ${action.numero_orden}` },
        { label: 'Monto pagado', value: fmtAmt(action.monto_pago, action.moneda), highlight: true },
      ]} />

      <div className="rounded-xl p-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
        <p className="text-xs" style={{ color: '#065F46' }}>
          La <strong>fecha de confirmación del banco</strong> es la que se usa para calcular el tipo de cambio FX. Ingresa la fecha real en que el banco acreditó el pago, no la fecha de emisión de la orden.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Referencia SWIFT / N° confirmación</label>
          <input type="text" value={swift} onChange={e => setSwift(e.target.value)} placeholder="Ej: SWIFT-20260422-001"
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border font-mono focus:outline-none"
            style={{ borderColor: '#D1D5DB', color: '#111827' }} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Fecha real de confirmación</label>
          <input type="date" value={fechaConfirm} onChange={e => setFechaConfirm(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
            style={{ borderColor: '#D1D5DB', color: '#111827' }} />
        </div>
      </div>

      <button onClick={() => onSubmit({ pago_id: action.pago_id, remesa_id: action.remesa_id, referencia_swift: swift, fecha_confirmacion: fechaConfirm })}
        disabled={!swift.trim() || !fechaConfirm}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: (swift && fechaConfirm) ? 'linear-gradient(135deg, #047857, #065F46)' : '#9CA3AF' }}>
        Confirmar pago ejecutado — FX fecha {fechaConfirm || '—'} →
      </button>
    </div>
  )
}

// ── Form 4: Confirmar provisión AGENSA ───────────────────────────────────────

function ConfirmarProvisionForm({ action, onSubmit }: { action: ConfirmarProvisionAction; onSubmit: (d: unknown) => void }) {
  const [fechaPago, setFechaPago] = useState(todayStr())
  const isUrgent = action.dias_restantes <= 3

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isUrgent ? '#FECACA' : '#E5E7EB'}` }}>
        <div className="grid grid-cols-3 gap-3 px-4 py-4" style={{ background: isUrgent ? '#FEF2F2' : '#F9FAFB' }}>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Despacho</p><p className="text-xs font-mono font-bold" style={{ color: '#374151' }}>{action.numero_despacho}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Monto a pagar</p><p className="text-sm font-bold" style={{ color: isUrgent ? '#DC2626' : '#111827' }}>{fmtCLP(action.monto_clp)}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Vencimiento</p><p className="text-xs font-bold" style={{ color: isUrgent ? '#DC2626' : '#374151' }}>{new Date(action.fecha_vencimiento).toLocaleDateString('es-CL')} <span style={{ color: '#9CA3AF' }}>({action.dias_restantes}d)</span></p></div>
        </div>
      </div>

      {/* IVA Chile 19% breakdown */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        <div className="px-4 py-2.5" style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            Desglose estimado — IVA Art. 46 DL 825
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x" style={{ borderColor: '#E5E7EB' }}>
          {[
            { label: 'Base + aranceles', value: fmtCLP(Math.round(action.monto_clp / 1.19)) },
            { label: 'IVA importación 19%', value: fmtCLP(action.monto_clp - Math.round(action.monto_clp / 1.19)) },
            { label: 'Total a pagar', value: fmtCLP(action.monto_clp) },
          ].map(row => (
            <div key={row.label} className="px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>{row.label}</p>
              <p className="text-xs font-bold mono" style={{ color: '#374151' }}>{row.value}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-2" style={{ background: '#FFFBEB', borderTop: '1px solid #FDE68A' }}>
          <p className="text-[10px]" style={{ color: '#92400E' }}>
            El monto incluye derechos de aduana, IVA importación (19%) y honorarios de agencia. El desglose exacto estará en el DIN.
          </p>
        </div>
      </div>

      {/* Cuentas bancarias de la agencia */}
      {action.cuentas_agencia && (
        <div className="rounded-xl p-3" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
            Cuentas — {action.nombre_agencia ?? 'Agencia de Aduanas'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {action.cuentas_agencia.split('/').map(c => c.trim()).filter(Boolean).map(c => (
              <span key={c} className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#E5E7EB', color: '#374151' }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Fecha en que se realizó el pago</label>
        <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
          className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
          style={{ borderColor: '#D1D5DB', color: '#111827' }} />
      </div>

      <button onClick={() => onSubmit({ provision_id: action.provision_id, fecha_pago: fechaPago })}
        disabled={!fechaPago}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: fechaPago ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : '#9CA3AF' }}>
        Confirmar pago de aduana →
      </button>
    </div>
  )
}

// ── Form 5: Ingresar stock ────────────────────────────────────────────────────

function IngresarStockForm({ action, onSubmit }: { action: IngresarStockAction; onSubmit: (d: unknown) => void }) {
  const [quantities, setQuantities] = useState<Record<string, number | ''>>({})
  const allFilled = action.skus.every(s => quantities[s.id] !== undefined && quantities[s.id] !== '')

  function diff(sku: (typeof action.skus)[0]) {
    const q = quantities[sku.id]
    if (q === '' || q === undefined) return null
    return (q as number) - sku.cantidad_invoice
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        <div className="grid text-[10px] font-bold uppercase tracking-wider px-4 py-2"
             style={{ gridTemplateColumns: '90px 1fr 80px 90px 55px', background: '#F9FAFB', color: '#9CA3AF', borderBottom: '1px solid #E5E7EB' }}>
          <span>SKU</span><span>Descripción</span><span className="text-right">Inv.</span><span className="text-right">Recibido</span><span className="text-right">Dif.</span>
        </div>
        {action.skus.map((sku, i) => {
          const d = diff(sku)
          const dc = d === null ? '#9CA3AF' : d === 0 ? '#059669' : d < 0 ? '#DC2626' : '#D97706'
          return (
            <div key={sku.id} className="grid items-center px-4 py-3"
                 style={{ gridTemplateColumns: '90px 1fr 80px 90px 55px', borderBottom: i < action.skus.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <span className="text-xs font-mono font-bold" style={{ color: '#374151' }}>{sku.sku}</span>
              <span className="text-xs pr-3" style={{ color: '#6B7280' }}>{sku.descripcion}</span>
              <span className="text-xs font-mono text-right" style={{ color: '#9CA3AF' }}>{sku.cantidad_invoice}</span>
              <div className="flex justify-end">
                <input type="number" min={0} value={quantities[sku.id] ?? ''} placeholder="—"
                  onChange={e => setQuantities(prev => ({ ...prev, [sku.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-20 px-2 py-1 rounded-lg text-xs font-mono text-right border focus:outline-none"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }} />
              </div>
              <span className="text-xs font-bold mono text-right" style={{ color: dc }}>
                {d === null ? '—' : d === 0 ? '✓' : d > 0 ? `+${d}` : String(d)}
              </span>
            </div>
          )
        })}
      </div>

      {!allFilled && <p className="text-xs" style={{ color: '#9CA3AF' }}>Ingresa la cantidad recibida para todos los SKUs.</p>}

      <button onClick={() => onSubmit({ recepcion_id: action.recepcion_id, remesa_id: action.remesa_id, quantities })}
        disabled={!allFilled}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: allFilled ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#9CA3AF' }}>
        Confirmar ingreso a Bsale →
      </button>
    </div>
  )
}

// ── Form 6: Reclamo proveedor ─────────────────────────────────────────────────

function ReclamoProveedorForm({ action, onSubmit }: { action: ReclamoProveedorAction; onSubmit: (d: unknown) => void }) {
  const [texto, setTexto] = useState('')

  const soloDiferencias = action.diferencias.filter(d => d.diferencia !== 0)

  const defaultText = `Estimado proveedor,\n\nEn relación al invoice ${action.invoice}, hemos detectado las siguientes diferencias en la mercadería recibida:\n\n${soloDiferencias.map(d => `- ${d.sku} (${d.descripcion}): facturado ${d.cantidad_invoice} unidades, recibido ${d.cantidad_recibida} (diferencia: ${d.diferencia})`).join('\n')}\n\nSolicitamos gestionar el envío del faltante o la nota de crédito correspondiente.\n\nSaludos,\nSebastian Cáceres — BLUEFISHING.CL`

  return (
    <div className="space-y-4 pt-4">
      {/* Differences table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #FDE68A' }}>
        <div className="grid text-[10px] font-bold uppercase tracking-wider px-4 py-2"
             style={{ gridTemplateColumns: '80px 1fr 70px 70px 60px', background: '#FFFBEB', color: '#9CA3AF', borderBottom: '1px solid #FDE68A' }}>
          <span>SKU</span><span>Descripción</span><span className="text-right">Invoice</span><span className="text-right">Recibido</span><span className="text-right">Dif.</span>
        </div>
        {action.diferencias.map((d, i) => (
          <div key={d.sku} className="grid items-center px-4 py-2.5"
               style={{ gridTemplateColumns: '80px 1fr 70px 70px 60px', borderBottom: i < action.diferencias.length - 1 ? '1px solid #FEF3C7' : 'none', background: d.diferencia !== 0 ? '#FFFBEB' : '#FFF' }}>
            <span className="text-xs font-mono font-bold" style={{ color: '#374151' }}>{d.sku}</span>
            <span className="text-xs pr-3" style={{ color: '#6B7280' }}>{d.descripcion}</span>
            <span className="text-xs mono text-right" style={{ color: '#9CA3AF' }}>{d.cantidad_invoice}</span>
            <span className="text-xs mono text-right" style={{ color: '#374151' }}>{d.cantidad_recibida}</span>
            <span className="text-xs font-bold mono text-right" style={{ color: d.diferencia < 0 ? '#DC2626' : d.diferencia > 0 ? '#D97706' : '#059669' }}>
              {d.diferencia === 0 ? '✓' : d.diferencia > 0 ? `+${d.diferencia}` : String(d.diferencia)}
            </span>
          </div>
        ))}
      </div>

      {action.contacto_email && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6B7280' }}>Destinatario:</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>{action.contacto_email}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Texto del reclamo</label>
          <button onClick={() => setTexto(defaultText)} className="text-xs font-medium" style={{ color: '#2563EB' }}>
            Usar plantilla →
          </button>
        </div>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={6} placeholder="Redacta el reclamo al proveedor..."
          className="w-full px-3 py-2.5 rounded-xl text-xs border resize-none focus:outline-none font-mono"
          style={{ borderColor: '#D1D5DB', color: '#374151', lineHeight: '1.6' }} />
      </div>

      <button onClick={() => onSubmit({
        remesa_id: action.remesa_id,
        invoice: action.invoice,
        proveedor: action.proveedor,
        texto_reclamo: texto,
        diferencias: action.diferencias.map(d => ({
          sku: d.sku,
          esperado: d.cantidad_invoice,
          recibido: d.cantidad_recibida,
        })),
      })}
        disabled={!texto.trim()}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: texto.trim() ? 'linear-gradient(135deg, #B45309, #92400E)' : '#9CA3AF' }}>
        Registrar reclamo →
      </button>
    </div>
  )
}

// ── Form 7: Vincular despacho ─────────────────────────────────────────────────

function VincularDespachoForm({ action, onSubmit }: { action: VincularDespachoAction; onSubmit: (d: unknown) => void }) {
  const [despacho, setDespacho]         = useState('')
  const [fechaLlegada, setFechaLlegada] = useState('')

  const formatHint = /^DSP-\d{2}-\d{4,}$/i.test(despacho.trim())

  return (
    <div className="space-y-4 pt-4">
      <DetailRow items={[
        { label: 'Proveedor',       value: action.proveedor },
        { label: 'Factura',         value: action.invoice },
        { label: 'Monto / Moneda',  value: fmtAmt(action.monto_original, action.moneda) },
        { label: 'Fecha factura',   value: new Date(action.fecha_invoice).toLocaleDateString('es-CL') },
      ]} />

      <div className="rounded-xl p-3" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
        <p className="text-xs" style={{ color: '#3730A3' }}>
          El número de despacho es asignado por la agencia de aduanas cuando inicia el proceso. Este número vincula la factura con las provisiones de fondos y el DIN futuro.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>
            N° de despacho
            {despacho && !formatHint && <span className="ml-2 normal-case font-normal" style={{ color: '#DC2626' }}>— use DSP-26-XXXX</span>}
          </label>
          <input type="text" value={despacho} onChange={e => setDespacho(e.target.value.toUpperCase())} placeholder="DSP-26-0042"
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border font-mono focus:outline-none"
            style={{ borderColor: despacho && !formatHint ? '#FECACA' : '#D1D5DB', color: '#111827' }} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Fecha estimada llegada (opcional)</label>
          <input type="date" value={fechaLlegada} onChange={e => setFechaLlegada(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
            style={{ borderColor: '#D1D5DB', color: '#111827' }} />
        </div>
      </div>

      <button onClick={() => onSubmit({ remesa_id: action.remesa_id, numero_despacho: despacho, fecha_estimada_llegada: fechaLlegada || undefined })}
        disabled={!formatHint}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: formatHint ? 'linear-gradient(135deg, #4F46E5, #4338CA)' : '#9CA3AF' }}>
        Vincular despacho {despacho || '—'} →
      </button>
    </div>
  )
}

// ── Form 8: Aprobar operación >5M ─────────────────────────────────────────────

function AprobarOperacionForm({ action, onSubmit }: { action: AprobarOperacionAction; onSubmit: (d: unknown) => void }) {
  const [decision, setDecision] = useState<'aprobado' | 'rechazado' | null>(null)
  const [notas, setNotas]       = useState('')

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #FDBA74' }}>
        <div className="px-4 py-3" style={{ background: '#FFF7ED', borderBottom: '1px solid #FDBA74' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C2410C' }}>Requiere aprobación gerencia — supera CLP $5.000.000</p>
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 py-3" style={{ background: '#F9FAFB' }}>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Proveedor</p><p className="text-xs font-semibold" style={{ color: '#111827' }}>{action.proveedor}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Monto origen</p><p className="text-sm font-bold" style={{ color: '#374151' }}>{fmtAmt(action.monto_original, action.moneda)}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Estimado CLP</p><p className="text-sm font-bold" style={{ color: '#C2410C' }}>{action.monto_clp_estimado > 0 ? fmtCLP(action.monto_clp_estimado) : '—'}</p></div>
        </div>
      </div>

      {/* Numra-style: agent reasoning context */}
      {action.agent_reasoning && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <Sparkles size={14} strokeWidth={1.75} style={{ color: '#0891B2' }} />
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Por qué el agente flaggeó esta operación</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>{action.agent_reasoning}</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#374151' }}>Decisión</p>
        <div className="flex gap-3">
          <button onClick={() => setDecision('aprobado')} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={decision === 'aprobado' ? { background: '#059669', color: '#FFF', border: '2px solid #059669' } : { background: '#FFF', color: '#059669', border: '2px solid #A7F3D0' }}>
            Aprobar
          </button>
          <button onClick={() => setDecision('rechazado')} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={decision === 'rechazado' ? { background: '#DC2626', color: '#FFF', border: '2px solid #DC2626' } : { background: '#FFF', color: '#DC2626', border: '2px solid #FECACA' }}>
            Rechazar
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Comentario (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Motivo..."
          className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border resize-none focus:outline-none"
          style={{ borderColor: '#D1D5DB', color: '#111827' }} />
      </div>

      <button onClick={() => onSubmit({ remesa_id: action.remesa_id, decision, notas })} disabled={!decision}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: !decision ? '#9CA3AF' : decision === 'aprobado' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #DC2626, #B91C1C)' }}>
        {!decision ? 'Selecciona una decisión' : decision === 'aprobado' ? 'Confirmar aprobación →' : 'Confirmar rechazo →'}
      </button>
    </div>
  )
}

// ── Form 10: Nota débito/crédito AGENSA ──────────────────────────────────────

function RegistrarNotaAgensaForm({ action, onSubmit }: { action: RegistrarNotaAgensaAction; onSubmit: (d: unknown) => void }) {
  const [tipoNota, setTipoNota] = useState<'NOTA_CREDITO' | 'NOTA_DEBITO'>('NOTA_CREDITO')
  const [numeroNota, setNumeroNota] = useState('')
  const [montoClp, setMontoClp] = useState(action.saldo_favor_clp || '')
  const [fechaEmision, setFechaEmision] = useState(todayStr())
  const [modalidad, setModalidad] = useState<'DEVOLUCION' | 'CREDITO_PROXIMA_PROVISION' | 'COMPENSACION' | 'OTRO'>('CREDITO_PROXIMA_PROVISION')
  const [notas, setNotas] = useState('')

  const provision = action.provision_pagada_clp
  const costo = action.costo_real_clp
  const saldo = action.saldo_favor_clp || Math.max(provision - costo, 0)
  const amount = Number(montoClp)

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #FDBA74' }}>
        <div className="px-4 py-3" style={{ background: '#FFF7ED', borderBottom: '1px solid #FDBA74' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C2410C' }}>
            Excedente AGENSA a favor de Bluefishing
          </p>
          <p className="text-xs mt-1" style={{ color: '#7C2D12' }}>
            Registra la nota de crédito/débito o devolución para dejar la remesa lista para archivo.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 py-3" style={{ background: '#F9FAFB' }}>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Provisión pagada</p><p className="text-sm font-bold mono" style={{ color: '#374151' }}>{fmtCLP(provision)}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Costo DIN</p><p className="text-sm font-bold mono" style={{ color: '#374151' }}>{fmtCLP(costo)}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Saldo a favor</p><p className="text-sm font-bold mono" style={{ color: '#C2410C' }}>{fmtCLP(saldo)}</p></div>
        </div>
      </div>

      <DetailRow items={[
        { label: 'Proveedor', value: action.proveedor },
        { label: 'Factura', value: action.invoice },
        { label: 'Despacho', value: action.numero_despacho, highlight: true },
        { label: 'DIN', value: action.din_numero ?? '—' },
      ]} />

      {action.mensaje_alerta && (
        <div className="rounded-xl p-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>{action.mensaje_alerta}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#374151' }}>Tipo de documento</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'NOTA_CREDITO' as const, label: 'Nota de crédito', hint: 'AGENSA reconoce saldo a favor' },
            { value: 'NOTA_DEBITO' as const, label: 'Nota de débito', hint: 'Ajuste/cargo documentado por AGENSA' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setTipoNota(opt.value)}
              className="text-left rounded-xl px-4 py-3 transition-all active:scale-[0.99]"
              style={tipoNota === opt.value
                ? { background: '#FFF7ED', color: '#C2410C', border: '2px solid #FDBA74' }
                : { background: '#FFF', color: '#374151', border: '2px solid #E5E7EB' }}>
              <span className="block text-sm font-bold">{opt.label}</span>
              <span className="block text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>N° nota</label>
          <input type="text" value={numeroNota} onChange={e => setNumeroNota(e.target.value)} placeholder="Ej: NC-260041"
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border font-mono focus:outline-none"
            style={{ borderColor: '#D1D5DB', color: '#111827' }} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Monto CLP</label>
          <input type="number" min={1} value={montoClp} onChange={e => setMontoClp(e.target.value === '' ? '' : Number(e.target.value))}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border font-mono focus:outline-none"
            style={{ borderColor: '#D1D5DB', color: '#111827' }} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Fecha emisión</label>
          <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
            style={{ borderColor: '#D1D5DB', color: '#111827' }} />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Tratamiento del saldo</label>
        <select value={modalidad} onChange={e => setModalidad(e.target.value as typeof modalidad)}
          className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
          style={{ borderColor: '#D1D5DB', color: '#111827', background: '#FFF' }}>
          <option value="CREDITO_PROXIMA_PROVISION">Crédito para próxima provisión</option>
          <option value="DEVOLUCION">Devolución bancaria</option>
          <option value="COMPENSACION">Compensación contra otro despacho</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Notas contables</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Referencia de devolución, despacho compensado o comentario de Finanzas..."
          className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border resize-none focus:outline-none"
          style={{ borderColor: '#D1D5DB', color: '#111827' }} />
      </div>

      <button onClick={() => onSubmit({
        remesa_id: action.remesa_id,
        alert_id: action.alert_id,
        tipo_nota: tipoNota,
        numero_nota: numeroNota,
        monto_clp: amount,
        fecha_emision: fechaEmision,
        modalidad,
        notas,
      })}
        disabled={!numeroNota.trim() || !fechaEmision || !amount || amount <= 0}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: numeroNota.trim() && amount > 0 ? 'linear-gradient(135deg, #C2410C, #9A3412)' : '#9CA3AF' }}>
        Registrar nota y reconciliar →
      </button>
    </div>
  )
}

// ── Form 9: Archivar expediente ───────────────────────────────────────────────

function ArchivarExpedienteForm({ action, onSubmit }: { action: ArchivarExpedienteAction; onSubmit: (d: unknown) => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(action.checklist.map(c => [c.id, c.auto_verified]))
  )
  const [notas, setNotas] = useState('')

  const allChecked = action.checklist.every(c => checked[c.id])
  const progress   = action.checklist.filter(c => checked[c.id]).length

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <div className="flex-1">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all duration-300"
                 style={{ width: `${(progress / action.checklist.length) * 100}%`, background: allChecked ? '#059669' : '#2563EB' }} />
          </div>
        </div>
        <span className="text-xs font-bold mono flex-shrink-0" style={{ color: allChecked ? '#059669' : '#2563EB' }}>
          {progress}/{action.checklist.length}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        {action.checklist.map((item, i) => (
          <label key={item.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50"
                 style={{ borderBottom: i < action.checklist.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            <input type="checkbox" checked={checked[item.id] ?? false}
              onChange={e => setChecked(prev => ({ ...prev, [item.id]: e.target.checked }))}
              className="w-4 h-4 rounded" style={{ accentColor: '#059669' }} />
            <span className="text-sm flex-1" style={{ color: checked[item.id] ? '#059669' : '#374151' }}>
              {item.label}
            </span>
            {item.auto_verified && (
              <span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: '#9CA3AF' }}>auto</span>
            )}
          </label>
        ))}
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#374151' }}>Notas de cierre (opcional)</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones finales del expediente..."
          className="mt-1.5 w-full px-3 py-2.5 rounded-xl text-sm border resize-none focus:outline-none"
          style={{ borderColor: '#D1D5DB', color: '#111827' }} />
      </div>

      {!allChecked && (
        <p className="text-xs" style={{ color: '#9CA3AF' }}>
          Todos los ítems del checklist deben estar marcados para archivar.
        </p>
      )}

      <button onClick={() => onSubmit({ remesa_id: action.remesa_id, checklist_completado: allChecked, notas_cierre: notas })}
        disabled={!allChecked}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: allChecked ? 'linear-gradient(135deg, #374151, #1F2937)' : '#9CA3AF' }}>
        Archivar expediente completo →
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ActionStatus = 'pending' | 'completed' | 'error'

interface ActionState { action: PendingAction; status: ActionStatus; errorMsg?: string }

type ActionFilter = 'todas' | 'pago' | 'aduana' | 'revision' | 'stock' | 'cierre'

function actionFilterFor(type: PendingAction['type']): Exclude<ActionFilter, 'todas'> {
  if (type === 'INGRESAR_STOCK' || type === 'RECLAMO_PROVEEDOR') return 'stock'
  if (type === 'CONFIRMAR_PROVISION' || type === 'REGISTRAR_NOTA_AGENSA') return 'aduana'
  if (type === 'APROBAR_OPERACION') return 'revision'
  if (type === 'ARCHIVAR_EXPEDIENTE') return 'cierre'
  return 'pago'
}

const FILTER_LABELS: Record<ActionFilter, string> = {
  todas: 'Todas',
  pago: 'Pagos',
  aduana: 'Aduana',
  revision: 'Revisiones',
  stock: 'Stock',
  cierre: 'Cierre',
}

export default function ActionsPage() {
  const [items, setItems]               = useState<ActionState[]>([])
  const [loading, setLoading]           = useState(true)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [filter, setFilter]             = useState<ActionFilter>('todas')
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Fetch pending actions from real API
  function loadActions() {
    setLoading(true)
    fetch('/api/actions/pending')
      .then(r => r.json())
      .then(d => {
        const next: ActionState[] = (d.actions ?? []).map((a: PendingAction) => ({ action: a, status: 'pending' as const }))
        setItems(next)
        setSelectedId(prev => prev && next.some(i => i.action.id === prev) ? prev : next[0]?.action.id ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadActions() }, [])

  const pending = items.filter(i => i.status === 'pending').length
  const urgent  = items.filter(i => i.status === 'pending' && i.action.urgente).length

  async function handleSubmit(id: string, endpoint: string, data: unknown) {
    setProcessingId(id)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error ?? res.statusText)
      }
      setItems(prev => prev.map(i => i.action.id === id ? { ...i, status: 'completed' } : i))
      setSelectedId(null)
      toast.success('Acción completada', { description: 'Registrado en el sistema.' })
      // Reload after a brief moment so the completed action disappears
      setTimeout(loadActions, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setItems(prev => prev.map(i => i.action.id === id ? { ...i, status: 'error', errorMsg: msg } : i))
      toast.error('Error al procesar', { description: msg })
    } finally {
      setProcessingId(null)
    }
  }

  function renderForm(action: PendingAction) {
    if (processingId === action.id) {
      return (
        <div className="pt-6 pb-2 text-center">
          <div className="inline-block w-6 h-6 border-2 rounded-full animate-spin mb-2"
               style={{ borderColor: '#4F46E5', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#6B7280' }}>Procesando...</p>
        </div>
      )
    }
    const w = (ep: string) => (d: unknown) => handleSubmit(action.id, ep, d)
    switch (action.type) {
      case 'INSTRUCCION_PAGO':      return <InstruccionPagoForm       action={action} onSubmit={w('/api/actions/instruccion-pago')} />
      case 'EMITIR_ORDEN_PAGO':     return <EmitirOrdenPagoForm       action={action} onSubmit={w('/api/actions/orden-pago')} />
      case 'CONFIRMAR_PAGO_BANCARIO': return <ConfirmarPagoBancarioForm action={action} onSubmit={w('/api/actions/confirmar-pago-bancario')} />
      case 'CONFIRMAR_PROVISION':   return <ConfirmarProvisionForm     action={action} onSubmit={w('/api/actions/confirmar-provision')} />
      case 'INGRESAR_STOCK':        return <IngresarStockForm          action={action} onSubmit={w('/api/actions/accept-stock')} />
      case 'RECLAMO_PROVEEDOR':     return <ReclamoProveedorForm       action={action} onSubmit={w('/api/actions/reclamo-proveedor')} />
      case 'VINCULAR_DESPACHO':     return <VincularDespachoForm       action={action} onSubmit={w('/api/actions/vincular-despacho')} />
      case 'APROBAR_OPERACION':     return <AprobarOperacionForm       action={action} onSubmit={w('/api/actions/approve-payment')} />
      case 'REGISTRAR_NOTA_AGENSA': return <RegistrarNotaAgensaForm    action={action} onSubmit={w('/api/actions/nota-agensa')} />
      case 'ARCHIVAR_EXPEDIENTE':   return <ArchivarExpedienteForm     action={action} onSubmit={w('/api/actions/archivar-expediente')} />
    }
  }

  const tabs = useMemo(() => {
    const keys: ActionFilter[] = ['todas', 'pago', 'aduana', 'revision', 'stock', 'cierre']
    return keys.map(key => ({
      key,
      label: FILTER_LABELS[key],
      count: key === 'todas' ? items.length : items.filter(i => actionFilterFor(i.action.type) === key).length,
    }))
  }, [items])

  const filteredItems = useMemo(
    () => filter === 'todas' ? items : items.filter(i => actionFilterFor(i.action.type) === filter),
    [filter, items]
  )

  useEffect(() => {
    if (loading) return
    if (filteredItems.length === 0) {
      if (selectedId) setSelectedId(null)
      return
    }
    if (!selectedId || !filteredItems.some(i => i.action.id === selectedId)) {
      setSelectedId(filteredItems[0].action.id)
    }
  }, [filteredItems, loading, selectedId])

  const selectedState = filteredItems.find(i => i.action.id === selectedId) ?? filteredItems[0] ?? null

  function actionReference(action: PendingAction) {
    const data = action as unknown as Record<string, unknown>
    for (const key of ['invoice', 'numero_despacho', 'numero_orden', 'remesa_id']) {
      const value = data[key]
      if (typeof value === 'string' && value.trim()) {
        return key === 'remesa_id' ? value.slice(0, 8) : value
      }
    }
    return action.type.replace(/_/g, ' ')
  }

  function actionReasoning(action: PendingAction) {
    const data = action as unknown as Record<string, unknown>
    return typeof data.agent_reasoning === 'string' && data.agent_reasoning.trim()
      ? data.agent_reasoning
      : 'El agente dejó esta acción pendiente porque requiere confirmación humana antes de continuar el flujo operativo.'
  }

  return (
    <div className="dashboard-page--wide min-h-full animate-fade-in">
      <PageHeader
        title="Acciones"
        subtitle="Ventanilla de decisión humana · pagos, aduana, stock y cierre"
        actions={
          <>
          <span
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={pending > 0 ? { background: '#F5F5F4', color: '#525252', border: '1px solid #E7E5E4' } : { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot inline-block" style={{ background: pending > 0 ? '#525252' : '#059669' }} />
            {pending > 0 ? `${pending} pendientes` : 'Todo al día'}
          </span>
          {urgent > 0 && (
            <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              {urgent} urgente{urgent > 1 ? 's' : ''}
            </span>
          )}
          </>
        }
      />

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      )}

      {!loading && pending > 0 && (
        <>
          <div className="mb-[18px] flex gap-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
            {tabs.map(tab => {
              const active = tab.key === filter
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className="inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors"
                  style={{
                    borderColor: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--fg-1)' : 'var(--fg-3)',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                  <span
                    className="rounded-full px-[7px] py-px text-[10px] tnum"
                    style={{
                      background: active ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                      color: active ? 'var(--accent-text)' : 'var(--fg-3)',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(390px,0.9fr)]">
            <div className="stagger-children flex flex-col gap-2.5">
              {filteredItems.map(({ action, status }) => {
                const meta = META[action.type]
                const selected = selectedState?.action.id === action.id
                const isDone = status === 'completed'
                const isProc = processingId === action.id
                const tone = action.urgente ? 'var(--danger)' : meta.color

                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => !isDone && setSelectedId(action.id)}
                    className={clsx('grid overflow-hidden text-left transition-all', isDone && 'opacity-50')}
                    style={{
                      gridTemplateColumns: '4px 1fr',
                      border: selected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                      borderRadius: 'var(--r-lg)',
                      background: 'var(--bg-surface)',
                      boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                      cursor: isDone ? 'default' : 'pointer',
                    }}
                    disabled={isDone}
                  >
                    <div style={{ background: tone }} />
                    <div className="p-3.5">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="badge badge--violet" style={{ background: meta.iconBg, color: meta.color, borderColor: meta.border }}>
                          <span className="dot" />
                          {meta.label}
                        </span>
                        <span className="tnum text-[11px]" style={{ color: 'var(--fg-4)' }}>{actionReference(action)}</span>
                        <span className="ml-auto text-[11px]" style={{ color: 'var(--fg-4)' }}>
                          {new Date(action.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{action.title}</div>
                      <p className="line-clamp-2 text-xs" style={{ color: 'var(--fg-2)' }}>{action.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <AgentStrip compact>{action.urgente ? 'Requiere decisión prioritaria.' : 'Pendiente de confirmación humana.'}</AgentStrip>
                        <span className="avatar h-5 w-5 text-[9px]">BF</span>
                      </div>
                      {isProc && <p className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>Procesando...</p>}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="self-start xl:sticky xl:top-[72px]">
              {selectedState ? (
                <div className="card overflow-hidden p-0">
                  <div className="card__header">
                    <div className="min-w-0">
                      <div className="card__title truncate">{selectedState.action.title}</div>
                      <div className="tnum mt-1 text-[11px]" style={{ color: 'var(--fg-4)' }}>{actionReference(selectedState.action)}</div>
                    </div>
                    <span className="badge badge--violet" style={{
                      background: META[selectedState.action.type].iconBg,
                      color: META[selectedState.action.type].color,
                      borderColor: META[selectedState.action.type].border,
                    }}>
                      <span className="dot" />
                      {FILTER_LABELS[actionFilterFor(selectedState.action.type)]}
                    </span>
                  </div>

                  <div className="card__body">
                    <AgentStrip>{actionReasoning(selectedState.action)}</AgentStrip>
                    <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--fg-2)' }}>
                      {selectedState.action.description}
                    </p>

                    <div className="mt-4 grid grid-cols-[110px_1fr] text-xs">
                      {[
                        ['Referencia', actionReference(selectedState.action)],
                        ['Etapa', META[selectedState.action.type].stage],
                        ['Creada', new Date(selectedState.action.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })],
                      ].map(([label, value]) => (
                        <div key={label} className="contents">
                          <div className="border-b py-1.5" style={{ color: 'var(--fg-3)', borderColor: 'var(--border-subtle)' }}>{label}</div>
                          <div className="border-b py-1.5 font-medium" style={{ color: 'var(--fg-1)', borderColor: 'var(--border-subtle)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                    {renderForm(selectedState.action)}
                    {selectedState.errorMsg && (
                      <p className="mt-3 rounded-lg px-3 py-2 text-xs"
                        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                        Error: {selectedState.errorMsg}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card">
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>Sin acciones en este filtro</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--fg-3)' }}>Cambia de pestaña para revisar otra etapa del flujo.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && pending === 0 && (
        <div className="card p-12 text-center" style={{ borderColor: '#A7F3D0' }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: '#ECFDF5', color: '#059669' }}>
            OK
          </div>
          <p className="text-lg font-bold" style={{ color: '#059669' }}>Todo al día</p>
          <p className="mt-1.5 text-sm" style={{ color: '#A3A3A3' }}>Todas las acciones han sido procesadas.</p>
        </div>
      )}
    </div>
  )
}
