import { NextRequest, NextResponse } from 'next/server'

// GET /api/setup/gmail-filters?forward_to=ops@company.com
//
// Returns a Gmail filter XML file ready to import at:
// Gmail Settings → See all settings → Filters → Import filters
//
// The XML sets up automatic forwarding from all supplier/agency domains
// to the Ops Inbox, so individual stakeholders don't need OAuth access.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const forwardTo     = req.nextUrl.searchParams.get('forward_to') ?? ''
  const supplierNames = (process.env.SUPPLIER_NAMES ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const customsEmail  = process.env.CUSTOMS_AGENCY_EMAIL ?? ''
  const opsEmail      = process.env.GMAIL_EMAIL_OPS ?? forwardTo

  if (!opsEmail) {
    return NextResponse.json(
      { error: 'Set GMAIL_EMAIL_OPS in env or pass ?forward_to=ops@company.com' },
      { status: 400 },
    )
  }

  // Build list of sender patterns to forward
  const senderPatterns: string[] = []

  // Customs agency email
  if (customsEmail) senderPatterns.push(customsEmail)

  // Supplier domains from env (SUPPLIER_EMAILS_1..8)
  for (let i = 1; i <= 8; i++) {
    const email = process.env[`SUPPLIER_EMAIL_${i}`]
    if (email) senderPatterns.push(email)
  }

  // Legacy Bluefishing suppliers
  const supplierEmails = [
    process.env.SUPPLIER_CHINA_EMAIL,
  ].filter((e): e is string => !!e)
  senderPatterns.push(...supplierEmails)

  if (senderPatterns.length === 0) {
    return NextResponse.json(
      { error: 'No supplier emails configured. Set CUSTOMS_AGENCY_EMAIL and SUPPLIER_EMAIL_1..8' },
      { status: 400 },
    )
  }

  const fromQuery = senderPatterns.map(e => `from:${e}`).join(' OR ')
  const now       = new Date().toISOString()

  const xml = `<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns='http://www.w3.org/2005/Atom' xmlns:apps='http://schemas.google.com/apps/2006'>
  <title>Import Workflow Agents — Ops Inbox Filters</title>
  <id>tag:mail.google.com,2008:filters:generated-${Date.now()}</id>
  <updated>${now}</updated>
  <author>
    <name>Import Workflow Agents</name>
  </author>

  <!-- Filter 1: Forward supplier invoices and customs docs to Ops Inbox -->
  <entry>
    <category term='filter'></category>
    <title>Import Ops — forward to ${opsEmail}</title>
    <id>tag:mail.google.com,2008:filter:${Date.now()}</id>
    <updated>${now}</updated>
    <content></content>
    <apps:property name='from' value='${fromQuery}'/>
    <apps:property name='forwardTo' value='${opsEmail}'/>
    <apps:property name='shouldNeverSpam' value='true'/>
  </entry>
</feed>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type':        'application/atom+xml',
      'Content-Disposition': `attachment; filename="import-workflow-gmail-filters.xml"`,
    },
  })
}
