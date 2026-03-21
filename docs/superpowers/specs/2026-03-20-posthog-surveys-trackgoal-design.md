# PostHog Surveys & trackGoal() — Design Spec

**Date:** 2026-03-20
**Status:** Draft
**Scope:** Storefront only — no backend changes
**Depends on:** PostHog integration (PR #29, merged)

## Problem

The PostHog integration shipped 45 typed events, feature flags, session replay, and web vitals — but two features were explicitly deferred:

1. **Surveys** — post-purchase NPS and cart abandonment exit surveys. These were deferred because they require loading the PostHog surveys extension, which adds to the client bundle. The extension loads lazily now (PostHog changed this since the original spec), so the bundle concern is resolved.

2. **`trackGoal()`** — a thin wrapper for tagging events as experiment conversion goals. Without this, feature flags exist but there's no way to measure experiment outcomes. This completes the experiments infrastructure.

## Solution

### 1. Surveys — no code change needed

Surveys work automatically with `posthog-js` >= 1.81.3. The storefront uses `^1.363.1`, well above the minimum. No `opt_in_site_apps` or other config change is needed — surveys are enabled by default unless explicitly disabled with `disable_surveys: true` (which is not set in our provider).

**Zero storefront code changes for surveys.** Both surveys are configured entirely in PostHog.

### 2. Post-purchase NPS survey

**Created in:** PostHog dashboard (or via MCP `survey-create` if available)

| Setting | Value |
|---------|-------|
| **Name** | Post-purchase NPS |
| **Type** | NPS (0-10 rating scale, built-in PostHog type) |
| **Question 1** | "How likely are you to recommend us to a friend or colleague?" |
| **Question 2** | Open text — "What's the main reason for your score?" |
| **Targeting** | URL contains `/order/confirmed/` |
| **Display** | Show once per user (PostHog deduplicates by `distinct_id`) |
| **Delay** | 2 seconds after page load |

No storefront code needed. PostHog JS renders the survey widget automatically when targeting conditions match.

### 3. Cart abandonment exit survey

**Created in:** PostHog dashboard (or via MCP `survey-create` if available)

| Setting | Value |
|---------|-------|
| **Name** | Checkout abandonment |
| **Type** | Multiple choice |
| **Question** | "What stopped you from completing your purchase?" |
| **Choices** | "Just browsing", "Price too high", "Shipping costs/options", "Found it cheaper elsewhere", "Payment method not available", "Technical issue", "Other" |
| **Targeting** | URL is `/checkout` |
| **Display conditions** | Show on page leave (`$pageleave` event) |
| **Frequency** | Once per user per 30 days |

No storefront code needed.

### 4. `trackGoal()` wrapper

**File:** `storefront/lib/analytics-server.ts` (co-located with `trackServer` to avoid coupling the flags module to analytics)

Add a `trackGoal()` function that wraps `trackServer` and tags events with the correct PostHog experiment property. PostHog links goal events to experiments via `$feature/<flag-key>` properties — not `$feature_flag_response` (which is for exposure events only).

```typescript
export async function trackGoal<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
  experiment: { flagKey: string; variant: string },
): Promise<void> {
  await trackServer(event, {
    ...properties,
    [`$feature/${experiment.flagKey}`]: experiment.variant,
  } as AnalyticsEvents[E])
}
```

**Usage pattern** (not wired yet — infrastructure only):
```typescript
const variant = await getFeatureFlag('new-checkout-flow', distinctId)
// ... user completes checkout ...
await trackGoal('order_completed', { order_id, order_total, ... }, {
  flagKey: 'new-checkout-flow',
  variant: String(variant),
})
```

The caller evaluates the flag first (which auto-sends the `$feature_flag_called` exposure event via `posthog-node`), then captures the goal event with the flag/variant tag. PostHog correlates these to calculate experiment metrics.

## Files Changed

| File | Change |
|------|--------|
| `storefront/lib/analytics-server.ts` | Add `trackGoal()` function |

No changes needed for `posthog-provider.tsx` — surveys work out of the box with the current config.

## Survey Fallback

If surveys cannot be created via the PostHog MCP server (`mcp__posthog__survey-create`), add the survey configurations to `TODO.md` with exact settings so they can be created manually in the PostHog dashboard.

## Testing

1. Run `cd storefront && bun run build` — must pass with no type errors
2. Visit `/order/confirmed/[any-order-id]` — verify NPS survey appears after 2 seconds (requires survey to be active in PostHog)
3. Visit `/checkout` and navigate away — verify exit survey appears (requires survey to be active in PostHog)
4. Verify `trackGoal` is exported from `lib/analytics-server.ts` and accepts typed events with experiment flag/variant
5. Verify no Lighthouse regression — surveys extension should load lazily

## Out of Scope

- Wiring `trackGoal()` into specific server actions (no experiments running yet)
- Custom survey UI (PostHog's built-in widget is sufficient)
- Survey analytics dashboards (created in PostHog UI as responses come in)
