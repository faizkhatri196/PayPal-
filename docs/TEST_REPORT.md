# Holdfast Protocol — Automated Test & Validation Report

**Test Execution Date:** 2026-10-17  
**Execution Environment:** Node.js v20.x / Windows PowerShell  
**Test Framework:** Vitest v5.0.5  
**Overall Result:** **ALL 21 TESTS PASSED (100% SUCCESS RATE)**

---

## 1. Test Execution Summary

```
 RUN  v5.0.5 <workspace-root>

 ✓ tests/hash-determinism.test.ts (3 tests) 14ms
 ✓ tests/money-invariants.test.ts (8 tests) 16ms
 ✓ tests/proof-suite.test.ts (10 tests) 53ms

 Test Files  3 passed (3)
      Tests  21 passed (21)
   Duration  776ms
```

---

## 2. Test Suite Breakdown

### Suite A: Financial Invariants (`tests/money-invariants.test.ts`)
*Verifies mathematical bounds, minor-unit integer precision, and duplicate capture prevention.*

| Test Case | Description | Mode | Result |
| :--- | :--- | :--- | :--- |
| **FIN-01** | Accurate parsing of dollars and cents to integer minor units | Unit | **PASS** |
| **FIN-02** | Prevention of fractional cent rounding leaks | Unit | **PASS** |
| **FIN-03** | Rejection of negative amounts and non-numeric inputs | Unit | **PASS** |
| **FIN-04** | Cumulative tranche captures cannot exceed authorization limit | Unit | **PASS** |
| **FIN-05** | Exact-match final capture boundary calculation | Unit | **PASS** |
| **FIN-06** | Idempotency key preservation across retry attempts | Unit | **PASS** |
| **FIN-07** | Non-custodial pre-auth balance equals total minus settled | Unit | **PASS** |
| **FIN-08** | Prevention of double captures upon network timeout response | Unit | **PASS** |

### Suite B: Deliverable Hash Stability (`tests/hash-determinism.test.ts`)
*Verifies cryptographic reproducibility and tamper detection.*

| Test Case | Description | Mode | Result |
| :--- | :--- | :--- | :--- |
| **HASH-01** | Identical SHA-256 for identical JSON payloads | Cryptographic Unit | **PASS** |
| **HASH-02** | Detection of single-character modifications (e.g. 1 cent variance) | Cryptographic Unit | **PASS** |
| **HASH-03** | Format validation: valid 64-character lowercase hex digest | Cryptographic Unit | **PASS** |

### Suite C: Dual-Gate Verification & Proof Suite (`tests/proof-suite.test.ts`)
*End-to-end simulation of Gate 1 schema rules, Gate 2 adversarial veto, and acceptance receipt minting.*

| Test Case | Description | Mode | Result |
| :--- | :--- | :--- | :--- |
| **PROOF-01** | Valid pricing deliverable passes Gate 1 deterministic schema | Integration | **PASS** |
| **PROOF-02** | Missing required key (`market_id`) halts execution at Gate 1 | Integration | **PASS** |
| **PROOF-03** | Negative price entry halts execution at Gate 1 bounds check | Integration | **PASS** |
| **PROOF-04** | Prompt injection payload triggers Gate 2 Adversarial Veto | Integration (Heuristic/LLM) | **PASS** |
| **PROOF-05** | Vetoed milestone strictly halts PayPal capture ($0 captured) | Integration | **PASS** |
| **PROOF-06** | Valid milestone captures tranche and mints Acceptance Receipt | Integration (Mocked Sandbox) | **PASS** |
| **PROOF-07** | HMAC-SHA256 signature validates on untampered receipt | Cryptographic Unit | **PASS** |
| **PROOF-08** | Modified capture ID in receipt invalidates digital signature | Cryptographic Unit | **PASS** |
| **PROOF-09** | Formatted PayPal Dispute Evidence Packet contains all proofs | Integration | **PASS** |
| **PROOF-10** | Voiding remaining hold sets contract status to VOIDED | Integration | **PASS** |

---

## 3. Build & Compilation Verification

| Workspace | Command | Output | Result |
| :--- | :--- | :--- | :--- |
| **Root Monorepo** | `npm run build --workspaces` | Compiles `@holdfast/server`, `@holdfast/web`, `@holdfast/mcp-server` | **PASS (0 errors)** |
| **Backend Server** | `npm run build --workspace=apps/server` | `tsc` output to `dist/` | **PASS (0 errors)** |
| **Web Frontend** | `npm run build --workspace=apps/web` | `tsc && vite build` (1590 modules transformed, 25.86 kB CSS, 275.5 kB JS) | **PASS (0 errors)** |
| **MCP Server** | `npm run build --workspace=packages/mcp-server` | `tsc` output to `dist/` | **PASS (0 errors)** |

---

## 4. Live Environment Testing Disclosures

- **PayPal Sandbox Calls**: The automated unit and integration tests run against isolated mock state to guarantee deterministic CI runs. Live end-to-end PayPal Sandbox calls were separately executed against `https://api-m.sandbox.paypal.com` via `scripts/paypal-lifecycle-probe.mjs` verifying OAuth 2.0 bearer token generation, order creation, authorization holds, tranche captures, and voiding.
- **AI Models Tested**:
  - `qwen/qwen3.8-27b` on Groq LPU: Verified live via `/api/agent/generate-deliverable`.
  - `gemini-2.5-flash` on Google GenAI: Verified live via Gate 2 adversarial audit.
