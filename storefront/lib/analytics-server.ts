import "server-only"
import type { AnalyticsEvents } from "./analytics"
import { getPostHogServer } from "./posthog-server"
import { getPostHogAnonId } from "./posthog-cookies"
import { getAuthToken } from "lib/medusa/cookies"
import { retrieveCustomer } from "lib/medusa/customer"

async function resolveDistinctId(): Promise<string | undefined> {
  const token = await getAuthToken()
  if (token) {
    // Authenticated: resolve customer ID for tracking
    try {
      const customer = await retrieveCustomer()
      return customer?.id
    } catch {
      return undefined
    }
  }

  return await getPostHogAnonId()
}

export async function trackServer<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
  distinctId?: string,
): Promise<void> {
  const posthog = getPostHogServer()
  if (!posthog) return

  const id = distinctId || (await resolveDistinctId())
  if (!id) return

  posthog.capture({
    distinctId: id,
    event,
    properties: properties as Record<string, unknown>,
  })
}

export async function trackGoal<E extends keyof AnalyticsEvents>(
  event: E,
  value?: number,
  distinctId?: string,
): Promise<void> {
  const posthog = getPostHogServer()
  if (!posthog) return

  const id = distinctId || (await resolveDistinctId())
  if (!id) return

  posthog.capture({
    distinctId: id,
    event,
    properties: {
      ...(value !== undefined ? { value } : {}),
    },
  })
}
