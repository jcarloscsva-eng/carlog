import webpush from 'web-push'
import { sendEmail, type EmailEnv } from './email'
import type { PushSubscriptionRecord } from './types'

export interface NotificationsEnv extends EmailEnv {
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
}

/** Alias histórico — usa shared/email.ts, sin dependencias de Node. */
export const sendAlertEmail = sendEmail

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
