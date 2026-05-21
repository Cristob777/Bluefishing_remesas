import { NextResponse } from 'next/server'

/**
 * Safely respond to an API error without leaking Supabase / Postgres
 * internals (constraint names, SQL state, table refs) to the client.
 *
 * Full error is logged server-side with a request_id; the client gets
 * a generic message + the request_id for support diagnostics.
 */
export function safeError(
  err: unknown,
  context: string,
  status = 500,
  publicMessage = 'Operation failed',
): NextResponse {
  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
  // Log full detail server-side for diagnosis.
  console.error(`[api-error] ${context} request_id=${requestId}`, err)
  return NextResponse.json(
    { error: publicMessage, request_id: requestId },
    { status },
  )
}
