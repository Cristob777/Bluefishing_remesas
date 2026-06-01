// Keep config access build-safe: throwing at module load breaks Next.js page-data
// collection for unrelated routes during deploy. Route-level code should enforce
// required vars where execution actually depends on them.

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
    url:         optional('NEXT_PUBLIC_SUPABASE_URL'),
    // Accept both old name (ANON_KEY) and new Supabase name (PUBLISHABLE_KEY)
    anonKey:     optional('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || optional('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRole: isServer ? optional('SUPABASE_SERVICE_ROLE_KEY')   : '',
  },
  anthropic: {
    apiKey: isServer ? optional('ANTHROPIC_API_KEY') : '',
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
