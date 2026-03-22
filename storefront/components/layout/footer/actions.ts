"use server"

import { sdk } from "lib/medusa"
import { getAuthHeaders } from "lib/medusa/cookies"
import { trackServer } from "lib/analytics-server"

export type NewsletterResult = {
  success?: boolean
  isNewSubscriber?: boolean
  error?: string
} | null

export async function subscribeToNewsletter(
  email: string
): Promise<NewsletterResult> {
  const headers = await getAuthHeaders()

  try {
    const { subscriber, isNewSubscriber } = await sdk.client.fetch<{
      subscriber: { id: string; email: string }
      isNewSubscriber: boolean
    }>("/store/newsletter/subscribe", {
      method: "POST",
      headers,
      body: {
        email: email.toLowerCase(),
        source: "footer" as const,
      },
    })

    await trackServer("newsletter_subscribed", {
      source: "footer",
      is_new_subscriber: isNewSubscriber,
    }).catch(() => {})

    return { success: true, isNewSubscriber }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Subscription failed"

    await trackServer("newsletter_subscribe_failed", {
      source: "footer",
      error: errorMessage,
    }).catch(() => {})

    return { error: errorMessage }
  }
}
