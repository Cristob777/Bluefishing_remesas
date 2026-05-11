import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import type { ExtractedEmail } from './imap-extractor'

export type { ExtractedEmail }

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.VERCEL_URL)   return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getBaseUrl()}/api/gmail-callback`,
  )
}

export function getAuthUrl(state: string): string {
  const oauth2 = makeOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',
    scope:       ['https://www.googleapis.com/auth/gmail.modify'],
    state,
  })
}

async function isAlreadyProcessed(messageId: string): Promise<boolean> {
  const { data } = await sb()
    .from('agent_logs')
    .select('id')
    .eq('accion', 'IMAP_EMAIL_PROCESSED')
    .contains('payload', { message_id: messageId })
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function markProcessed(messageId: string, account: string, subject: string): Promise<void> {
  await sb().from('agent_logs').insert({
    agent_name: 'imap_poller',
    accion:     'IMAP_EMAIL_PROCESSED',
    payload:    { message_id: messageId, account, subject },
    resultado:  'SUCCESS',
  })
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

// Extracts plain email from "Display Name <email@domain.com>" or "email@domain.com"
function parseEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1].trim() : raw.trim()
}

function extractBody(payload: {
  mimeType?: string | null
  body?: { data?: string | null } | null
  parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null }> | null
}): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data)
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return htmlToText(decodeBase64(payload.body.data))
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part as Parameters<typeof extractBody>[0])
      if (text) return text
    }
  }
  return ''
}

interface AccountConfig {
  label:        'sebastian' | 'hector'
  refreshToken: string
}

function getAccounts(): AccountConfig[] {
  const accounts: AccountConfig[] = []
  if (process.env.GMAIL_REFRESH_TOKEN_CRISTOBAL) {
    accounts.push({ label: 'sebastian', refreshToken: process.env.GMAIL_REFRESH_TOKEN_CRISTOBAL })
  }
  if (process.env.GMAIL_REFRESH_TOKEN_SEBASTIAN) {
    accounts.push({ label: 'sebastian', refreshToken: process.env.GMAIL_REFRESH_TOKEN_SEBASTIAN })
  }
  if (process.env.GMAIL_REFRESH_TOKEN_HECTOR) {
    accounts.push({ label: 'hector', refreshToken: process.env.GMAIL_REFRESH_TOKEN_HECTOR })
  }
  return accounts
}

async function pollGmailAccount(account: AccountConfig): Promise<ExtractedEmail[]> {
  const oauth2 = makeOAuth2Client()
  oauth2.setCredentials({ refresh_token: account.refreshToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2 })
  const emails: ExtractedEmail[] = []

  // List UNREAD messages in INBOX
  const listRes = await gmail.users.messages.list({
    userId:      'me',
    q:           'is:unread in:inbox',
    maxResults:  3,
  })

  const messages = listRes.data.messages ?? []

  for (const msg of messages) {
    if (!msg.id) continue

    const full = await gmail.users.messages.get({
      userId: 'me',
      id:     msg.id,
      format: 'full',
    })

    const msgData   = full.data
    const headers   = msgData.payload?.headers ?? []
    const messageId = getHeader(headers, 'message-id').replace(/[<>]/g, '') || msg.id

    if (await isAlreadyProcessed(messageId)) {
      // Mark as read so we skip it next time
      await gmail.users.messages.modify({
        userId: 'me',
        id:     msg.id,
        requestBody: { removeLabelIds: ['UNREAD'] },
      })
      continue
    }

    const subject  = getHeader(headers, 'subject')
    const from     = parseEmail(getHeader(headers, 'from'))
    const to       = parseEmail(getHeader(headers, 'to'))
    const dateStr  = getHeader(headers, 'date')
    const bodyText = extractBody(msgData.payload ?? {}).slice(0, 8000)

    const attachments = (msgData.payload?.parts ?? [])
      .filter(p => p.filename && p.filename.length > 0)
      .map(p => ({
        filename:    p.filename ?? 'attachment',
        contentType: p.mimeType ?? 'application/octet-stream',
        size:        p.body?.size ?? 0,
      }))

    const extracted: ExtractedEmail = {
      messageId,
      subject,
      from,
      to: to || 'me',
      date:     dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
      bodyText,
      account:  account.label,
      attachments,
    }

    emails.push(extracted)

    // Mark as read
    await gmail.users.messages.modify({
      userId: 'me',
      id:     msg.id,
      requestBody: { removeLabelIds: ['UNREAD'] },
    })

    await markProcessed(messageId, account.label, subject)
  }

  return emails
}

async function forwardToWebhook(email: ExtractedEmail): Promise<void> {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  const baseUrl   = process.env.NEXTAUTH_URL ?? vercelUrl ?? 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/webhook/email`, {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'x-webhook-secret': process.env.WEBHOOK_SECRET ?? '',
    },
    body: JSON.stringify({
      email_id:            email.messageId,
      email_from:          email.from,
      email_to:            email.to,
      email_subject:       email.subject,
      email_body:          email.bodyText,
      email_date:          email.date,
      account:             email.account,
      attachment_filename: email.attachments[0]?.filename ?? null,
      attachment_count:    email.attachments.length,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Webhook ${res.status}: ${text.slice(0, 200)}`)
  }
}

export async function pollAllGmailAccounts(): Promise<{ processed: number; errors: string[] }> {
  const accounts = getAccounts()
  if (!accounts.length) {
    throw new Error('No Gmail accounts configured. Set GMAIL_REFRESH_TOKEN_CRISTOBAL, _SEBASTIAN, or _HECTOR')
  }

  let processed = 0
  const errors: string[] = []

  for (const account of accounts) {
    try {
      const emails = await pollGmailAccount(account)
      processed += emails.length

      for (const email of emails) {
        try {
          await forwardToWebhook(email)
        } catch (e) {
          errors.push(`Forward failed for ${email.messageId}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    } catch (e) {
      const msg = `Gmail error [${account.label}]: ${e instanceof Error ? e.message : String(e)}`
      errors.push(msg)

      await sb().from('agent_logs').insert({
        agent_name:    'imap_poller',
        accion:        'GMAIL_API_ERROR',
        payload:       { account: account.label },
        resultado:     'ERROR',
        error_mensaje: msg,
      })
    }
  }

  return { processed, errors }
}
