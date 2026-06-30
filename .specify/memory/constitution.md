<!--
SYNC IMPACT REPORT
==================
Version change: (template / unratified) → 1.0.0
Bump rationale: Initial ratification. Template placeholders replaced with concrete
principles derived from the project's de-facto rules in CLAUDE.md and the as-built
plan (specs/001-asume-product-overview/plan.md Constitution Check).

Principles defined (5):
  I.   Local-First & Privacy
  II.  Test-First Discipline (NON-NEGOTIABLE)
  III. Strict Type Safety
  IV.  React 19 Render Purity
  V.   External API Cost Protection & Graceful Degradation

Added sections:
  - Technology & Structure Constraints (formerly SECTION_2)
  - Development Workflow & Quality Gates (formerly SECTION_3)
  - Governance

Removed sections: none (all template slots filled)

Templates reviewed for consistency:
  ✅ .specify/templates/plan-template.md — generic "Constitution Check" gate; compatible (no change needed)
  ✅ .specify/templates/spec-template.md — scope/requirements structure compatible (no change needed)
  ✅ .specify/templates/tasks-template.md — UPDATED: "Tests are OPTIONAL" note qualified to honor
       Principle II (TDD mandatory for logic/utilities in this project)
  ✅ CLAUDE.md — source of these principles; remains the HOW reference (no contradiction)
  ✅ specs/001-asume-product-overview/{spec,plan}.md — already consistent with these principles

Deferred TODOs: none. Ratification date set to first fill date (2026-06-30); no earlier
formal adoption record exists.
-->

# AsuMe（単語学習アプリ）Constitution

## Core Principles

### I. Local-First & Privacy

All learner data — projects, words, and study history — MUST be persisted on the user's
device via browser `localStorage` (key `asume_projects`). The application MUST NOT depend
on a server-side database or user accounts for its core study loop, and study/quiz features
MUST remain usable offline. The only data permitted to leave the device is the minimal input
required for content generation (the word string, plus optional meaning/part-of-speech sent
to the generation endpoints). Backup and portability MUST be provided through explicit,
user-initiated export/import (ZIP for full data + progress, CSV for word data).

**Rationale**: The product is a personal study tool; zero-account friction, offline
availability, and not exposing study history to third parties are core to its value.

### II. Test-First Discipline (NON-NEGOTIABLE)

Logic and utilities (e.g. parsing, persistence, quiz selection) MUST have Jest tests that
are written or updated and made to pass before or alongside the implementation. New or
changed behavior in `src/lib/*` MUST NOT be merged without corresponding `*.test.ts`
coverage. The existing test suites (`csvParser`, `projectManager`, `quizEngine`) MUST stay
green.

**Rationale**: Domain logic drives correctness of scoring, mastery, and data integrity;
regressions here silently corrupt a learner's progress.

### III. Strict Type Safety

The `any` type is FORBIDDEN (enforced as an ESLint error). Values of `unknown` origin from
external libraries (e.g. PapaParse results) MUST be narrowed via explicit type assertions
rather than untyped parameters. Error handling MUST use `catch (e: unknown)` and narrow with
`e instanceof Error` before use. TypeScript and ESLint checks MUST pass.

**Rationale**: Strong typing at boundaries is the cheapest defense against runtime failures
in a client-only app with no server to catch bad data.

### IV. React 19 Render Purity

Components MUST remain pure. State objects (e.g. `project`) MUST NOT be mutated directly;
updates MUST create new objects and use the setter (`setProject`). Synchronous `setState`
inside `useEffect` is FORBIDDEN (it triggers cascading-render warnings); initialization MUST
use `Promise.resolve().then(...)`, and derived values MUST come from `useMemo` or plain
variables — never redundant state. Components depending on `localStorage` or
`window.speechSynthesis` MUST declare `"use client";`.

**Rationale**: Strict Mode purity prevents subtle double-render and stale-state bugs that are
hard to reproduce and erode data reliability.

### V. External API Cost Protection & Graceful Degradation

Every metered external API path (WordsAPI, OpenAI, DeepL) MUST be guarded by rate limiting
enforced before the request is processed (`src/proxy.ts` + `src/lib/rateLimit.ts`):
a global cap (`DAILY_GLOBAL_LIMIT`, default 2450/day) and a per-IP cap (`DAILY_IP_LIMIT`,
default 200/day). API keys MUST stay server-side (never shipped to the client). On `429`,
client loops (e.g. Batch Enrich) MUST stop immediately and surface a clear limit-reached
message. Generation MUST degrade gracefully via defined fallbacks (OpenAI → DeepL;
WordsAPI pronunciation → CMU dictionary) rather than failing hard.

**Rationale**: A public deployment without these guards risks runaway billing and broken UX;
fallbacks keep the feature useful when a provider is missing or down.

## Technology & Structure Constraints

- **Stack**: Next.js (App Router) + React 19 + TypeScript; Tailwind CSS v4 (theme: orange /
  white / green). Persistence is `localStorage` only; Upstash Redis is used solely for
  rate-limit counters, never for learner data.
- **Separation of concerns**: Domain logic MUST live in testable, pure functions under
  `src/lib`. External-API access MUST be isolated to server routes under `src/app/api/*` so
  keys are never exposed. UI components stay thin.
- **Spec authority**: Product behavior (WHAT/WHY) is governed by
  `specs/001-asume-product-overview/spec.md`; implementation detail (HOW) lives in
  `CLAUDE.md`. These MUST be kept consistent.
- **AI tooling safety**: When AI tools write/replace files, backticks and `$` inside
  TypeScript template literals MUST NOT be backslash-escaped (doing so injects literal
  backslashes and causes Next.js syntax errors). See CLAUDE.md §AIツール利用時の注意事項.

## Development Workflow & Quality Gates

- **Spec-driven flow**: Significant changes proceed through specify → plan → tasks →
  implement. The plan's Constitution Check gate MUST pass before design and be re-checked
  after design.
- **Quality gates before merge**: `npm run test` (Jest) green, `npm run lint` clean (no
  `any`, no ESLint errors), and `npm run build` succeeds.
- **Environment**: The primary developer environment is Windows (PowerShell); commands and
  scripts MUST account for execution-policy constraints.

## Governance

This constitution supersedes ad-hoc practice for the AsuMe project. Amendments are made by
editing `.specify/memory/constitution.md` and MUST include: a Sync Impact Report, a version
bump per the policy below, and propagation to dependent templates and guidance files.

**Versioning policy** (semantic):
- **MAJOR**: backward-incompatible governance changes or removal/redefinition of a principle.
- **MINOR**: a new principle/section is added or guidance is materially expanded.
- **PATCH**: clarifications, wording, or non-semantic refinements.

**Compliance review**: Plans, reviews, and PRs MUST verify adherence to these principles.
Any deviation MUST be justified in the plan's Complexity Tracking with a rejected simpler
alternative; unjustified violations block merge. CLAUDE.md is the runtime development
guidance and MUST stay aligned with this document.

**Version**: 1.0.0 | **Ratified**: 2026-06-30 | **Last Amended**: 2026-06-30
