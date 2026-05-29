'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

export function LoginButton({ label = 'Ingresar' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full justify-center mt-1"
      style={{ opacity: pending ? 0.75 : 1, cursor: pending ? 'not-allowed' : 'pointer' }}
    >
      {pending ? (
        <>
          <Loader2 size={15} className="animate-spin" />
          Enviando…
        </>
      ) : label}
    </button>
  )
}
