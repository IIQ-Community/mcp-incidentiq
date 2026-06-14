# Audit: Was the bun-only migration against MCP-server best practice?

**Date:** 2026-06-14
**Subject:** The v0.3.0 "bun-only" toolchain migration (PRD `docs/prd/2026-06-14-migrate-yarn-to-bun.md`)
**Verdict:** **Partially — yes.** Using bun as a *development* toolchain is acceptable; making bun the *required runtime* for the distributed server is against best practice for MCP servers.

---

## 1. The question

Did migrating this MCP server to a "bun-only" toolchain — package manager, test runner, build, **and runtime** — violate best-practice standards for distributable MCP servers?

## 2. The standard (rubric)

An MCP server is a **distributable program launched by an MCP client** (Claude Desktop, Claude Code, Cursor, Windsurf, …). The client spawns the server as a subprocess using a configured command and speaks JSON-RPC over stdio. The ecosystem norm for that command is **Node via `npx` or `node`**:

- Every server in the official `modelcontextprotocol/servers` repository uses a `#!/usr/bin/env node` shebang and is published to npm for `npx` consumption — verified across `filesystem`, `memory`, `sequentialthinking`, `everything`, and the archived `postgres`, `gdrive`, `redis`, `everart`, `aws-kb-retrieval` servers. **Not one uses bun.**
- The MCP TypeScript SDK targets Node and is distributed on npm; client launch examples use `"command": "npx"` / `"command": "node"`.
- The overwhelming majority of MCP-client hosts ship or assume Node; bun is not a baseline dependency of any major MCP client.

So the best-practice rubric for a *distributable* MCP server is: **the published artifact must run on Node**, launched via `npx`/`node`, with `engines.node` declared. The dev toolchain (how the maintainer builds/tests it) is unconstrained by this rubric — it can be bun, npm, pnpm, anything.

## 3. What the migration did

Per the PRD and the v0.3.0 changes, the migration:

- Changed the binary shebang `#!/usr/bin/env node` → `#!/usr/bin/env bun` (`src/index.ts:1`).
- Declared `engines: { "bun": ">=1.2.0" }` and **removed `engines.node`** entirely — so the package advertises *only* bun and gives no Node signal.
- Documented consumer launch as **`bunx mcp-incidentiq` / `bun`** and stated, verbatim: *"The consumer must have bun installed; Node-based invocation is no longer supported"* and *"Node runtime/engine support — intentionally dropped (bun-only). This BREAKS `npx`/`node` consumers; it is a deliberate, accepted breaking change."*
- Moved package management, build, and tests to bun (`bun.lock`, `bunfig.toml`, `bun:test`).

## 4. Verdict by dimension

| Dimension | Verdict | Reason |
|---|---|---|
| Package manager on bun (`bun install`, `bun.lock`) | ✅ Acceptable | Dev-time concern; invisible to consumers |
| Build via `tsc` (run by bun) | ✅ Acceptable | Output is standard JS; bun is just the runner |
| Test runner `bun test` / `bun:test` | ✅ Acceptable | Dev-time concern; fast and legitimate |
| **Required runtime = bun** (shebang, `engines.bun`-only, `bunx` consumer docs) | ❌ **Against best practice** | Erects a bun-install barrier for every consumer, contrary to the universal Node/`npx` MCP norm, with **no runtime benefit** |

## 5. Evidence the runtime requirement is *gratuitous*

The strongest evidence that the bun runtime requirement was unnecessary (not merely unconventional):

1. **The compiled artifact is plain CommonJS.** `tsconfig.json` sets `module: "commonjs"`; `dist/index.js` begins `"use strict"; var __importDefault = …` — standard CJS with no bun-specific APIs.
2. **It runs on plain Node, proven.** Running the built server under stock Node with **no bun involved**:

   ```
   $ node dist/index.js   # Node v24.16.0, IIQ_API_* env set, MCP initialize + tools/list piped to stdin
   serverInfo: { name: 'mcp-incidentiq', version: '0.1.0', … }
   tools: 159
   ```

   The server completes the MCP handshake and lists all 159 tools on Node. The `#!/usr/bin/env bun` shebang and `engines.bun` were the *only* things coupling the published server to bun — and they buy nothing at runtime.
3. **It diverges from every official MCP server** (Section 2) and from this project's own stated stack standard: *base libraries = Node + Vitest* (an MCP server is a distributed base library, not an app/pilot).

Net: the migration imposed a hard bun dependency on consumers — most of whom run Node-based MCP clients — in exchange for zero runtime benefit. That is the definition of an unnecessary adoption barrier.

## 6. Adjacent finding (incidental)

While auditing, the running server reports `version: '0.1.0'` (hardcoded at `src/index.ts:36`) even though `package.json` is `0.3.0`. The release version-sync (`scripts/sync-release-version.js`) updates `package.json` and `CITATION.cff` but **not** `src/index.ts`, and `.releaserc.json`'s `@semantic-release/git` `assets` would not commit it back even if it did — so the runtime version is permanently stale. Folded into the remediation (release-pipeline task).

## 7. Remediation

Revert the toolchain to the Node + Vitest base-library standard, standardized on Node LTS:

- Runtime: shebang → `#!/usr/bin/env node`; `engines.node >= 22` (no `engines.bun`); the published `bin` runs on Node via `npx`/`node`.
- Dev toolchain: npm (`package-lock.json`), Vitest (the project's documented test runner), `tsc` build (unchanged — already Node-compatible).
- CI / release / devcontainer / governance / docs: Node 24 (current LTS) + npm; remove all bun artifacts; restore `npx`/`node` consumer docs.
- Fix the stale-version finding end-to-end (sync `src/index.ts` and commit it back via `.releaserc.json`).

This realigns the server with the MCP ecosystem norm and the project's own standard while keeping the modern, fast dev workflow the bun migration was reaching for (now on Node-native Vitest).

## 8. Remediation outcome

The revert was implemented and verified (plan `docs/plans/2026-06-14-bun-migration-best-practice-audit.md`):

- **Runtime restored to Node:** shebang `#!/usr/bin/env node`, `engines.node >= 22`, no `engines.bun`. The published `bin` runs on Node via `npx`/`node`.
- **Dev toolchain bun-free end to end:** npm (`package-lock.json`, no `bun.lock`), Vitest (no `bun:test`/`bunfig.toml`/`@types/bun`), `tsc` build unchanged. CI, release, and devcontainer run on Node 24 (current LTS) + npm.
- **Stale-version finding fixed:** `sync-release-version.js` now also patches the `src/index.ts` Server `version` literal, and `.releaserc.json`'s `@semantic-release/git` assets include `src/index.ts` so the bump persists.
- **Green Node gate:** `npm ci` + `npm run type-check` + `npm run build` + `npm test` all pass — **125 unit tests, 0 failures** — with no bun present.
- **Runtime re-confirmed on Node:** `node dist/index.js` completes the MCP `initialize` + `tools/list` handshake and lists **159 tools** on Node v24, no bun installed.

Landed via PR (see the revert PR on `IIQ-Community/mcp-incidentiq`) through the gated, no-admin-bypass flow with the `ci` status check preserved.
