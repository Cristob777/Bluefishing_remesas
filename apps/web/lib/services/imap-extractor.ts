import { ImapFlow } from 'imapflow'
import { createClient } from '@supabase/supabase-js'

export interface ExtractedEmail {
  messageId:   string
  subject:     string
  from:        string
  to:          string
  date:        string
  bodyText:    string
  account:     'sebastian' | 'hector'
  attachments: Array<{ filename: string; contentType: string; size: number }>
}

interface ImapAccount {
  label:    'sebastian' | 'hector'
  host:     string
  port:     number
  user:     string
  password: string
}

function getAccounts(): ImapAccount[] {
  const host = process.env.IMAP_HOST ?? ''
  const port = parseInt(process.env.IMAP_PORT ?? '993', 10)
  const accounts: ImapAccount[] = []

  if (process.env.IMAP_USER_SEBASTIAN && process.env.IMAP_PASS_SEBASTIAN) {
    accounts.push({ label: 'sebastian', host, port, user: process.env.IMAP_USER_SEBASTIAN, password: process.env.IMAP_PASS_SEBASTIAN })
  }
  if (process.env.IMAP_USER_HECTOR && process.env.IMAP_PASS_HECTOR) {
    accounts.push({ label: 'hector', host, port, user: process.env.IMAP_USER_HECTOR, password: process.env.IMAP_PASS_HECTOR })
  }
  return accounts
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
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

// Minimal HTML → plain text without DOMParser (server-safe)
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

export async function pollImapAccount(account: ImapAccount): Promise<ExtractedEmail[]> {
  const client = new ImapFlow({
    host:   account.host,
    port:   account.port,
    secure: true,
    auth:   { user: account.user, pass: account.password },
    logger: false,
  })

  const emails: ExtractedEmail[] = []
  await client.connect()

  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      // Fetch UNSEEN messages with full source
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true, flags: true })) {
        if (!msg.source) continue

        // Parse raw MIME with Node's built-in approach (avoid mailparser type issues)
        const raw = msg.source.toString('utf8')

        // Extract headers via regex (reliable for our use case)
        const getHeader = (name: string) => {
          const match = raw.match(new RegExp(`^${name}:\\s*(.+)`, 'mi'))
          return match?.[1]?.trim() ?? ''
        }

        const messageId = getHeader('Message-ID').replace(/[<>]/g, '') || `${account.user}-${msg.seq}-${Date.now()}`

        if (await isAlreadyProcessed(messageId)) {
          await client.messageFlagsAdd({ seq: msg.seq }, ['\\Seen'])
          continue
        }

        // Extract body: find first text/plain or text/html part
        let bodyText = ''
        const textPlainMatch = raw.match(/Content-Type:\s*text\/plain[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\n([\s\S]+?)(?=--|\z)/i)
        const textHtmlMatch  = raw.match(/Content-Type:\s*text\/html[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\n([\s\S]+?)(?=--|\z)/i)

        if (textPlainMatch?.[1]) {
          bodyText = textPlainMatch[1].trim()
        } else if (textHtmlMatch?.[1]) {
          bodyText = htmlToText(textHtmlMatch[1])
        } else {
          // Fallback: use everything after the header block
          const headerEnd = raw.indexOf('\r\n\r\n')
          if (headerEnd !== -1) bodyText = raw.slice(headerEnd + 4, headerEnd + 4 + 4000).trim()
        }

        // Count attachments via Content-Disposition: attachment
        const attachmentMatches = raw.match(/Content-Disposition:\s*attachment[^\r\n]*/gi) ?? []
        const filenameMatches   = raw.match(/filename="([^"]+)"/gi) ?? []

        const extracted: ExtractedEmail = {
          messageId,
          subject:  getHeader('Subject'),
          from:     getHeader('From'),
          to:       getHeader('To') || account.user,
          date:     getHeader('Date') ? new Date(getHeader('Date')).toISOString() : new Date().toISOString(),
          bodyText: bodyText.slice(0, 8000),
          account:  account.label,
          attachments: attachmentMatches.map((_, i) => ({
            filename:    filenameMatches[i]?.match(/"([^"]+)"/)?.[1] ?? `attachment-${i + 1}`,
            contentType: 'application/octet-stream',
            size:        0,
          })),
        }

        emails.push(extracted)
        await client.messageFlagsAdd({ seq: msg.seq }, ['\\Seen'])
        await markProcessed(messageId, account.label, extracted.subject)
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return emails
}

export async function pollAllAccounts(): Promise<{ processed: number; errors: string[] }> {
  const accounts = getAccounts()
  if (!accounts.length) {
    throw new Error('No IMAP accounts configured. Set IMAP_HOST, IMAP_USER_SEBASTIAN/HECTOR, IMAP_PASS_*')
  }

  let processed = 0
  const errors: string[] = []

  for (const account of accounts) {
    try {
      const emails = await pollImapAccount(account)
      processed += emails.length

      for (const email of emails) {
        try {
          await forwardToWebhook(email)
        } catch (e) {
          errors.push(`Forward failed for ${email.messageId}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    } catch (e) {
      const msg = `IMAP error [${account.label}]: ${e instanceof Error ? e.message : String(e)}`
      errors.push(msg)

      await sb().from('agent_logs').insert({
        agent_name:    'imap_poller',
        accion:        'IMAP_CONNECTION_ERROR',
        payload:       { account: account.label, host: account.host },
        resultado:     'ERROR',
        error_mensaje: msg,
      })
    }
  }

  return { processed, errors }
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
