# Company Pages Design Spec

**Date:** 2026-03-30
**Scope:** Three static company pages — About, Contact, FAQ — built from TailwindPlus components, scaffolded with placeholder content.

---

## Architecture

All three pages are standalone static RSC routes under `storefront/app/`. They share the existing site navbar/footer via the root layout. No new data fetching, no Medusa API calls. Components are co-located per page in `storefront/components/about/`, `storefront/components/contact/`, and `storefront/components/faq/`.

Color token: `indigo-600` / `primary-*` (matches globals.css).

---

## Page 1: About (`/about`)

**TailwindPlus base:** Marketing > Page Examples > About Pages > "With image tiles"

Sections (top to bottom):

| Section | TailwindPlus Source | Content |
|---|---|---|
| Mission hero | Content Sections > "With image titles" | Heading + 2-para description, placeholder image grid |
| Values grid | Marketing Page Sections > (inline with About page) | 4 values with icons |
| Stats bar | Marketing > Page Sections > Stats > "Simple" | 3 stats (placeholder numbers) |
| Team grid | Marketing > Page Sections > Team Sections > "With medium images" | 4–6 team member cards |

**Files:**
- `storefront/app/about/page.tsx` — route, metadata
- `storefront/components/about/about-mission.tsx` — hero/mission section
- `storefront/components/about/about-values.tsx` — values grid
- `storefront/components/about/about-stats.tsx` — stats bar
- `storefront/components/about/about-team.tsx` — team grid

---

## Page 2: Contact (`/contact`)

**TailwindPlus base:** Marketing > Page Sections > Contact Sections > "Simple centered"

Sections (top to bottom):

| Section | TailwindPlus Source | Content |
|---|---|---|
| Contact form | Contact Sections > "Simple centered" | Name, email, message, submit button |
| Support channels | (inline with Simple centered) | Customer Support, Wholesale, Returns — each with email |

**Files:**
- `storefront/app/contact/page.tsx` — route, metadata
- `storefront/components/contact/contact-form.tsx` — `'use client'` form with basic controlled inputs
- `storefront/components/contact/contact-channels.tsx` — support channel cards

---

## Page 3: FAQ (`/faq`)

**TailwindPlus base:** Marketing > Page Sections > FAQs > "Two columns with centered introduction"

Sections (top to bottom):

| Section | TailwindPlus Source | Content |
|---|---|---|
| Intro header | (inline with FAQ section) | "Frequently asked questions" heading + sub-copy |
| Two-column FAQ grid | FAQs > "Two columns with centered introduction" | 8 placeholder Q&A pairs across 4 categories |

FAQ categories (placeholder): Shipping & Delivery, Returns & Refunds, Products, Payment & Security.

**Files:**
- `storefront/app/faq/page.tsx` — route, metadata
- `storefront/components/faq/faq-section.tsx` — full FAQ grid with intro

---

## Shared Conventions

- Named exports only (`export function ...`)
- RSC-first; `'use client'` only on the contact form
- `clsx` for conditional classes
- Indigo as accent color matching existing `--color-primary-*` tokens
- No real images — use placeholder image URLs (`https://images.unsplash.com/...`) or gray placeholder divs
- No Medusa API calls on any page
- Add `metadata` exports on all three `page.tsx` files

---

## Implementation Strategy

Three independent tracks — no shared files between them. Safe to build in parallel using git worktrees + subagents.

| Track | Worktree | Files |
|---|---|---|
| A: About | `worktrees/about` | `app/about/`, `components/about/` |
| B: Contact | `worktrees/contact` | `app/contact/`, `components/contact/` |
| C: FAQ | `worktrees/faq` | `app/faq/`, `components/faq/` |

After all three complete, commits are cherry-picked onto a single Graphite branch and submitted via `gt submit --stack`.
