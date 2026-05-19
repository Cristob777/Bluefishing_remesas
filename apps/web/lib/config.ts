// Validates required env vars at module load time.
// Any missing var throws immediately — better a startup crash than a silent wrong role.

function require(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

function list(key: string): string[] {
  return optional(key).split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

// Only validate on server (not during Next.js edge/client builds)
const isServer = typeof window === 'undefined'

export const config = {
  supabase: {
    url:         isServer ? require('NEXT_PUBLIC_SUPABASE_URL')    : optional('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey:     isServer ? require('NEXT_PUBLIC_SUPABASE_ANON_KEY') : optional('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRole: isServer ? require('SUPABASE_SERVICE_ROLE_KEY')   : '',
  },
  anthropic: {
    apiKey: isServer ? require('ANTHROPIC_API_KEY') : '',
  },
  auth: {
    ownerEmails:  list('OWNER_EMAILS'),
    financeEmails: list('FINANCE_EMAILS'),
  },
  email: {
    allowedDomains: list('ALLOWED_EMAIL_DOMAINS'),
    webhookSecret:  optional('WEBHOOK_SECRET'),
    cronSecret:     optional('CRON_SECRET'),
  },
  classifier: {
    supplierNames:  optional('SUPPLIER_NAMES', 'known suppliers'),
    customsAgency:  optional('CUSTOMS_AGENCY_NAME', 'customs agency'),
    ownerName:      optional('OWNER_NAME', 'owner'),
    financeName:    optional('FINANCE_NAME', 'finance manager'),
  },
  app: {
    baseUrl: optional('NEXTAUTH_URL', optional('VERCEL_URL') ? `https://${optional('VERCEL_URL')}` : 'http://localhost:3000'),
  },
} as const
