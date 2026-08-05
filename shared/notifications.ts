import webpush from 'web-push'
import type { PushSubscriptionRecord } from './types'

export interface NotificationsEnv {
  RESEND_API_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
}

export async function sendAlertEmail(
  env: NotificationsEnv,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Carlog <alertas@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    throw new Error(`Resend request failed (${res.status}): ${await res.text()}`)
  }
}

export async function sendWebPush(
  env: NotificationsEnv,
  subscription: PushSubscriptionRecord,
  title: string,
  body: string,
): Promise<void> {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keysP256dh,
        auth: subscription.keysAuth,
      },
    },
    JSON.stringify({ title, body }),
  )
}
