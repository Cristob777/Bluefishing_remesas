---
description: Scaffold a new Claude agent for the Bluefishing pipeline
---

Create a new agent for the Bluefishing import pipeline. Ask the user for:

1. **Agent name** (snake_case, e.g. `payment_reminder`)
2. **What it detects** (email category or event trigger)
3. **What it does** (what it reads/writes in Supabase)
4. **Tools needed** (`supabase_execute_sql`, `get_fx_rate`, or both)

Then create two files:

### File 1: `agents/{name}.yaml`
Follow the anonymized template (no real emails, RUTs, names, bank accounts).
Reference the customs agency email as `CUSTOMS_AGENCY_EMAIL` env var if needed.
Use model `claude-opus-4-7`.

### File 2: `apps/web/lib/agents/{name}.ts`
Implement the agent using the `runAgentLoop` function from `@/lib/agents/runner`.
Define the system prompt, tools array, and tool handlers (supabase queries, CMF API calls).
Export a `run{AgentName}Agent(payload)` function.

### File 3: Update `apps/web/lib/managed-agents.ts`
Add the new agent to the `categoryToAgent` map with its email classification category.

After creating the files, show the user what was created and remind them to:
- Add the new email category to `apps/web/lib/email-classifier.ts`
- Set any new environment variables in Vercel dashboard
