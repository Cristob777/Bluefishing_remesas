import { NextRequest, NextResponse } from 'next/server'

// GET /api/setup/instructions
// Returns a human-readable setup guide for connecting a new importing company.
// Protected by CRON_SECRET so only admins can access it.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl      = process.env.NEXTAUTH_URL ?? 'https://your-deployment.vercel.app'
  const cronSecret   = process.env.CRON_SECRET ? '(set)' : '(NOT SET)'
  const opsConnected = !!process.env.GMAIL_REFRESH_TOKEN_OPS
  const legacySlots  = ['SEBASTIAN', 'HECTOR', 'CRISTOBAL']
    .filter(s => !!process.env[`GMAIL_REFRESH_TOKEN_${s}`])

  const connectedAccounts = [
    opsConnected ? '✅ OPS inbox' : '❌ OPS inbox (not connected)',
    ...legacySlots.map(s => `✅ ${s} (legacy slot)`),
    ...[1,2,3,4,5,6,7,8]
      .filter(i => !!process.env[`GMAIL_REFRESH_TOKEN_ACCOUNT_${i}`])
      .map(i => `✅ ACCOUNT_${i}`),
  ]

  const guide = {
    title: 'Import Workflow Agents — Setup Guide',
    version: '2.0',
    pattern: 'Ops Inbox',

    overview: [
      '1. Create a dedicated Gmail account for import operations (e.g. ops@yourcompany.com)',
      '2. Connect it via OAuth (see oauth_flow below)',
      '3. Each stakeholder sets up a Gmail forwarding filter (see gmail_filter_setup)',
      '4. Configure env vars (see required_env_vars)',
      '5. Redeploy — system starts classifying emails automatically',
    ],

    oauth_flow: {
      step1: `GET ${baseUrl}/api/gmail-auth?account=ops`,
      step1_note: 'Call this endpoint with Authorization: Bearer CRON_SECRET header',
      step2: 'Open the returned URL in browser, log in with the ops inbox account',
      step3: 'Copy the refresh token from the callback page',
      step4: 'Add GMAIL_REFRESH_TOKEN_OPS=<token> to Vercel env vars',
      step5: 'Redeploy',
    },

    gmail_filter_setup: {
      description: 'Each person who receives supplier/customs emails sets up a one-time auto-forward',
      download_filters: `GET ${baseUrl}/api/setup/gmail-filters?forward_to=ops@yourcompany.com`,
      download_note: 'Call with Authorization: Bearer CRON_SECRET — downloads an XML file',
      import_steps: [
        'Open Gmail → Settings (gear icon) → See all settings',
        'Click Filters and Blocked Addresses tab',
        'Click Import filters (bottom of page)',
        'Upload the downloaded XML file',
        'Click Open filters',
        'Check the boxes and click Create filters',
      ],
      manual_alternative: [
        'Gmail Settings → Filters → Create new filter',
        'From: [supplier emails separated by OR]',
        'Action: Forward to ops@yourcompany.com + Never send to spam',
      ],
    },

    required_env_vars: {
      GMAIL_REFRESH_TOKEN_OPS:  'OAuth refresh token for the ops inbox (from step 4 above)',
      GMAIL_EMAIL_OPS:          'Email address of the ops inbox (for logging/display)',
      GOOGLE_CLIENT_ID:         'From Google Cloud Console → APIs → Credentials',
      GOOGLE_CLIENT_SECRET:     'From Google Cloud Console → APIs → Credentials',
      NEXTAUTH_URL:             'Your Vercel deployment URL (e.g. https://myapp.vercel.app)',
      ANTHROPIC_API_KEY:        'From console.anthropic.com',
      NEXT_PUBLIC_SUPABASE_URL: 'From your Supabase project settings',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'From your Supabase project settings',
      SUPABASE_SERVICE_ROLE_KEY: 'From your Supabase project settings (keep secret)',
      WEBHOOK_SECRET:           'Random string (openssl rand -hex 32)',
      CRON_SECRET:              'Random string (openssl rand -hex 32)',
      OWNER_EMAILS:             'Comma-separated list of owner email addresses',
      FINANCE_EMAILS:           'Comma-separated list of finance email addresses',
      SUPPLIER_NAMES:           'Comma-separated supplier names for email classifier',
      SUPPLIER_EMAIL_1:         'First supplier email (add _2, _3... for more)',
      CUSTOMS_AGENCY_EMAIL:     'Customs agency email address',
      CUSTOMS_AGENCY_NAME:      'Customs agency name',
    },

    multi_account: {
      description: 'To monitor additional inboxes (e.g. if a stakeholder prefers not to forward)',
      slots: 'GMAIL_REFRESH_TOKEN_ACCOUNT_1 through ACCOUNT_8',
      label: 'GMAIL_LABEL_ACCOUNT_1 — label assigned to emails from this account (optional)',
      email: 'GMAIL_EMAIL_ACCOUNT_1 — email address for logging (optional)',
    },

    current_status: {
      cron_secret:        cronSecret,
      connected_accounts: connectedAccounts,
      polling_schedule:   'Daily at 08:00 UTC (Vercel Hobby plan)',
      manual_trigger:     `curl -H "Authorization: Bearer CRON_SECRET" ${baseUrl}/api/cron/poll-imap`,
    },
  }

  return NextResponse.json(guide, {
    headers: { 'Content-Type': 'application/json' },
  })
}
