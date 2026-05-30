# SECURITY.md — Deuda y decisiones de seguridad

> Registro de riesgos conocidos, decisiones conscientes, y trabajo pendiente.
> Actualizar cuando se cierra una deuda o aparece una nueva.

---

## Deudas activas

### SEC-001 — Tokens OAuth Gmail en texto plano
**Severidad:** Alta  
**Estado:** Abierto  
**Migración relevante:** `supabase/migrations/010_gmail_accounts.sql`

Los `refresh_token` de Gmail se almacenan sin cifrar en la columna
`gmail_accounts.refresh_token`. La protección actual depende exclusivamente de:
- RLS: solo `service_role` puede leer/escribir la tabla.
- Seguridad del `SUPABASE_SERVICE_ROLE_KEY`.

**Riesgo:** Un leak del `SUPABASE_SERVICE_ROLE_KEY` expone todos los tokens de
Gmail almacenados, permitiendo leer el correo de todas las cuentas conectadas.

**Solución pendiente:** Cifrado a nivel de columna usando
[pgsodium](https://github.com/michelp/pgsodium) o
[Supabase Vault](https://supabase.com/docs/guides/database/vault).  
No implementado porque requiere habilitar la extensión en el proyecto Supabase
y un plan de migración de datos existentes.

---

### SEC-002 — RLS de `reglas` excesivamente permisiva (CERRADA)
**Severidad:** Media  
**Estado:** Cerrado en migración `014_reglas_rls_fix.sql`

La migración 012 creó una policy `FOR ALL TO authenticated` que permitía a
cualquier usuario autenticado (incluyendo rol `warehouse`) crear, modificar o
borrar reglas de automatización.

**Fix aplicado:** Migración `014` restringe INSERT/UPDATE/DELETE a roles
`owner` y `finance` via tabla `user_roles`. SELECT queda abierto a todos.

---

### SEC-003 — `next lint` eliminado en Next.js 16 (INFRAESTRUCTURA)
**Severidad:** Baja  
**Estado:** Trabajado

El comando `next lint` fue eliminado en Next.js 16. El script `npm run lint`
ahora usa `eslint` directamente con `eslint-config-next@15` + ESLint v8.
Si se actualiza `eslint-config-next` a v16, requiere migrar a flat config
(`eslint.config.js`) con ESLint v9.

---

## Decisiones conscientes

### DEC-001 — ALLOWED_ORIGINS via env var, no hardcodeado
Los orígenes CORS permitidos se cargan desde `ALLOWED_ORIGINS` (CSV en env var).
Esto evita comprometer nombres de usuario/proyecto de Vercel en el código fuente.
Documentado en `.env.example`.

### DEC-002 — RUT y datos reales fuera del código
- RUT de la empresa: solo en `.env.local` (gitignoreado). La migración 001
  usa el placeholder `<CONFIGURED_VIA_ENV>`.
- Datos de proveedores: solo en `.env.local` y `seed.dev.sql` (gitignoreado).
- Nombres personales: eliminados del código fuente (gmail-extractor, tests).
