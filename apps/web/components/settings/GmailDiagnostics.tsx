'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  FileText,
  ListChecks,
  MailCheck,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

type PollResult = {
  ok: boolean
  processed: number
  errors: string[]
  duration_ms: number
}

type ClassifierResult = {
  ok: boolean
  sender_allowed: boolean
  configured_domains: string[]
  category: string
  confidence: number
  extracted_data: Record<string, unknown>
  agent: string | null
  would_trigger_agent: boolean
  note: string | null
}

const CATEGORIES = [
  {
    key: 'INVOICE_PROVEEDOR',
    label: 'Factura proveedor',
    description: 'Invoice, proforma o factura comercial de proveedor.',
    agent: 'invoice_intake',
  },
  {
    key: 'PROVISION_FONDOS',
    label: 'Provisión fondos',
    description: 'Agencia de aduana solicita fondos para un despacho.',
    agent: 'customs_funds',
  },
  {
    key: 'DIN_DESPACHO',
    label: 'DIN despacho',
    description: 'DIN, factura agencia o cierre documental post despacho.',
    agent: 'din_reconciliation',
  },
  {
    key: 'NOTA_DEBITO_AGENSA',
    label: 'Nota AGENSA',
    description: 'Nota de débito/crédito, devolución o saldo a favor.',
    agent: 'nota_debito',
  },
  {
    key: 'INSTRUCCION_PAGO',
    label: 'Instrucción de pago',
    description: 'Orden humana de pago. Hoy se clasifica, pero no dispara agente.',
    agent: null,
  },
  {
    key: 'UNKNOWN',
    label: 'No clasificado',
    description: 'Correos fuera del flujo o sin evidencia suficiente.',
    agent: null,
  },
]

const SAMPLE_BODY = `Proveedor: TEST SUPPLIER
Invoice: TEST-BF-HAPPY-20260521-001
Total: USD 12,450
Condicion de pago: 100%
Favor procesar factura comercial para la remesa.`

export function GmailDiagnostics() {
  const [polling, setPolling] = useState(false)
  const [pollResult, setPollResult] = useState<PollResult | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)

  const [testing, setTesting] = useState(false)
  const [classifierResult, setClassifierResult] = useState<ClassifierResult | null>(null)
  const [classifierError, setClassifierError] = useState<string | null>(null)
  const [form, setForm] = useState({
    email_from: 'proveedor@test-bluefishing.cl',
    email_subject: 'Invoice TEST-BF-HAPPY-20260521-001',
    email_body: SAMPLE_BODY,
    attachment_filename: 'TEST-BF-HAPPY-20260521-001.pdf',
    account: 'ops',
  })

  const pollStatus = useMemo(() => {
    if (pollError) return { label: 'Error', tone: 'danger' as const, Icon: XCircle }
    if (pollResult?.processed && pollResult.processed > 0) {
      return { label: `${pollResult.processed} procesado${pollResult.processed === 1 ? '' : 's'}`, tone: 'success' as const, Icon: CheckCircle2 }
    }
    if (pollResult) return { label: 'Sin correos nuevos', tone: 'neutral' as const, Icon: CircleDashed }
    return { label: 'Sin probar', tone: 'neutral' as const, Icon: CircleDashed }
  }, [pollError, pollResult])

  const StatusIcon = pollStatus.Icon

  async function runPoll() {
    setPolling(true)
    setPollError(null)
    setPollResult(null)

    try {
      const res = await fetch('/api/gmail/test-poll', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo ejecutar la lectura')
      setPollResult(data)
    } catch (err) {
      setPollError(err instanceof Error ? err.message : 'No se pudo ejecutar la lectura')
    } finally {
      setPolling(false)
    }
  }

  async function runClassifierTest() {
    setTesting(true)
    setClassifierError(null)
    setClassifierResult(null)

    try {
      const res = await fetch('/api/classifier/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo clasificar el correo')
      setClassifierResult(data)
    } catch (err) {
      setClassifierError(err instanceof Error ? err.message : 'No se pudo clasificar el correo')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="mt-6 grid gap-6">
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-4 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              <MailCheck size={20} strokeWidth={1.75} />
            </div>
            <div>
              <p className="m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Lectura Gmail
              </p>
              <p className="m-0 mt-1 text-sm leading-5" style={{ color: 'var(--text-secondary)' }}>
                Ejecuta el mismo lector del cron para saber si hay correos no leídos en inbox.
              </p>
            </div>
          </div>
          <Button onClick={runPoll} loading={polling} icon={<RefreshCw size={15} />} className="justify-center">
            Probar lectura
          </Button>
        </div>

        <div className="grid gap-4 px-5 py-4 md:grid-cols-[220px_1fr]">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <StatusIcon
                size={16}
                strokeWidth={1.75}
                style={{
                  color:
                    pollStatus.tone === 'success' ? 'var(--success)' :
                    pollStatus.tone === 'danger' ? 'var(--danger)' :
                    'var(--text-tertiary)',
                }}
              />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {pollStatus.label}
              </span>
            </div>
            {pollResult && (
              <p className="m-0 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Duración: {pollResult.duration_ms} ms
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4" style={{ background: 'var(--bg-secondary)' }}>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-tertiary)' }}>
              Qué significa
            </p>
            <p className="m-0 mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              El lector busca `is:unread in:inbox`, procesa hasta 3 mensajes por ejecución y los marca como leídos. Si no aparece nada, reenvía o marca un correo como no leído y vuelve a probar.
            </p>
            {pollError && <InlineAlert tone="danger" title="No se pudo leer Gmail" body={pollError} />}
            {pollResult?.errors?.length ? (
              <div className="mt-3 grid gap-2">
                {pollResult.errors.map((error, idx) => (
                  <InlineAlert key={`${error}-${idx}`} tone="danger" title="Error del lector" body={error} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <ListChecks size={20} strokeWidth={1.75} />
            </div>
            <div>
              <p className="m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Clasificación de correo
              </p>
              <p className="m-0 mt-1 text-sm leading-5" style={{ color: 'var(--text-secondary)' }}>
                Pega un ejemplo real y valida categoría, confianza y agente antes de meterlo al workflow.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Remitente</span>
                <input
                  className="input"
                  value={form.email_from}
                  onChange={e => setForm(prev => ({ ...prev, email_from: e.target.value }))}
                  placeholder="proveedor@dominio.com"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Cuenta</span>
                <input
                  className="input"
                  value={form.account}
                  onChange={e => setForm(prev => ({ ...prev, account: e.target.value }))}
                  placeholder="ops"
                />
              </label>
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Asunto</span>
              <input
                className="input"
                value={form.email_subject}
                onChange={e => setForm(prev => ({ ...prev, email_subject: e.target.value }))}
                placeholder="Invoice TEST-BF-HAPPY-20260521-001"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Nombre del adjunto</span>
              <input
                className="input"
                value={form.attachment_filename}
                onChange={e => setForm(prev => ({ ...prev, attachment_filename: e.target.value }))}
                placeholder="invoice.pdf"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Cuerpo del correo</span>
              <textarea
                className="input min-h-[180px] resize-y leading-6"
                value={form.email_body}
                onChange={e => setForm(prev => ({ ...prev, email_body: e.target.value }))}
                placeholder="Pega aquí el texto del correo o del PDF si lo tienes..."
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0 text-xs leading-5" style={{ color: 'var(--text-tertiary)' }}>
                Esta prueba no crea documentos, remesas ni acciones. Solo consulta el clasificador.
              </p>
              <Button onClick={runClassifierTest} loading={testing} icon={<Play size={15} />} className="justify-center">
                Probar clasificación
              </Button>
            </div>
          </div>

          <aside className="grid content-start gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <FileText size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Resultado</span>
              </div>

              {!classifierResult && !classifierError && (
                <p className="m-0 mt-3 text-sm leading-5" style={{ color: 'var(--text-tertiary)' }}>
                  Ejecuta una prueba para ver categoría, confianza y agente destino.
                </p>
              )}

              {classifierError && <InlineAlert tone="danger" title="Clasificación fallida" body={classifierError} />}

              {classifierResult && (
                <div className="mt-4 grid gap-3">
                  <ResultRow label="Categoría" value={classifierResult.category} strong />
                  <ResultRow label="Confianza" value={`${Math.round(classifierResult.confidence * 100)}%`} />
                  <ResultRow label="Agente" value={classifierResult.agent ?? 'Sin agente'} />
                  <div className="flex items-start gap-2 rounded-lg border px-3 py-2"
                    style={{
                      background: classifierResult.sender_allowed ? 'var(--success-bg)' : 'var(--warning-bg)',
                      borderColor: classifierResult.sender_allowed ? 'var(--success-border)' : 'var(--warning-border)',
                    }}>
                    <ShieldCheck
                      size={15}
                      strokeWidth={1.75}
                      className="mt-0.5 shrink-0"
                      style={{ color: classifierResult.sender_allowed ? 'var(--success)' : 'var(--warning)' }}
                    />
                    <p className="m-0 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                      {classifierResult.sender_allowed
                        ? 'El dominio del remitente pasaría el filtro del webhook.'
                        : 'El dominio del remitente sería ignorado por ALLOWED_EMAIL_DOMAINS.'}
                    </p>
                  </div>
                  {classifierResult.note && <InlineAlert tone="warning" title="Nota" body={classifierResult.note} />}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4" style={{ background: 'var(--bg-secondary)' }}>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-tertiary)' }}>
                Categorías actuales
              </p>
              <div className="mt-3 grid gap-2">
                {CATEGORIES.map(category => (
                  <div key={category.key} className="rounded-md border bg-white px-3 py-2">
                    <p className="m-0 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {category.label}
                    </p>
                    <p className="m-0 mt-1 text-[11px] leading-4" style={{ color: 'var(--text-tertiary)' }}>
                      {category.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function ResultRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className={strong ? 'mono text-xs font-semibold' : 'mono text-xs'} style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function InlineAlert({ tone, title, body }: { tone: 'danger' | 'warning'; title: string; body: string }) {
  const danger = tone === 'danger'
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border px-3 py-2"
      style={{
        background: danger ? 'var(--danger-bg)' : 'var(--warning-bg)',
        borderColor: danger ? 'var(--danger-border)' : 'var(--warning-border)',
      }}>
      <AlertCircle
        size={15}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0"
        style={{ color: danger ? 'var(--danger)' : 'var(--warning)' }}
      />
      <div>
        <p className="m-0 text-xs font-semibold" style={{ color: danger ? '#991B1B' : '#92400E' }}>{title}</p>
        <p className="m-0 mt-0.5 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{body}</p>
      </div>
    </div>
  )
}
