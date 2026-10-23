# Holdfast Protocol — Hackathon Submission Checklist

**Hackathon:** "Build What's Next with PayPal and AI"  
**Official Devpost URL:** [https://paypalaihackathon.devpost.com/](https://paypalaihackathon.devpost.com/)  
**Official Rules URL:** [https://paypalaihackathon.devpost.com/rules](https://paypalaihackathon.devpost.com/rules)  
**Track Focus:** Agentic Commerce with PayPal and AI  
**Review Status:** **VERIFIED & PREPARED FOR FINAL SUBMISSION**

---

## 1. Codebase & Deployment Readiness

- [x] **Project runs from clean submission copy**: Self-contained structure runs independently from `Holdfast-Protocol-Submission`.
- [x] **Dependencies install cleanly**: `npm ci` / `npm install` installs without missing package errors.
- [x] **Automated tests verified**: `npx vitest run` passes 21/21 tests in `tests/money-invariants.test.ts`, `tests/hash-determinism.test.ts`, and `tests/proof-suite.test.ts`.
- [x] **Production build succeeds**: `npm run build --workspaces` cleanly compiles backend, web app, and MCP server with 0 errors.
- [x] **No hardcoded secrets committed**: `.env` is strictly git-ignored; `.env.example` provides safe placeholders.
- [x] **Machine-specific absolute paths removed**: Checked and verified zero occurrences of `C:\Users\` or personal desktop paths across all code, scripts, and documentation.
- [x] **License is present**: Official MIT License included in [LICENSE](LICENSE).

---

## 2. PayPal Integration Disclosures

- [x] **Accurately described as non-custodial software escrow**: Programmatic holds utilize PayPal Orders v2 (`intent: "AUTHORIZE"`) and Payments v2 (`/capture`, `/void`).
- [x] **Sandbox environment status clearly disclosed**: Clearly marked as PayPal Sandbox test transactions; zero production funds at risk.
- [x] **Duplicate operation safeguards implemented**: `PayPal-Request-Id` UUID v4 header enforced on all capture requests; lost responses recovered via live authorization reconciliation.
- [x] **Worker payout limitation disclosed**: Tranches capture funds from the pre-authorization; separate worker payout APIs (PayPal Payouts SDK) would complete secondary enterprise disbursement in full production.

---

## 3. AI & Verification Integration

- [x] **Model roles clearly verified from code**:
  - **Worker Agent**: Groq LPU (`qwen/qwen3.8-27b`) for fast deliverable proposal generation.
  - **Holdfast Gate 1**: Deterministic schema, required key, and arithmetic price bounds checks.
  - **Holdfast Gate 2**: Gemini 2.5 Flash (`gemini-2.5-flash`) for adversarial prompt injection review.
- [x] **Veto-Only architecture enforced**: AI models have zero direct financial capture authority; only deterministic code can authorize payment releases.
- [x] **Realistic security disclosure**: Prompt injection defended through layered containment (Gate 1 failure halts execution; Gate 2 veto blocks capture).

---

## 4. Demo Video & Submission Assets

- [x] **Duration strictly under 3 minutes**: Script and video timed to ~2 minutes 50 seconds (170 seconds), leaving safety buffer under the 3:00 hard cutoff.
- [x] **Shows actual working application**: Footage and actions captured directly from the live running frontend (`http://localhost:3000`).
- [x] **Voice-over synchronized with on-screen actions**: Explains what is happening without reading source code or exaggerating claims.
- [x] **Clear fidelity labeling**: Unit tests, live Sandbox API calls, and simulated prompt injections are explicitly distinguished.
- [x] **Submission description prepared**: Complete technical text ready in `docs/SUBMISSION_DESCRIPTION.md`.

---

## 5. Devpost Form Submission Fields

| Field Name | Expected Content | Reference Document |
| :--- | :--- | :--- |
| **Project Title** | Holdfast Protocol | `README.md` |
| **Tagline** | The Acceptance Receipt & Escrow Primitive for Autonomous Agentic Commerce on PayPal | `README.md` |
| **Video Demo URL** | Public YouTube or Vimeo link (< 3 min) | `docs/PROFESSIONAL_DEMO_SCRIPT.md` |
| **GitHub Repository** | Public GitHub URL with MIT license | `https://github.com/faizkhatri196/PayPal-Hackthon` |
| **PayPal API Used** | PayPal Orders v2 (Authorize) & Payments v2 (Capture/Void) | `docs/PAYPAL_SANDBOX_GUIDE.md` |
| **AI Technology Used** | Google GenAI (Gemini 2.5 Flash) & Groq LPU (qwen/qwen3.8-27b) | `docs/ARCHITECTURE.md` |
| **Inspiration & Story** | Autonomous AI agent commerce trust deficit | `docs/SUBMISSION_DESCRIPTION.md` |
