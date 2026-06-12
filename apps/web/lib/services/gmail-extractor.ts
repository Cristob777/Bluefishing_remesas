import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/supabase'

// pdf-parse: extract text from digital (non-scanned) PDFs without OCR
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export interface ExtractedEmail {
  messageId:   string
  subject:     string
  from:        string
  to:          string
  date:        string
  bodyText:    string
  account:     string
  attachments: Array<{ filename: string; contentType: string; size: number }>
}

function serviceClient() {
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
  const { data } = await db
    .from('agent_logs')
    .select('id')
    .eq('accion', 'IMAP_EMAIL_PROCESSED')
    .contains('payload', { message_id: messageId })
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function markProcessed(messageId: string, account: string, subject: string): Promise<void> {
  await db.from('agent_logs').insert({
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

// Account label — kept as union for type safety in downstream agents.
// 'ops' is the recommended slot for the Ops Inbox pattern (one shared inbox per company).
// 'owner' and 'finance' replace legacy personal-name slots.
type AccountLabel = 'owner' | 'finance' | 'ops' | string

interface AccountConfig {
  label:        AccountLabel
  refreshToken: string
  email?:       string  // optional, for logging/display only
}

// ── Account loading ────────────────────────────────────────────────────────────
// Primary source: gmail_accounts DB table (connected via /dashboard/settings).
// Fallback: env vars GMAIL_REFRESH_TOKEN_* (backwards compat for existing deployments).

async function getAccountsFromDB(): Promise<AccountConfig[]> {
  try {
    const { data, error } = await serviceClient()
      .from('gmail_accounts')
      .select('account_label, email, refresh_token')
    if (error || !data) return []
    return data.map(row => ({
      label:        row.account_label as AccountLabel,
      refreshToken: row.refresh_token as string,
      email:        row.email ?? undefined,
    }))
  } catch {
    return []
  }
}

function getAccountsFromEnv(): AccountConfig[] {
  const accounts: AccountConfig[] = []
  const seen = new Set<string>()

  function add(token: string | undefined, label: AccountLabel, email?: string) {
    if (token && !seen.has(token)) {
      seen.add(token)
      accounts.push({ label, refreshToken: token, email })
    }
  }

  // Ops Inbox (primary slot for new deployments)
  add(process.env.GMAIL_REFRESH_TOKEN_OPS, 'ops', process.env.GMAIL_EMAIL_OPS)

  // Numbered slots (ACCOUNT_1 through ACCOUNT_8) for multi-account setups
  for (let i = 1; i <= 8; i++) {
    add(
      process.env[`GMAIL_REFRESH_TOKEN_ACCOUNT_${i}`],
      process.env[`GMAIL_LABEL_ACCOUNT_${i}`] ?? `account_${i}`,
      process.env[`GMAIL_EMAIL_ACCOUNT_${i}`],
    )
  }

  return accounts
}

async function getAccounts(): Promise<AccountConfig[]> {
  const dbAccounts  = await getAccountsFromDB()
  const envAccounts = getAccountsFromEnv()

  // DB accounts take priority; env accounts fill in any not already present
  const seen = new Set(dbAccounts.map(a => a.refreshToken))
  const extra = envAccounts.filter(a => !seen.has(a.refreshToken))
  return [...dbAccounts, ...extra]
}

// ── Attachment text extraction — all formats ──────────────────────────────────
//
// Handles every format that suppliers or customs agencies might send:
//   • PDF       — pdf-parse (digital) → Claude Vision fallback (scanned)
//   • Images    — JPG, PNG, WEBP, GIF, HEIC, BMP, TIFF, screenshots
//                 → Claude Vision (native multimodal)
//   • Office    — DOCX (mammoth-lite text strip), XLSX (xlsx library)
//   • Text      — TXT, CSV, HTML, XML → direct UTF-8 decode
//   • Unknown   — attempt Claude Vision; skip silently if unsupported
//
// All extracted content is appended to bodyText so agents see full context.

// MIME types that Claude Vision can handle directly as images
const CLAUDE_IMAGE_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
])

// MIME types we decode as plain text
const PLAIN_TEXT_MIME = new Set([
  'text/plain', 'text/csv', 'text/html', 'text/xml',
  'application/json', 'application/xml', 'application/csv',
])

function mimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    heic: 'image/heic', heif: 'image/heif',
    bmp: 'image/bmp', tiff: 'image/tiff', tif: 'image/tiff',
    txt: 'text/plain', csv: 'text/csv',
    html: 'text/html', htm: 'text/html',
    xml: 'application/xml',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc:  'application/msword',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls:  'application/vnd.ms-excel',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  return map[ext] ?? 'application/octet-stream'
}

async function callClaudeVision(
  b64:      string,
  mimeType: string,
  label:    string,
  isPdf:    boolean,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return ''
  try {
    const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = isPdf
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text',     text: 'Extract all text from this document. Return only the raw text, no commentary.' },
        ]
      : [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: b64 } },
          { type: 'text',  text: 'Extract all visible text from this image. Return only the raw text, no commentary.' },
        ]

    const res = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages:   [{ role: 'user', content }],
    })
    const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
    return text ? `\n\n[${label}: ${text.slice(0, 5000)}]` : ''
  } catch {
    return ''
  }
}

async function extractAttachmentText(buf: Buffer, filename: string, mimeHint: string): Promise<string> {
  const mime     = mimeHint && mimeHint !== 'application/octet-stream' ? mimeHint : mimeFromFilename(filename)
  const b64      = () => buf.toString('base64')
  const tag      = filename

  // ── Plain text formats ──────────────────────────────────────────────────────
  if (PLAIN_TEXT_MIME.has(mime)) {
    const text = buf.toString('utf8').slice(0, 6000).trim()
    return text ? `\n\n[${tag}]\n${text}` : ''
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────
  if (mime === 'application/pdf') {
    try {
      const result = await pdfParse(buf, { max: 10 })
      const text   = (result.text ?? '').trim()
      if (text.length >= 200) return `\n\n[PDF: ${tag}]\n${text.slice(0, 6000)}`
    } catch { /* fall through */ }
    return callClaudeVision(b64(), 'application/pdf', `PDF (OCR): ${tag}`, true)
  }

  // ── Images natively supported by Claude Vision ──────────────────────────────
  if (CLAUDE_IMAGE_MIME.has(mime)) {
    return callClaudeVision(b64(), mime, `Image: ${tag}`, false)
  }

  // ── Images not natively supported (BMP, TIFF, HEIC) ──────────────────────
  // Convert to PNG-compatible base64 isn't feasible in Node without sharp.
  // Attempt Claude Vision anyway — it may still work for some formats.
  if (mime.startsWith('image/')) {
    return callClaudeVision(b64(), 'image/png', `Image (${mime}): ${tag}`, false)
  }

  // ── DOCX — strip XML tags to get raw text ───────────────────────────────────
  if (mime.includes('wordprocessingml') || mime === 'application/msword') {
    try {
      // DOCX is a ZIP — extract word/document.xml and strip tags
      const { default: JSZip } = await import('jszip').catch(() => ({ default: null }))
      if (JSZip) {
        const zip  = await JSZip.loadAsync(buf)
        const xml  = await zip.file('word/document.xml')?.async('string')
        if (xml) {
          const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000)
          if (text.length > 100) return `\n\n[DOCX: ${tag}]\n${text}`
        }
      }
    } catch { /* fall through to Claude */ }
    return callClaudeVision(b64(), 'application/pdf', `DOCX: ${tag}`, true)
  }

  // ── XLSX — extract all cell values as text ───────────────────────────────────
  if (mime.includes('spreadsheetml') || mime.includes('ms-excel')) {
    try {
      const XLSX = await import('xlsx').catch(() => null)
      if (XLSX) {
        const wb   = XLSX.read(buf, { type: 'buffer' })
        const rows: string[] = []
        for (const name of wb.SheetNames) {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name])
          rows.push(`Sheet: ${name}\n${csv}`)
        }
        const text = rows.join('\n\n').slice(0, 6000)
        if (text.length > 50) return `\n\n[XLSX: ${tag}]\n${text}`
      }
    } catch { /* skip */ }
  }

  return ''
}

async function downloadAttachment(
  gmail:     ReturnType<typeof google.gmail>,
  messageId: string,
  attachId:  string,
): Promise<Buffer | null> {
  try {
    const res = await gmail.users.messages.attachments.get({
      userId:       'me',
      messageId,
      id:           attachId,
    })
    const data = res.data.data
    if (!data) return null
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  } catch {
    return null
  }
}

/**
 * Builds a targeted Gmail search query so the poller only fetches emails
 * that are actually relevant to import operations — regardless of how many
 * unread emails exist in the inbox.
 *
 * Strategy: match on KNOWN SENDERS (suppliers + customs agency) OR on
 * SUBJECT KEYWORDS typical of import documents (invoices, DINs, provisions).
 * Without this filter the poller reads the 3 most recent unread emails which
 * might be newsletters, not invoices.
 */
function buildImportQuery(): string {
  const senderParts: string[] = []

  // Customs agency
  const customsEmail = process.env.CUSTOMS_AGENCY_EMAIL
  if (customsEmail) senderParts.push(`from:${customsEmail}`)

  // Supplier emails via env vars
  for (let i = 1; i <= 8; i++) {
    const e = process.env[`SUPPLIER_EMAIL_${i}`]
    if (e) senderParts.push(`from:${e}`)
  }

  // Legacy single-supplier env var
  const chinaEmail = process.env.SUPPLIER_CHINA_EMAIL
  if (chinaEmail) senderParts.push(`from:${chinaEmail}`)

  // Subject keyword patterns common in import documents (Spanish + English)
  const subjectKeywords = [
    'invoice', 'factura', 'proforma',
    '"provision de fondos"', '"provisión de fondos"', '"solicitud de fondos"',
    '"ag aduana"', 'despacho', 'liquidación', 'liquidacion',
    'DIN', '"nota de débito"', '"nota debito"',
    'packing list', 'bill of lading', 'BL',
  ]
  const subjectParts = subjectKeywords.map(k => `subject:${k}`)

  const allParts = [...senderParts, ...subjectParts]

  // Only look at emails from the last 6 months to avoid reprocessing old inbox clutter
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const afterDate = `${sixMonthsAgo.getFullYear()}/${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}/${String(sixMonthsAgo.getDate()).padStart(2, '0')}`

  const filterClause = allParts.length > 0 ? ` (${allParts.join(' OR ')})` : ''
  return `is:unread in:inbox after:${afterDate}${filterClause}`
}

async function pollGmailAccount(account: AccountConfig): Promise<ExtractedEmail[]> {
  const oauth2 = makeOAuth2Client()
  oauth2.setCredentials({ refresh_token: account.refreshToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2 })
  const emails: ExtractedEmail[] = []

  const query = buildImportQuery()

  // List UNREAD messages matching import-specific senders/subjects
  const listRes = await gmail.users.messages.list({
    userId:      'me',
    q:           query,
    maxResults:  50,
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

    const subject = getHeader(headers, 'subject')
    const from    = parseEmail(getHeader(headers, 'from'))
    const to      = parseEmail(getHeader(headers, 'to'))
    const dateStr = getHeader(headers, 'date')
    let   bodyText = extractBody(msgData.payload ?? {}).slice(0, 8000)

    const attachmentParts = (msgData.payload?.parts ?? [])
      .filter(p => p.filename && p.filename.length > 0)

    const attachments = attachmentParts.map(p => ({
      filename:    p.filename ?? 'attachment',
      contentType: p.mimeType ?? 'application/octet-stream',
      size:        p.body?.size ?? 0,
    }))

    // Extract text from ALL attachment types (PDF, images, screenshots, Office docs)
    for (const part of attachmentParts) {
      const attachId = part.body?.attachmentId
      if (!attachId) continue

      const filename = part.filename ?? 'attachment'
      const mimeType = part.mimeType ?? 'application/octet-stream'

      // Skip audio/video — not useful for import operations
      if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) continue

      const buf = await downloadAttachment(gmail, msg.id!, attachId)
      if (!buf) continue

      const extracted = await extractAttachmentText(buf, filename, mimeType)
      if (extracted) bodyText += extracted
    }

    bodyText = bodyText.slice(0, 12000) // extended limit to include PDF content

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
  const accounts = await getAccounts()
  if (!accounts.length) {
    throw new Error('No Gmail accounts configured. Connect one at /dashboard/settings or set GMAIL_REFRESH_TOKEN_* env vars.')
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

      await db.from('agent_logs').insert({
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
