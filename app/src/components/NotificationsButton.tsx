import { useEffect, useState } from 'react'
import { getPushSubscriptionState, pushSupported, subscribeToPush } from '../lib/push'

export function NotificationsButton() {
  const [state, setState] = useState<'subscribed' | 'not-subscribed' | 'unsupported' | 'loading'>(
    'loading',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pushSupported()) {
      setState('unsupported')
      return
    }
    getPushSubscriptionState().then(setState)
  }, [])

  if (state === 'unsupported' || state === 'subscribed') return null

  return (
    <button
      onClick={async () => {
        setError(null)
        try {
          await subscribeToPush()
          setState('subscribed')
        } catch (err) {
          setError((err as Error).message)
        }
      }}
      title={error ?? undefined}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
    >
      🔔 Activar avisos
    </button>
  )
}
