# CI/CD Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions workflow that runs typecheck, prettier, and unit tests in parallel per workspace on every ready PR and push to `main`.

**Architecture:** One workflow file (`.github/workflows/ci.yml`) with two parallel jobs — `ci-storefront` and `ci-backend`. Each job installs dependencies with a frozen lockfile, runs typecheck via Turborepo, then runs prettier and unit tests directly via workspace scripts. Draft PRs are excluded via a job-level `if` condition. No external secrets or services required.

**Tech Stack:** GitHub Actions, `oven-sh/setup-bun@v2`, Bun 1.1.18, Turborepo (`bunx turbo`), Vitest (storefront unit tests), Jest (backend unit tests), Prettier 3.5.3

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `.github/workflows/ci.yml` | The entire CI workflow |
| Modify | `backend/package.json` | Add `prettier` devDependency + scripts |
| Create | `backend/.prettierrc` | Override root prettier config (no tailwind plugin) |
| Create | `backend/.prettierignore` | Exclude build artifacts from formatting |

---

### Task 1: Add Prettier to the backend

The backend has no prettier config. The root `.prettierrc` loads `prettier-plugin-tailwindcss` which the backend doesn't need. We add a local override and scripts before the workflow runs.

**Files:**
- Modify: `backend/package.json`
- Create: `backend/.prettierrc`
- Create: `backend/.prettierignore`

- [ ] **Step 1: Add prettier to `backend/package.json`**

Open `backend/package.json`. In `devDependencies`, add:

```json
"prettier": "3.5.3"
```

In `scripts`, add:

```json
"prettier": "prettier --write --ignore-unknown .",
"prettier:check": "prettier --check --ignore-unknown ."
```

- [ ] **Step 2: Create `backend/.prettierrc`**

Create `backend/.prettierrc` with this content:

```json
{
  "plugins": []
}
```

This overrides the root `.prettierrc` which loads `prettier-plugin-tailwindcss`. The backend is pure TypeScript — no Tailwind needed.

- [ ] **Step 3: Create `backend/.prettierignore`**

Create `backend/.prettierignore` with this content:

```
.medusa/
node_modules/
```

- [ ] **Step 4: Install and run prettier to format existing backend files**

```bash
bun install
cd backend && bun run prettier
```

This formats all existing backend files so the first CI run starts clean. Stage all changed files.

- [ ] **Step 5: Verify prettier:check passes**

```bash
cd backend && bun run prettier:check
```

Expected: exits 0 with no output. If files are listed as needing formatting, run `bun run prettier` again and check for unexpected changes.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/.prettierrc backend/.prettierignore
git add -p  # stage any files prettier reformatted
git commit -m "chore: add prettier to backend workspace

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create the CI workflow file

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

Create the file with this exact content:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, ready_for_review, synchronize, reopened]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

jobs:
  ci-storefront:
    name: ci-storefront
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || github.event.pull_request.draft == false
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.1.18"

      - name: Cache Bun dependencies
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Typecheck
        run: bunx turbo typecheck --filter=@repo/storefront

      - name: Prettier
        run: cd storefront && bun run prettier:check

      - name: Unit tests
        run: cd storefront && bun run test:unit

  ci-backend:
    name: ci-backend
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || github.event.pull_request.draft == false
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.1.18"

      - name: Cache Bun dependencies
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Typecheck
        run: bunx turbo typecheck --filter=@repo/backend

      - name: Prettier
        run: cd backend && bun run prettier:check

      - name: Unit tests
        run: cd backend && bun run test:unit
```

- [ ] **Step 3: Verify the file was created correctly**

```bash
cat .github/workflows/ci.yml
```

Expected: the full YAML content above, no truncation.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add GitHub Actions CI workflow with parallel quality gates

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Verify CI triggers on a test PR

**Files:** None — this task is purely verification.

- [ ] **Step 1: Push the branch and open a PR**

```bash
gt create -a -m "chore: test CI workflow"
gt submit --stack --no-interactive
```

Then mark the PR ready:
```bash
gh pr ready $(gh pr list --head $(git branch --show-current) --json number --jq '.[0].number')
```

- [ ] **Step 2: Confirm both jobs appear in GitHub Actions**

Open the PR in GitHub. Navigate to the **Checks** tab. Verify:
- `ci-storefront` is running or queued
- `ci-backend` is running or queued

Both jobs should be listed as separate checks. If only one appears, the `if` condition or trigger type may be wrong — check the Actions tab for skipped jobs.

- [ ] **Step 3: Confirm both jobs pass**

Wait for both jobs to complete. Verify:
- `ci-storefront` → green checkmark
- `ci-backend` → green checkmark

If either fails, read the job logs in the Actions tab to identify which step failed. Common issues:
- `--frozen-lockfile` failure: `bun.lockb` is out of sync — run `bun install` locally and commit the updated lockfile
- Typecheck failure: a pre-existing type error — fix it, commit, and re-push
- Prettier failure: run `bun run prettier` in the failing workspace locally, commit the formatted files
- Unit test failure: a pre-existing test failure — investigate and fix

- [ ] **Step 4: Close the test PR without merging**

```bash
gh pr close $(gh pr list --head $(git branch --show-current) --json number --jq '.[0].number')
gt sync
```

---

### Task 4: Configure branch protection on GitHub

**Files:** None — this task is done in the GitHub web UI.

- [ ] **Step 1: Open branch protection settings**

Go to: `https://github.com/EricJamesCrow/commerce-tailwindui-medusa/settings/branches`

Click **"Add branch protection rule"**.

- [ ] **Step 2: Configure the rule**

Set **Branch name pattern:** `main`

Enable the following settings in order:

1. ✅ **Require a pull request before merging**
   - (Leave "Require approvals" at 0 — solo project)

2. ✅ **Require status checks to pass before merging**
   - Click "Search for status checks" and add:
     - `ci-storefront`
     - `ci-backend`
   - ✅ **Require branches to be up to date before merging**

3. ✅ **Do not allow bypassing the above settings**

**Note:** `ci-storefront` and `ci-backend` only appear in the search box after they have run at least once. Task 3 (the test PR) must be completed before this step.

- [ ] **Step 3: Save and verify**

Click **"Create"**. Then open `https://github.com/EricJamesCrow/commerce-tailwindui-medusa/branches` and confirm `main` shows a lock icon.

---

## Done

CI is live when:
- Both jobs appear as required checks on `main`
- A PR with a typecheck, prettier, or test failure cannot be merged
- Draft PRs are skipped; ready PRs run both jobs automatically via Graphite workflow
