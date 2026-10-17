# Holdfast Protocol — Video Recording & Demo Operations Guide

This guide provides instructions for recording the 3-minute hackathon demonstration video consistently.

---

## 1. Prerequisites & Environment Setup

Ensure the following ports and services are ready before launching recording tools (OBS Studio, QuickTime, or Loom):

| Service | Port | URL | Startup Command |
| :--- | :--- | :--- | :--- |
| **Backend Express API** | `4000` | `http://localhost:4000/api` | `npm run dev --workspace=apps/server` |
| **Frontend Web App** | `3000` | `http://localhost:3000` | `npm run dev --workspace=apps/web` |
| **MCP Agent Server** | `stdio` | `packages/mcp-server` | `npm run dev --workspace=packages/mcp-server` |

### Environment Variables (`.env` in root)
Ensure the following are populated:
```env
PORT=4000
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
RECEIPT_SECRET=holdfast_default_development_hmac_secret_2026
```

---

## 2. Pre-Flight Verification & Health Check

Run the automated diagnostic probe before recording:

```bash
node scripts/health-check.mjs
```

Expected output:
```
[PASS] Express Backend API (/api/contracts): HTTP 200 OK
[PASS] Vite Web Frontend (/): HTTP 200 OK
[INFO] Active Contracts in Store: 3
[PASS] Data integrity verified: No negative balances detected.
```

---

## 3. Demo Data Reset Procedure

If you need to reset the contract database back to its clean demonstration state:

```bash
# Option A: Clean and seed sample pipeline
node scripts/health-check.mjs

# Option B: Re-run automated settlement scenario from dashboard
# Click "1. Settle Milestone ($15) with Dual Verification"
```

The application automatically seeds:
1. `ct_intel_pipeline_2026`: *Autonomous Competitor Intelligence Pipeline* ($35 Budget, Milestone 1 Settled, Milestone 2 Pending Review).
2. `ct_reconcile_test`: *Reconciliation Test* (Uncaptured $35 hold testing idempotency and recovery).

---

## 4. Scenario Matrix (Real vs. Simulated)

| Scenario | Component Under Test | Execution Mechanism | Fidelity Level |
| :--- | :--- | :--- | :--- |
| **1. Milestone Settlement** | Groq LPU + Gate 1 + PayPal Capture | Real Groq API call (`qwen/qwen3.8-27b`) $\to$ deterministic bounds check $\to$ PayPal Sandbox capture | **LIVE (Real Sandbox / Model)** |
| **2. Prompt Injection Veto** | Gate 2 Adversarial Auditor | Gemini 2.5 Flash / regex anti-injection filter detects instructions hijack $\to$ halts capture | **LIVE (Real Model / Filter)** |
| **3. Authorization Void** | Capital Preservation | PayPal `/v2/payments/authorizations/{id}/void` releases remaining hold | **LIVE (Real Sandbox API)** |
| **4. Network Recovery** | Reconciliation Engine | Queries live PayPal authorization status directly $\to$ prevents double capture | **LIVE (Idempotency Engine)** |

---

## 5. Screen Recording Settings & Checklist

### Recommended Capture Settings
- **Display Resolution:** 1920×1080 or 1440×900
- **Frame Rate:** 30 FPS or 60 FPS
- **Color Scheme:** Dark mode default
- **Browser Window:** Chrome/Edge at 100% zoom (F11 fullscreen recommended for clean viewport)
- **Audio Sample Rate:** 44.1 kHz or 48 kHz (WAV / AAC)

### Step-by-Step Operator Checklist

- [ ] **Step 1:** Open `http://localhost:3000` and confirm top metrics display cleanly.
- [ ] **Step 2:** Start screen recording with 5-second silence buffer.
- [ ] **Step 3 (00:00 – 00:15):** Hover over header brand title and `PayPal Sandbox Live` indicator.
- [ ] **Step 4 (00:15 – 00:35):** Pan across top 3 metric cards and the 5-stage central workflow.
- [ ] **Step 5 (00:35 – 01:00):** Select *Competitor Pricing Research* contract; open `D. PayPal Transactions` tab to display PayPal Order & Authorization IDs.
- [ ] **Step 6 (01:00 – 01:25):** Click `Inspect Evidence` on Stage 2 to display Gate 1 deterministic schema assertions.
- [ ] **Step 7 (01:25 – 01:50):** In the 10-Second Judge Walkthrough banner, click `2. Test Adversarial Prompt Injection Veto`. Confirm red veto toast and blocked payment.
- [ ] **Step 8 (01:50 – 02:15):** Click `View Payment Receipt` to display the Acceptance Receipt modal with the green `VALID HMAC-SHA256 DIGITAL SIGNATURE` banner.
- [ ] **Step 9 (02:15 – 02:35):** Select the *Reconciliation Test* contract and click `3. Test Network Lost-Response Reconciliation`.
- [ ] **Step 10 (02:35 – 02:45):** Switch to terminal showing `npx vitest run` with all 21 tests passing.
- [ ] **Step 11 (02:45 – 02:50):** Return to dashboard for final closing frame.
- [ ] **Step 12:** Stop recording. Verify duration is **under 3 minutes** (approx 2m 50s).

---

## 6. Emergency Recovery During Recording

If any unexpected error occurs during recording:
1. **Frontend Crash / Unresponsive**: Press `Ctrl+C` in web terminal and run `npm run dev --workspace=apps/web`.
2. **Backend Failure**: Run `node scripts/health-check.mjs` to verify port 4000 and data store.
3. **Reset Database**: Delete `data/holdfast-store.json` and restart `apps/server` (it will regenerate with fresh default seeds).
