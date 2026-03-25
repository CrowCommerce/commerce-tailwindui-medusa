# CI/CD Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions workflow that runs typecheck, prettier, and unit tests in parallel per workspace on every ready PR and push to `main`.

**Architecture:** One workflow file (`.github/workflows/ci.yml`) with two parallel jobs — `ci-storefront` and `ci-backend`. Each job installs dependencies, runs typecheck via Turborepo, then runs workspace-specific quality checks directly. No external secrets or services required.

**Tech Stack:** GitHub Actions, `oven-sh/setup-bun@v2`, Bun 1.1.18, Turborepo (`bunx turbo`), Vitest (storefront unit tests), Jest (backend unit tests), Prettier

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `.github/workflows/ci.yml` | The entire CI workflow |

No source code changes required.

---

### Task 1: Create the CI workflow file

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the `.github/workflows/` directory and write the workflow**

```bash
mkdir -p .github/workflows
```

Then create `.github/workflows/ci.yml` with this exact content:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, ready_for_review, synchronize, reopened]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

jobs:
  ci-storefront:
    name: ci-storefront
    runs-on: ubuntu-latest
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
        run: bun install

      - name: Typecheck
        run: bunx turbo typecheck --filter=@repo/storefront

      - name: Prettier
        run: cd storefront && bun run prettier:check

      - name: Unit tests
        run: cd storefront && bun run test:unit

  ci-backend:
    name: ci-backend
    runs-on: ubuntu-latest
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
        run: bun install

      - name: Typecheck
        run: bunx turbo typecheck --filter=@repo/backend

      - name: Unit tests
        run: cd backend && bun run test:unit
```

- [ ] **Step 2: Verify the file was created correctly**

```bash
cat .github/workflows/ci.yml
```

Expected: the full YAML content above, no truncation.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add GitHub Actions CI workflow with parallel quality gates

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Verify CI triggers on a test PR

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

Both jobs should be listed as separate checks.

- [ ] **Step 3: Confirm both jobs pass**

Wait for both jobs to complete. Verify:
- `ci-storefront` → green checkmark
- `ci-backend` → green checkmark

If either fails, read the job logs in the Actions tab to identify which step failed and why. Common issues:
- Bun install failure: check `bun.lockb` is committed
- Typecheck failure: a pre-existing type error — fix it, commit, and re-push
- Prettier failure: run `cd storefront && bun run prettier` locally, commit the formatted files
- Unit test failure: a pre-existing test failure — investigate and fix

- [ ] **Step 4: Close the test PR without merging**

```bash
gh pr close $(gh pr list --head $(git branch --show-current) --json number --jq '.[0].number')
```

Then clean up the branch locally:
```bash
gt sync
```

---

### Task 3: Configure branch protection on GitHub

**Files:** None — this task is done in the GitHub web UI.

- [ ] **Step 1: Open branch protection settings**

Go to: `https://github.com/EricJamesCrow/commerce-tailwindui-medusa/settings/branches`

Click **"Add branch protection rule"**.

- [ ] **Step 2: Configure the rule**

Set **Branch name pattern:** `main`

Enable the following settings in order:

1. ✅ **Require a pull request before merging**
   - (Leave "Require approvals" at 0 — solo project, no reviewers needed)

2. ✅ **Require status checks to pass before merging**
   - Click "Search for status checks" and add:
     - `ci-storefront`
     - `ci-backend`
   - ✅ **Require branches to be up to date before merging**

3. ✅ **Do not allow bypassing the above settings**
   - This ensures the rules apply even to the repo owner

- [ ] **Step 3: Save the rule**

Click **"Create"** at the bottom of the page.

- [ ] **Step 4: Verify protection is active**

Open `https://github.com/EricJamesCrow/commerce-tailwindui-medusa/branches` and confirm `main` shows a lock icon indicating it is protected.

**Note:** The status checks `ci-storefront` and `ci-backend` only appear in the search box after they have run at least once. If the search returns no results, complete Task 2 first (run a test PR), then come back and add the status checks.

---

## Done

CI is live when:
- Both jobs appear as required checks on `main`
- A PR with a typecheck or test failure cannot be merged
- A PR with a passing CI can be merged normally via Graphite (`gt submit --stack`)
