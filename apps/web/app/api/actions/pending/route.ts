import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const limited = rateLimit(req, 'read', user.id)
  if (limited) return limited

  const supabase = sb()
  const actions: unknown[] = []

  try {
    // 1. INSTRUCCION_PAGO — remesas recibidas sin instrucción de pago (sin pagos aún)
    const { data: remesasInvoice } = await supabase
      .from('remesas')
      .select('*, proveedor:proveedores(nombre, pais, moneda)')
      .eq('estado', 'INVOICE_RECIBIDO')
      .order('created_at', { ascending: true })

    if (remesasInvoice?.length) {
      const ids = remesasInvoice.map(r => r.id)
      const { data: pagosExistentes } = await supabase
        .from('pagos')
        .select('remesa_id')
        .in('remesa_id', ids)

      const conPagos = new Set(pagosExistentes?.map(p => p.remesa_id) ?? [])

      remesasInvoice
        .filter(r => !conPagos.has(r.id))
        .forEach(r => {
          actions.push({
            id:             `instruccion-${r.id}`,
            type:           'INSTRUCCION_PAGO',
            title:          `Instrucción pago — ${r.numero_invoice}`,
            description:    `Invoice ${r.numero_invoice} de ${r.proveedor?.nombre ?? '—'} esperando condición de pago`,
            invoice:        r.numero_invoice,
            remesa_id:      r.id,
            proveedor:      r.proveedor?.nombre ?? '—',
            monto_original: r.monto_original,
            moneda:         r.moneda_origen,
            urgente:        false,
            created_at:     r.created_at,
          })
        })
    }

    // 2. VINCULAR_DESPACHO — remesas sin número de despacho en etapas tempranas
    const { data: remesasSinDespacho } = await supabase
      .from('remesas')
      .select('*, proveedor:proveedores(nombre)')
      .in('estado', ['INVOICE_RECIBIDO', 'PAGO_PENDIENTE', 'PAGO_PARCIAL', 'PAGO_COMPLETO'])
      .is('numero_despacho', null)

    remesasSinDespacho?.forEach(r => {
      actions.push({
        id:             `despacho-${r.id}`,
        type:           'VINCULAR_DESPACHO',
        title:          `Vincular despacho — ${r.numero_invoice}`,
        description:    `${r.proveedor?.nombre ?? '—'} · pendiente número DSP-XX-XXXX de AGENSA`,
        invoice:        r.numero_invoice,
        remesa_id:      r.id,
        proveedor:      r.proveedor?.nombre ?? '—',
        moneda:         r.moneda_origen,
        monto_original: r.monto_original,
        fecha_invoice:  r.fecha_invoice ?? r.created_at,
        urgente:        false,
        created_at:     r.created_at,
      })
    })

    // 3. EMITIR_ORDEN_PAGO — pagos pendientes que Hector debe emitir
    const { data: pagosPendientes } = await supabase
      .from('pagos')
      .select('*, remesa:remesas(numero_invoice, proveedor:proveedores(nombre))')
      .eq('estado', 'PENDIENTE')

    pagosPendientes?.forEach(p => {
      const invoice = (p.remesa as { numero_invoice?: string })?.numero_invoice ?? '—'
      const proveedor = (p.remesa as { proveedor?: { nombre?: string } })?.proveedor?.nombre ?? '—'
      actions.push({
        id:               `orden-${p.id}`,
        type:             'EMITIR_ORDEN_PAGO',
        title:            `Emitir orden de pago — ${invoice}`,
        description:      `${p.tipo} · ${p.monto_moneda_origen} ${p.moneda} a ${proveedor}`,
        invoice,
        remesa_id:        p.remesa_id,
        pago_id:          p.id,
        proveedor,
        monto_pago:       p.monto_moneda_origen,
        moneda:           p.moneda,
        tipo_pago:        p.tipo,
        condicion_pago:   p.condicion_pago ?? '',
        instruccion_notas: p.notas ?? '',
        urgente:          false,
        created_at:       p.created_at,
      })
    })

    // 4. CONFIRMAR_PAGO_BANCARIO — pagos emitidos esperando confirmación SWIFT
    const { data: pagosEmitidos } = await supabase
      .from('pagos')
      .select('*, remesa:remesas(numero_invoice, proveedor:proveedores(nombre))')
      .eq('estado', 'EMITIDO')

    pagosEmitidos?.forEach(p => {
      const invoice = (p.remesa as { numero_invoice?: string })?.numero_invoice ?? '—'
      const proveedor = (p.remesa as { proveedor?: { nombre?: string } })?.proveedor?.nombre ?? '—'
      actions.push({
        id:          `confirmar-pago-${p.id}`,
        type:        'CONFIRMAR_PAGO_BANCARIO',
        title:       `Confirmación banco — ${invoice}`,
        description: `${p.tipo} · ${p.monto_moneda_origen} ${p.moneda} · Orden: ${p.orden_pago_numero ?? '—'}`,
        invoice,
        remesa_id:   p.remesa_id,
        pago_id:     p.id,
        proveedor,
        monto_pago:  p.monto_moneda_origen,
        moneda:      p.moneda,
        tipo_pago:   p.tipo,
        numero_orden: p.orden_pago_numero ?? '',
        urgente:     false,
        created_at:  p.created_at,
      })
    })

    // 5. CONFIRMAR_PROVISION — provisiones de AGENSA pendientes de confirmar
    const { data: provisiones } = await supabase
      .from('provisiones_fondos')
      .select('id, estado, monto_clp, fecha_vencimiento, numero_despacho, remesa_id, created_at')
      .eq('estado', 'PENDIENTE')

    provisiones?.forEach(p => {
      const dias = Math.ceil((new Date(p.fecha_vencimiento).getTime() - Date.now()) / 86400000)
      actions.push({
        id:                `provision-${p.id}`,
        type:              'CONFIRMAR_PROVISION',
        title:             `Provisión fondos — ${p.numero_despacho ?? '—'}`,
        description:       `Ag. Aduanas solicita ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(p.monto_clp)} · vence en ${dias}d`,
        provision_id:      p.id,
        numero_despacho:   p.numero_despacho ?? '—',
        monto_clp:         p.monto_clp,
        fecha_vencimiento: p.fecha_vencimiento,
        dias_restantes:    dias,
        nombre_agencia:    process.env.CUSTOMS_AGENCY_NAME ?? 'Agencia de Aduanas',
        cuentas_agencia:   process.env.CUSTOMS_AGENCY_BANK_ACCOUNTS ?? '',
        urgente:           dias <= 3,
        created_at:        p.created_at,
      })
    })

    // 6. INGRESAR_STOCK — recepciones pendientes de conteo
    const { data: recepciones } = await supabase
      .from('stock_recepciones')
      .select('id, remesa_id, estado, fecha_recepcion, created_at, items:stock_items(id, sku, descripcion, cantidad_invoice), remesa:remesas(numero_invoice, proveedor:proveedores(nombre))')
      .eq('estado', 'PENDIENTE')

    recepciones?.forEach(rec => {
      const invoice = (rec.remesa as { numero_invoice?: string })?.numero_invoice ?? '—'
      const proveedor = (rec.remesa as { proveedor?: { nombre?: string } })?.proveedor?.nombre ?? '—'
      actions.push({
        id:           `stock-${rec.id}`,
        type:         'INGRESAR_STOCK',
        title:        `Ingresar stock — ${invoice}`,
        description:  `${proveedor} · ${rec.items?.length ?? 0} SKUs pendientes de conteo`,
        invoice,
        remesa_id:    rec.remesa_id,
        recepcion_id: rec.id,
        proveedor,
        skus:         rec.items ?? [],
        urgente:      false,
        created_at:   rec.created_at,
      })
    })

    // 7. RECLAMO_PROVEEDOR — recepciones con diferencias detectadas
    const { data: recepcionesDiff } = await supabase
      .from('stock_recepciones')
      .select('*, items:stock_items(*), remesa:remesas(numero_invoice, proveedor:proveedores(nombre))')
      .eq('estado', 'CON_DIFERENCIAS')

    recepcionesDiff?.forEach(rec => {
      const invoice = (rec.remesa as { numero_invoice?: string })?.numero_invoice ?? '—'
      const proveedor = (rec.remesa as { proveedor?: { nombre?: string } })?.proveedor?.nombre ?? '—'
      const items = (rec.items ?? []) as Array<{
        sku: string; descripcion: string
        cantidad_invoice: number; cantidad_recibida: number; diferencia: number
      }>
      actions.push({
        id:             `reclamo-${rec.id}`,
        type:           'RECLAMO_PROVEEDOR',
        title:          `Reclamo proveedor — ${invoice}`,
        description:    `${proveedor} · ${items.filter(i => i.diferencia !== 0).length} SKUs con diferencias`,
        invoice,
        remesa_id:      rec.remesa_id,
        proveedor,
        contacto_email: null,
        diferencias:    items.map(i => ({
          sku: i.sku, descripcion: i.descripcion,
          cantidad_invoice: i.cantidad_invoice,
          cantidad_recibida: i.cantidad_recibida,
          diferencia: i.diferencia,
        })),
        urgente:        false,
        created_at:     rec.created_at,
      })
    })

    // 8. ARCHIVAR_EXPEDIENTE — remesas reconciliadas sin cierre
    const { data: reconciliadas } = await supabase
      .from('remesas')
      .select('*, proveedor:proveedores(nombre)')
      .eq('estado', 'RECONCILIADO')

    if (reconciliadas?.length) {
      const ids = reconciliadas.map(r => r.id)
      const { data: docsCierre } = await supabase
        .from('documentos')
        .select('remesa_id, numero')
        .in('remesa_id', ids)
        .like('numero', 'CIERRE-%')

      const conCierre = new Set(docsCierre?.map(d => d.remesa_id) ?? [])

      reconciliadas
        .filter(r => !conCierre.has(r.id))
        .forEach(r => {
          actions.push({
            id:              `archivar-${r.id}`,
            type:            'ARCHIVAR_EXPEDIENTE',
            title:           `Archivar expediente — ${r.numero_invoice}`,
            description:     `${r.proveedor?.nombre ?? '—'} · despacho ${r.numero_despacho ?? '—'} · reconciliado`,
            invoice:         r.numero_invoice,
            remesa_id:       r.id,
            proveedor:       r.proveedor?.nombre ?? '—',
            numero_despacho: r.numero_despacho ?? '—',
            urgente:         false,
            created_at:      r.updated_at,
            checklist: [
              { id: 'din',       label: 'DIN recibido y registrado',           auto_verified: !!r.din_numero },
              { id: 'pagos',     label: 'Todos los pagos confirmados',          auto_verified: true },
              { id: 'stock',     label: 'Stock ingresado a Bsale',             auto_verified: false },
              { id: 'reconcil',  label: 'Reconciliación completada (DIN vs provisión)', auto_verified: true },
              { id: 'docs',      label: 'Facturas AA archivadas',              auto_verified: false },
              { id: 'reclamos',  label: 'Diferencias de stock resueltas',       auto_verified: false },
            ],
          })
        })
    }

    // 9. INSTRUCCION_PAGO desde email — Sebastian instruyó a Hector por correo
    const { data: alertasInstruccion } = await supabase
      .from('alertas')
      .select('id, remesa_id, mensaje, urgente, created_at, remesa:remesas(numero_invoice, monto_original, moneda_origen, proveedor:proveedores(nombre))')
      .eq('tipo', 'INSTRUCCION_PAGO')
      .eq('leida', false)

    alertasInstruccion?.forEach(a => {
      const r = a.remesa as { numero_invoice?: string; monto_original?: number; moneda_origen?: string; proveedor?: { nombre?: string } } | null
      actions.push({
        id:             `instruccion-email-${a.id}`,
        type:           'INSTRUCCION_PAGO',
        title:          `Instrucción de pago${r?.numero_invoice ? ` — ${r.numero_invoice}` : ''}`,
        description:    a.mensaje,
        remesa_id:      a.remesa_id ?? '',
        invoice:        r?.numero_invoice ?? '—',
        proveedor:      r?.proveedor?.nombre ?? '—',
        monto_original: r?.monto_original ?? 0,
        moneda:         r?.moneda_origen ?? 'USD',
        alert_id:       a.id,
        urgente:        true,
        created_at:     a.created_at,
      })
    })

    // 10. APROBAR_OPERACION — alertas de aprobación requerida (operaciones > CLP 5M)
    const { data: alertasAprobacion } = await supabase
      .from('alertas')
      .select('*, remesa:remesas(numero_invoice, monto_original, moneda_origen, proveedor:proveedores(nombre))')
      .eq('tipo', 'APROBACION_REQUERIDA')
      .eq('leida', false)

    alertasAprobacion?.forEach(a => {
      const r = a.remesa as { numero_invoice?: string; monto_original?: number; moneda_origen?: string; proveedor?: { nombre?: string } } | null
      actions.push({
        id:                 `aprobar-${a.id}`,
        type:               'APROBAR_OPERACION',
        title:              `Aprobación requerida — ${r?.numero_invoice ?? '—'}`,
        description:        a.mensaje,
        invoice:            r?.numero_invoice ?? '—',
        remesa_id:          a.remesa_id ?? '',
        proveedor:          r?.proveedor?.nombre ?? '—',
        monto_original:     r?.monto_original ?? 0,
        moneda:             r?.moneda_origen ?? 'USD',
        monto_clp_estimado: 0,
        agent_reasoning:    a.mensaje,
        urgente:            a.urgente ?? true,
        created_at:         a.created_at,
      })
    })

    // 10. REGISTRAR_NOTA_AGENSA — saldo a favor por provisión AGENSA > costo DIN
    const { data: alertasSaldoFavor } = await supabase
      .from('alertas')
      .select('id, remesa_id, mensaje, urgente, created_at, remesa:remesas(id, numero_invoice, numero_despacho, din_numero, estado, proveedor:proveedores(nombre))')
      .eq('tipo', 'SALDO_FAVOR_AGENSA')
      .eq('leida', false)

    const saldoRemesaIds = Array.from(new Set((alertasSaldoFavor ?? [])
      .map(a => a.remesa_id)
      .filter(Boolean))) as string[]

    if (saldoRemesaIds.length) {
      const [{ data: provisionesPagadas }, { data: dinDocs }] = await Promise.all([
        supabase
          .from('provisiones_fondos')
          .select('remesa_id, monto_clp')
          .in('remesa_id', saldoRemesaIds)
          .eq('estado', 'PAGADO'),
        supabase
          .from('documentos')
          .select('remesa_id, monto, created_at')
          .in('remesa_id', saldoRemesaIds)
          .eq('tipo', 'DIN')
          .order('created_at', { ascending: false }),
      ])

      const provisionByRemesa = new Map<string, number>()
      ;(provisionesPagadas ?? []).forEach(p => {
        provisionByRemesa.set(p.remesa_id, (provisionByRemesa.get(p.remesa_id) ?? 0) + Number(p.monto_clp ?? 0))
      })

      const dinByRemesa = new Map<string, number>()
      ;(dinDocs ?? []).forEach(d => {
        if (!dinByRemesa.has(d.remesa_id)) {
          dinByRemesa.set(d.remesa_id, Number(d.monto ?? 0))
        }
      })

      alertasSaldoFavor?.forEach(a => {
        const r = a.remesa as {
          id?: string
          numero_invoice?: string
          numero_despacho?: string | null
          din_numero?: string | null
          estado?: string
          proveedor?: { nombre?: string }
        } | null

        if (!r?.id) return

        const provisionPagada = provisionByRemesa.get(r.id) ?? 0
        const costoReal = dinByRemesa.get(r.id) ?? 0
        const saldoFavor = Math.max(provisionPagada - costoReal, 0)

        actions.push({
          id:                   `nota-agensa-${a.id}`,
          type:                 'REGISTRAR_NOTA_AGENSA',
          title:                `Nota AGENSA — ${r.numero_invoice ?? '—'}`,
          description:          saldoFavor > 0
            ? `Saldo a favor ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(saldoFavor)} · registrar nota de crédito/débito o devolución`
            : a.mensaje,
          invoice:              r.numero_invoice ?? '—',
          remesa_id:            r.id,
          proveedor:            r.proveedor?.nombre ?? '—',
          alert_id:             a.id,
          numero_despacho:      r.numero_despacho ?? '—',
          din_numero:           r.din_numero ?? null,
          provision_pagada_clp: provisionPagada,
          costo_real_clp:       costoReal,
          saldo_favor_clp:      saldoFavor,
          mensaje_alerta:       a.mensaje,
          urgente:              a.urgente ?? true,
          created_at:           a.created_at,
        })
      })
    }

  } catch {
    // DB not connected — return empty
  }

  const total  = actions.length
  const urgent = (actions as Array<{ urgente: boolean }>).filter(a => a.urgente).length

  return NextResponse.json({ actions, total, urgent })
})
