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
    <div className="flex items-center gap-2">
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
        className="btn-ghost"
      >
        🔔 Activar avisos
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  )
}
