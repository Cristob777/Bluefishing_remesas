import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const VALID_ACCOUNTS = new Set(['cristobal', 'sebastian', 'hector'])

// GET /api/gmail-callback?code=...&state=cristobal
// Google redirects here after user approves OAuth consent
export async function GET(req: NextRequest) {
  const code    = req.nextUrl.searchParams.get('code')
  const account = req.nextUrl.searchParams.get('state') ?? ''

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  // Validate state to prevent open redirect / CSRF via forged callbacks
  if (!VALID_ACCOUNTS.has(account)) {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
  }

  const baseUrl  = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const oauth2   = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/gmail-callback`,
  )

  const { tokens } = await oauth2.getToken(code)
  const refreshToken = tokens.refresh_token

  if (!refreshToken) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem">
        <h2>⚠️ No refresh token received</h2>
        <p>The account may already be authorized. Revoke access at
        <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>
        and try again.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  }

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:2rem;max-width:600px;margin:auto">
      <h2>✅ Autorización exitosa — cuenta: ${account}</h2>
      <p>Copia este refresh token y agrégalo en Vercel como variable de entorno:</p>
      <p><strong>Nombre:</strong> <code>GMAIL_REFRESH_TOKEN_${account.toUpperCase()}</code></p>
      <p><strong>Valor:</strong></p>
      <textarea style="width:100%;height:80px;font-family:monospace;font-size:12px;padding:8px"
        onclick="this.select()">${refreshToken}</textarea>
      <p style="margin-top:1rem">Luego haz redeploy en Vercel y el polling quedará activo.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}
