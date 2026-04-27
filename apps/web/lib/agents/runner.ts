import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface AgentRunResult {
  session_id: string
  agent_name: string
  status: 'completed' | 'error'
  result?: unknown
  error?: string
}

type ToolHandler = (input: unknown) => Promise<unknown>

export async function runAgentLoop(params: {
  agentName: string
  systemPrompt: string
  tools: Anthropic.Tool[]
  toolHandlers: Record<string, ToolHandler>
  input: unknown
  remesaId?: string
  maxTokens?: number
}): Promise<AgentRunResult> {
  const sessionId = `${params.agentName}_${Date.now()}`
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  async function logToSupabase(accion: string, payload: unknown, resultado: string, errorMsg?: string) {
    try {
      await supabase.from('agent_logs').insert({
        agent_name: params.agentName,
        session_id: sessionId,
        remesa_id: params.remesaId ?? null,
        accion,
        payload,
        resultado,
        error_mensaje: errorMsg ?? null,
      })
    } catch { /* silently ignore logging errors */ }
  }

  try {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: JSON.stringify(params.input, null, 2) },
    ]

    let finalResult: unknown = null
    let iterations = 0
    const maxIterations = 30

    while (iterations < maxIterations) {
      iterations++

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: params.maxTokens ?? 4096,
        system: params.systemPrompt,
        tools: params.tools,
        messages,
      })

      messages.push({ role: 'assistant', content: response.content })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        )
        if (textBlock) {
          // Extract JSON from the response text (may be wrapped in prose)
          const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try { finalResult = JSON.parse(jsonMatch[0]) }
            catch { finalResult = { raw: textBlock.text } }
          } else {
            finalResult = { raw: textBlock.text }
          }
        }
        break
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue

          let result: unknown
          try {
            const handler = params.toolHandlers[block.name]
            if (!handler) throw new Error(`Unknown tool: ${block.name}`)
            result = await handler(block.input as unknown)
          } catch (err) {
            result = { error: err instanceof Error ? err.message : String(err) }
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        }

        messages.push({ role: 'user', content: toolResults })
      }
    }

    await logToSupabase('AGENT_COMPLETED', { result: finalResult, iterations }, 'SUCCESS')

    return {
      session_id: sessionId,
      agent_name: params.agentName,
      status: 'completed',
      result: finalResult,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await logToSupabase('AGENT_ERROR', { input: params.input }, 'ERROR', errMsg)
    return { session_id: sessionId, agent_name: params.agentName, status: 'error', error: errMsg }
  }
}
