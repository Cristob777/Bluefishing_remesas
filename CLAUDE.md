# BLUEFISHING AGENTS — Claude Code Master File

## Empresa
- Razón social: MI TIENDA SPA (RUT 76.999.020-8)
- Nombre comercial: BLUEFISHING.CL
- Rubro: Tienda de pesca deportiva, Santiago Chile
- Dirección: Av. Providencia 1208, of. 2106

## Personas
- **Sebastian Cáceres** (OWNER): gestiona proveedores, recibe invoices,
  calcula montos con Excel, instruye a Hector cuánto pagar.
  Emails: sebastian.caceres@bluefishing.cl / sebastiancaceresortizar@gmail.com
- **Hector Bluefishing** (GERENTE FINANCIERO): recibe instrucción de Sebastian,
  emite Orden de Pago al banco, gestiona aduana y provisión de fondos.
  Email: hector@bluefishing.cl

## Proveedores
| Proveedor | País | Moneda | Contacto |
|---|---|---|---|
| AMIGOS COMPANY LIMITED | China | USD/CNH | Coco Yao — amigoscn.coco@gmail.com |
| MEIHO CHEMICAL INDUSTRY | Japón | JPY | — |
| VARIVAS CO., LTD. | Japón | JPY | — |

## Agencia de Aduana
AG. AD. ALEX AVSOLOMOVICH CALLEJAS LTDA. (AGENSA)
- RUT: 88.527.900-7 · contabilidad@agensa.cl
- Cuentas: BCI 15015629 / Chile 101-01393-00 / Itau 200863682

## Flujo de Remesas (5 etapas)
```
I.   Invoice proveedor → llega a SEBASTIAN → calcula con Excel
     → email a Hector "pagar X usd/yenes"

II.  HECTOR emite Orden de Pago al banco
     Condiciones variables: 30/70, 50/50, 100%, múltiples cuotas

III. Provisión de fondos AGENSA → llega a HECTOR (o Sebastian o ambos)
     Email: "Ag Aduana, Cliente:MI TIENDA SPA, solicitud de Fondos despacho:XXXXX"
     URGENTE si vence en ≤ 3 días

IV.  Recepción mercadería → BODEGA cuenta físicamente por SKU
     → Ingresa a Bsale con cantidad real recibida (no esperar diferencias)
     → Si hay diferencia → notifica a Sebastian → Sebastian genera reclamo

V.   DIN + Facturas AA → llega a HECTOR
     Reconciliar provisión pagada vs costo real
     Archivar expediente completo
```

## Stack Técnico
```
AGENTES:    Claude Managed Agents (platform.claude.com)
DB:         Supabase (PostgreSQL + Auth + Storage + Realtime)
FRONTEND:   Next.js 15 App Router → Vercel
TRIGGERS:   Next.js API Routes (webhooks) → Vercel
CÓDIGO:     GitHub → auto-deploy
```

## Managed Agents — 4 agentes definidos en /agents/
- invoice_intake.yaml     → detecta invoices en email de Sebastian
- customs_funds.yaml      → detecta provisiones de AGENSA
- din_reconciliation.yaml → detecta DIN post-despacho
- landed_cost.yaml        → calcula costo real por SKU

## Monedas
USD, JPY, EUR, CNY, CNH (CNH = alias CNY para FX)
FX oficial: CMF Chile API — https://api.cmfchile.cl

## Reglas críticas
1. FX = fecha del PAGO, no del invoice
2. Payment schedule es variable por proveedor (no siempre 30/70)
3. Bsale usa cantidad_recibida, nunca cantidad_invoice
4. Diferencias de stock → notificar Sebastian → reclamo en paralelo, no bloquear
5. Provisión de fondos → puede llegar a Sebastian, Hector, o ambos → deduplicar
6. Operaciones > CLP 5M → requieren aprobación humana
7. Audit trail inmutable en todas las operaciones financieras

## Comandos
```bash
# Dev
npm run dev                    # Next.js :3000
npm run db:migrate             # aplicar migraciones Supabase

# Deploy
git push origin main           # auto-deploy Vercel + agents

# Agentes (configurar en platform.claude.com una vez)
# Ver /agents/*.yaml para las definiciones
```

## Variables de entorno requeridas
Ver .env.example — nunca commitear.
Secrets en Vercel dashboard + Anthropic Credential Vaults.
