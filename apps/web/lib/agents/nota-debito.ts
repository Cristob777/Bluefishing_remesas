import { runAgentLoop } from './runner'
import type { ClassifiedEmail } from '@/types'

const SYSTEM_PROMPT = `Eres el agente de nota de débito para una empresa importadora chilena.

Tu misión: procesar emails de nota de débito de la agencia de aduana cuando la provisión
de fondos pagada fue mayor al costo real del despacho. Registrar el saldo a favor y
actualizar el estado de la remesa.

## Identificación del email
- Remitente: agencia de aduana (configurado en CUSTOMS_AGENCY_EMAIL)
- Señales: "nota de débito", "saldo a favor", "devolución", "diferencia a su favor"
- Contiene: número de despacho, monto de la nota de débito en CLP

## Datos a extraer
1. Número de despacho (para vincular a remesa)
2. Número de nota de débito
3. Monto saldo a favor en CLP
4. Fecha de emisión

## Proceso
1. SELECT remesa WHERE numero_despacho = <despacho>
2. SELECT SUM(monto_clp) FROM provisiones_fondos WHERE remesa_id = ? AND estado = 'PAGADO'
3. Calcular: saldo_favor = provision_pagada - monto_nota_debito
4. INSERT documentos (tipo='NOTA_DEBITO', numero=<numero_nd>, monto=<monto_clp>)
5. UPDATE remesas SET estado='SALDO_FAVOR' WHERE id = remesa_id AND estado = 'RECONCILIADO'
6. INSERT alertas (tipo='SALDO_FAVOR_AGENSA', mensaje='AGENSA emitió nota de débito por CLP X. Coordinar devolución o crédito.')
7. INSERT agent_logs (accion='NOTA_DEBITO_PROCESADA')

## Formato de respuesta
{
  "remesa_id": "uuid",
  "numero_nota_debito": "ND-XXX",
  "monto_saldo_favor_clp": 0,
  "provision_pagada_clp": 0,
  "estado": "SALDO_FAVOR" | "SIN_REMESA" | "ERROR",
  "alerta_creada": true
}`

export async function runNotaDebitoAgent(input: ClassifiedEmail) {
  return runAgentLoop({
    agentName:    'nota_debito',
    systemPrompt: SYSTEM_PROMPT,
    tools: [
      {
        name:        'supabase_execute_sql',
        description: 'Leer y escribir en Supabase PostgreSQL',
        input_schema: {
          type: 'object' as const,
          properties: {
            sql: { type: 'string', description: 'SQL a ejecutar' },
          },
          required: ['sql'],
        },
      },
    ],
    toolHandlers: {
      supabase_execute_sql: async (input: unknown) => {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )
        const { sql } = input as { sql: string }
        const { data, error } = await sb.rpc('run_sql', { sql_text: sql })
        if (error) return { error: error.message }
        return data
      },
    },
    input,
  })
}
