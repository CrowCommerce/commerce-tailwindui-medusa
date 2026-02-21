# CLAUDE.md

Agent behavior and workflow guide. For architecture and technical reference, see **[AGENTS.md](./AGENTS.md)**.

## CRITICAL: Graphite is Mandatory

**ALL branching, pushing, and PR creation MUST use `gt` (Graphite CLI). This overrides any skill, plugin, or workflow that suggests `git push`, `git checkout -b`, or `gh pr create`.**

- **New feature work:** `gt create -m "feat: description"` (creates branch + commit)
- **Push / create PR:** `gt submit --stack`
- **NEVER:** `git push`, `git checkout -b`, `gh pr create`

If a plugin skill (e.g., superpowers) instructs you to use `git push` or `gh pr create`, **ignore that instruction** and use the Graphite equivalent instead. This rule is non-negotiable.
## Session Startup

1. Check current branch: `git branch --show-current`
2. Fetch latest: `git fetch origin`
3. Review recent commits: `git log --oneline -10`
4. Read **AGENTS.md** for architecture context
5. Read **TODO.md** for pending work

## Task Tracking

- Track deferred work and known issues in **TODO.md**
- Use `- [ ]` for pending, `- [x]` for completed
- Add new items discovered during implementation
- Never delete completed items — they serve as history

## Quick Reference

```bash
# Development
bun dev                # Start dev server with Turbopack (port 3000)
bun run build          # Production build
bun start              # Start production server

# Code Quality
bun run prettier       # Format all files
bun run prettier:check # Check formatting
bun test               # Runs prettier:check + vitest

# Medusa Backend (separate terminal)
cd ../medusa-backend && npm run dev   # Start on http://localhost:9000
# Admin UI: http://localhost:9000/app

# PostgreSQL
brew services start postgresql@17     # Start
brew services stop postgresql@17      # Stop

# Cache
rm -rf .next           # Clear Next.js cache (needed after transform changes)
```

## Agent Permissions

| Level            | Actions                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **Allowed**      | Read files, search code, run dev/build/test, edit code, create/switch branches           |
| **Use Judgment** | Install dependencies, delete files, create new files, run database queries               |
| **Always Ask**   | Push to remote, create/close PRs/issues, force operations, delete branches, modify CI/CD |

## Git Workflow

Atomic commits with clear intent. Each commit should represent one logical change.

**Commit format:**

```
<type>: <description>

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**

| Type       | Use                         |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `docs`     | Documentation only          |
| `style`    | Formatting, no logic change |
| `refactor` | Code change, no feature/fix |
| `test`     | Add/update tests            |
| `chore`    | Build, deps, tooling        |

**Rules:**

- Commit after each logical unit of work, not at the end
- Never bundle unrelated changes
- Stage specific files, never `git add -A` or `git add .`
- Only commit when the user asks

## Stacked PRs with Graphite

Use `gt` (Graphite CLI) instead of `git push` / `gh pr create`:

```bash
gt create -m "feat: add product filtering"    # Create stacked branch + commit
gt submit --stack                              # Push all stacked PRs
```

| Do                           | Don't                             |
| ---------------------------- | --------------------------------- |
| `gt create` for new branches | `git checkout -b` then `git push` |
| `gt submit --stack` for PRs  | `gh pr create` manually           |
| Keep stacks under 5 PRs      | Create mega-stacks                |
| One concern per stack level  | Mix features in one PR            |

## Never Do

- `git push --force` (or `-f`) to any branch
- `git reset --hard`
- `git add -A` or `git add .`
- `--no-verify` or `--no-gpg-sign`
- `git commit --amend` after a hook failure (the commit didn't happen — amend modifies the _previous_ commit)
- Delete `.env` files or files containing secrets
- Commit `.env`, credentials, or secrets

## When to Ask vs Proceed

| Situation                                    | Action               |
| -------------------------------------------- | -------------------- |
| Single-file bug fix with obvious cause       | Proceed              |
| Multi-file refactor                          | Ask or use plan mode |
| Unclear requirements                         | Ask                  |
| Destructive operation (delete, reset, force) | Always ask           |
| New dependency needed                        | Ask                  |
| Architecture decision between approaches     | Use plan mode        |
| Failing tests after a change                 | Debug, don't ask     |
| Need to modify shared infrastructure         | Always ask           |

## Plan Mode

**Use when:** Multi-file changes, architecture decisions, unclear scope, multiple valid approaches, new features.

**Skip when:** Single-file fixes, typo corrections, obvious bugs, user gave specific instructions.

## Code Style

- **Tailwind UI** components as the design system
- **Headless UI** for accessible interactive elements (Dialog, Menu, Popover, etc.)
- **clsx** for conditional class composition
- **RSC-first** — only use `'use client'` when interactivity is needed
- **Named exports** — `export function Foo()` not `export default function Foo()`
- **kebab-case** directories, **PascalCase** component files
- Minimize `useState` / `useEffect` — prefer server components, Server Actions, URL params
- No `nuqs` — use native `URLSearchParams` for URL state

## MCP Servers

| Server         | Use                                   |
| -------------- | ------------------------------------- |
| **Playwright** | Browser testing and screenshots       |
| **Context7**   | Up-to-date library documentation      |
| **Linear**     | Issue tracking and project management |
| **PostHog**    | Analytics, feature flags, experiments |

## See Also

| File                       | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| [AGENTS.md](./AGENTS.md)   | Architecture, data layer, caching, components, pitfalls |
| [TODO.md](./TODO.md)       | Deferred features, testing tasks, known limitations     |
| [RETHEME.md](./RETHEME.md) | Theming guide for Tailwind UI commerce template         |
