import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

export const maxDuration = 30

function fmt(n: number, moneda: string) {
  if (moneda === 'JPY') return `¥${n.toLocaleString('ja-JP')}`
  if (moneda === 'CLP') return `$${Math.round(n).toLocaleString('es-CL')}`
  return `${moneda} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHtml(data: Record<string, any>): string {
  const { remesa, proveedor, pagos, provisiones, documentos, stock, logs } = data
  const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })

  const pagoRows = (pagos ?? []).map((p: Record<string, unknown>) => `
    <tr>
      <td>${p.tipo ?? '—'}</td>
      <td>${fmtDate(p.fecha_emision as string)}</td>
      <td>${fmtDate(p.fecha_confirmacion as string)}</td>
      <td class="num">${fmt(Number(p.monto_moneda_origen ?? 0), String(p.moneda ?? 'USD'))}</td>
      <td class="num">${p.fx_rate ? Number(p.fx_rate).toFixed(4) : '—'}</td>
      <td class="num">${p.monto_clp ? fmt(Number(p.monto_clp), 'CLP') : '—'}</td>
      <td><span class="badge ${p.estado === 'CONFIRMADO' ? 'badge-green' : 'badge-amber'}">${p.estado ?? '—'}</span></td>
      <td>${p.orden_pago_numero ?? '—'}</td>
    </tr>`).join('')

  const stockRows = (stock ?? []).map((s: Record<string, unknown>) => {
    const diff = Number(s.diferencia ?? 0)
    return `
    <tr>
      <td class="mono">${s.sku ?? '—'}</td>
      <td>${s.descripcion ?? '—'}</td>
      <td class="num">${s.cantidad_invoice ?? 0}</td>
      <td class="num">${s.cantidad_recibida ?? 0}</td>
      <td class="num ${diff !== 0 ? 'text-red' : 'text-green'}">${diff > 0 ? '+' : ''}${diff}</td>
      <td class="num">${s.precio_unitario_usd ? `USD ${Number(s.precio_unitario_usd).toFixed(2)}` : '—'}</td>
    </tr>`
  }).join('')

  const docRows = (documentos ?? []).map((d: Record<string, unknown>) => `
    <tr>
      <td><span class="badge badge-blue">${d.tipo ?? '—'}</span></td>
      <td class="mono">${d.numero ?? '—'}</td>
      <td class="num">${d.monto ? fmt(Number(d.monto), String(d.moneda ?? 'CLP')) : '—'}</td>
      <td>${d.agente_nombre ?? '—'}</td>
      <td>${fmtDate(d.created_at as string)}</td>
      <td>${d.confianza != null ? `${Math.round(Number(d.confianza) * 100)}%` : '—'}</td>
    </tr>`).join('')

  const timelineItems = (logs ?? []).slice(0, 12).map((l: Record<string, unknown>) => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <span class="timeline-agent">${String(l.agent_name ?? '').replace(/_/g, ' ')}</span>
        <span class="timeline-action">${String(l.accion ?? '').replace(/_/g, ' ')}</span>
        <span class="timeline-time">${fmtDate(l.created_at as string)}</span>
        <span class="badge ${l.resultado === 'SUCCESS' ? 'badge-green' : l.resultado === 'ERROR' ? 'badge-red' : 'badge-amber'}">${l.resultado ?? '—'}</span>
      </div>
    </div>`).join('')

  const totalPagadoCLP = (pagos ?? [])
    .filter((p: Record<string, unknown>) => p.estado === 'CONFIRMADO' && p.monto_clp)
    .reduce((s: number, p: Record<string, unknown>) => s + Number(p.monto_clp ?? 0), 0)

  const totalProvision = (provisiones ?? [])
    .reduce((s: number, p: Record<string, unknown>) => s + Number(p.monto_clp ?? 0), 0)

  const din = (documentos ?? []).find((d: Record<string, unknown>) => d.tipo === 'DIN')
  const landedCostDoc = (documentos ?? []).find((d: Record<string, unknown>) => d.numero === 'LANDED_COST_REPORT')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Expediente ${remesa.numero_invoice}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#1a1a1a;background:#f9f9f8;padding:32px}
  .page{max-width:900px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.08);overflow:hidden}
  .header{background:linear-gradient(135deg,#4F46E5,#2563EB);color:#fff;padding:28px 32px}
  .header h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .header .meta{font-size:11px;opacity:0.8}
  .header .badge-status{display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;margin-top:8px}
  .body{padding:28px 32px}
  .section{margin-bottom:28px}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9ca3af;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f0f0ef}
  .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px}
  .info-item label{display:block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin-bottom:3px}
  .info-item value{display:block;font-size:13px;font-weight:500;color:#111}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;padding:7px 10px;background:#fafaf9;border-bottom:1px solid #f0f0ef}
  td{padding:8px 10px;border-bottom:1px solid #f5f5f4;vertical-align:top}
  tr:last-child td{border-bottom:none}
  .num{text-align:right;font-variant-numeric:tabular-nums;font-family:ui-monospace,monospace}
  .mono{font-family:ui-monospace,monospace;font-size:11px}
  .text-green{color:#059669}
  .text-red{color:#dc2626}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
  .badge-green{background:#ecfdf5;color:#059669}
  .badge-amber{background:#fffbeb;color:#d97706}
  .badge-red{background:#fef2f2;color:#dc2626}
  .badge-blue{background:#eff6ff;color:#2563eb}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:4px}
  .kpi{background:#f9fafb;border-radius:8px;padding:12px 14px;border:1px solid #f0f0ef}
  .kpi .label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin-bottom:4px}
  .kpi .value{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;color:#111}
  .kpi .sub{font-size:10px;color:#9ca3af;margin-top:2px}
  .timeline-item{display:flex;gap:10px;margin-bottom:10px}
  .timeline-dot{width:8px;height:8px;border-radius:50%;background:#4F46E5;margin-top:4px;flex-shrink:0}
  .timeline-content{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .timeline-agent{font-size:11px;font-weight:600;text-transform:capitalize;color:#4F46E5}
  .timeline-action{font-size:11px;color:#555;text-transform:capitalize}
  .timeline-time{font-size:10px;color:#9ca3af;margin-left:auto}
  .footer{background:#f9faf9;border-top:1px solid #f0f0ef;padding:16px 32px;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between}
  @media print{body{padding:0;background:#fff}.page{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="meta">IMPORT OPS · SHIPMENT FILE</div>
        <h1>${remesa.numero_invoice}</h1>
        <div class="meta">${proveedor?.nombre ?? '—'} · ${proveedor?.pais ?? '—'}</div>
        <div class="badge-status">${remesa.estado?.replace(/_/g, ' ')}</div>
      </div>
      <div style="text-align:right">
        <div class="meta">Generated</div>
        <div style="font-size:12px;margin-top:2px">${generatedAt}</div>
        ${remesa.din_numero ? `<div style="font-size:11px;margin-top:6px;opacity:.8">DIN: ${remesa.din_numero}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="body">

    <!-- KPIs -->
    <div class="section">
      <div class="kpi-grid">
        <div class="kpi">
          <div class="label">Invoice amount</div>
          <div class="value">${fmt(remesa.monto_original, remesa.moneda_origen)}</div>
          <div class="sub">${remesa.condicion_pago ?? '—'}</div>
        </div>
        <div class="kpi">
          <div class="label">Paid (CLP)</div>
          <div class="value">${totalPagadoCLP ? fmt(totalPagadoCLP, 'CLP') : '—'}</div>
          <div class="sub">${(pagos ?? []).filter((p: Record<string, unknown>) => p.estado === 'CONFIRMADO').length} confirmed payments</div>
        </div>
        <div class="kpi">
          <div class="label">Customs provision</div>
          <div class="value">${totalProvision ? fmt(totalProvision, 'CLP') : '—'}</div>
          <div class="sub">${remesa.numero_despacho ?? '—'}</div>
        </div>
        <div class="kpi">
          <div class="label">Landed cost</div>
          <div class="value">${landedCostDoc ? fmt(Number(landedCostDoc.monto ?? 0), 'CLP') : '—'}</div>
          <div class="sub">total all SKUs</div>
        </div>
      </div>
    </div>

    <!-- Supplier info -->
    <div class="section">
      <div class="section-title">Supplier</div>
      <div class="info-grid">
        <div class="info-item"><label>Name</label><value>${proveedor?.nombre ?? '—'}</value></div>
        <div class="info-item"><label>Country</label><value>${proveedor?.pais ?? '—'}</value></div>
        <div class="info-item"><label>Currency</label><value>${proveedor?.moneda ?? '—'}</value></div>
        <div class="info-item"><label>Invoice date</label><value>${fmtDate(remesa.fecha_invoice)}</value></div>
        <div class="info-item"><label>Dispatch</label><value class="mono">${remesa.numero_despacho ?? '—'}</value></div>
        <div class="info-item"><label>DIN</label><value class="mono">${remesa.din_numero ?? '—'}</value></div>
      </div>
    </div>

    <!-- Payments -->
    ${pagoRows ? `
    <div class="section">
      <div class="section-title">Payments</div>
      <table>
        <thead><tr><th>Type</th><th>Issued</th><th>Confirmed</th><th class="num">Amount</th><th class="num">FX</th><th class="num">CLP</th><th>Status</th><th>OP#</th></tr></thead>
        <tbody>${pagoRows}</tbody>
      </table>
    </div>` : ''}

    <!-- Stock -->
    ${stockRows ? `
    <div class="section">
      <div class="section-title">Stock received</div>
      <table>
        <thead><tr><th>SKU</th><th>Description</th><th class="num">Invoiced</th><th class="num">Received</th><th class="num">Diff</th><th class="num">Unit price</th></tr></thead>
        <tbody>${stockRows}</tbody>
      </table>
    </div>` : ''}

    <!-- Documents -->
    ${docRows ? `
    <div class="section">
      <div class="section-title">Documents</div>
      <table>
        <thead><tr><th>Type</th><th>Number</th><th class="num">Amount</th><th>Agent</th><th>Date</th><th class="num">Confidence</th></tr></thead>
        <tbody>${docRows}</tbody>
      </table>
    </div>` : ''}

    <!-- Agent timeline -->
    ${timelineItems ? `
    <div class="section">
      <div class="section-title">Agent activity</div>
      ${timelineItems}
    </div>` : ''}

    ${remesa.notas ? `
    <div class="section">
      <div class="section-title">Notes</div>
      <p style="font-size:13px;color:#555;line-height:1.5">${remesa.notas}</p>
    </div>` : ''}

  </div>

  <div class="footer">
    <span>Import Ops · Automated Import Workflow</span>
    <span>Remesa ID: ${remesa.id?.slice(0, 8) ?? '—'} · ${generatedAt}</span>
  </div>

</div>
</body>
</html>`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const [
    { data: remesa },
    { data: pagos },
    { data: provisiones },
    { data: documentos },
    { data: stock },
    { data: logs },
  ] = await Promise.all([
    db.from('remesas').select('*, proveedor:proveedores(nombre,pais,moneda)').eq('id', id).single(),
    db.from('pagos').select('*').eq('remesa_id', id).order('fecha_emision', { ascending: true }),
    db.from('provisiones_fondos').select('*').eq('remesa_id', id),
    db.from('documentos').select('*').eq('remesa_id', id).order('created_at', { ascending: true }),
    db.from('stock_items').select('*').eq('remesa_id', id),
    db.from('agent_logs').select('*').eq('remesa_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  if (!remesa) {
    return NextResponse.json({ error: 'Remesa not found' }, { status: 404 })
  }

  const proveedor = Array.isArray((remesa as Record<string, unknown>).proveedor)
    ? ((remesa as Record<string, unknown>).proveedor as unknown[])[0]
    : (remesa as Record<string, unknown>).proveedor

  const html = buildHtml({ remesa, proveedor, pagos, provisiones, documentos, stock, logs })
  const filename = `expediente-${(remesa as Record<string, unknown>).numero_invoice}-${new Date().toISOString().slice(0, 10)}.html`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// Called automatically by landed_cost agent or din_reconciliation agent
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Log that expediente was generated
  await db.from('agent_logs').insert({
    agent_name:  'landed_cost',
    accion:      'EXPEDIENTE_GENERADO',
    resultado:   'SUCCESS',
    remesa_id:   id,
    payload:     { url: `/api/remesas/${id}/expediente`, generated_at: new Date().toISOString() },
  })

  return NextResponse.json({ ok: true, download_url: `/api/remesas/${id}/expediente` })
}
