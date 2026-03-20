"use client"

import { useEffect, useRef } from "react"
import posthog from "posthog-js"
import {
  SessionReplayExtensions,
  AnalyticsExtensions,
} from "posthog-js/lib/src/extensions/extension-bundles"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { setPostHogClient } from "lib/analytics"

type Props = {
  children: React.ReactNode
  bootstrapDistinctId: string | null
  bootstrapFlags?: Record<string, boolean | string>
}

export function PostHogProvider({
  children,
  bootstrapDistinctId,
  bootstrapFlags,
}: Props) {
  const prevDistinctId = useRef<string | null>(null)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      defaults: "2026-01-30",
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      session_recording: {
        maskAllInputs: true,
        recordBody: false,
        recordHeaders: false,
      },
      bootstrap: {
        distinctID: bootstrapDistinctId || undefined,
        featureFlags: bootstrapFlags || undefined,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — slim bundle and extension-bundles have separate internal type declarations
      __extensionClasses: {
        ...SessionReplayExtensions,
        ...AnalyticsExtensions,
      },
    })

    setPostHogClient(posthog)
    prevDistinctId.current = bootstrapDistinctId
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle identity transitions (login/logout)
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    if (prevDistinctId.current === bootstrapDistinctId) return

    const wasAuthenticated = prevDistinctId.current?.startsWith("cus_")
    const isAuthenticated = bootstrapDistinctId?.startsWith("cus_")

    if (isAuthenticated && !wasAuthenticated) {
      posthog.identify(bootstrapDistinctId!)
    } else if (!isAuthenticated && wasAuthenticated) {
      posthog.reset()
    }

    prevDistinctId.current = bootstrapDistinctId
  }, [bootstrapDistinctId])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
