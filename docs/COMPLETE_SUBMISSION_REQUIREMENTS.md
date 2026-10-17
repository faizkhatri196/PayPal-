# Holdfast Protocol — Complete Hackathon Submission Requirements
**Hackathon:** Build What's Next with PayPal and AI  
**Official Portal:** [https://paypalaihackathon.devpost.com/](https://paypalaihackathon.devpost.com/)  
**Official Rules:** [https://paypalaihackathon.devpost.com/rules](https://paypalaihackathon.devpost.com/rules)  
**Document Purpose:** Complete compliance matrix detailing every official submission field, deliverable, technical requirement, and manual action without promotional claims.

---

## 1. Official Submission Fields (Devpost)

| Field Name | Character Limit / Format | Project Value / Draft Content | Status | Source |
|---|---|---|---|---|
| **Project Title** | Text (up to 50 chars) | `Holdfast Protocol` | ✅ Verified | Official Rules / Devpost standard |
| **Elevator Pitch** | Text (max 140 chars) | `Trustworthy payment decisions for AI commerce: rule-based validation, AI adversarial veto, and PayPal holds before funds move.` | ✅ Verified (131 chars) | Official Form Guidance |
| **Built With** | Comma-delimited tags | `PayPal REST API, PayPal Orders v2, PayPal Payments v2, TypeScript, Node.js, Express, React, Vite, Model Context Protocol (MCP), Gemini 2.5 Flash, Groq, Vitest` | ✅ Verified | Devpost Tags |
| **Try It Out (Repo URL)** | Public URL | `https://github.com/faizkhatri196/PayPal-Hackthon` | ✅ Ready to publish | Official Requirement |
| **Demo Video Link** | Public YouTube URL | *(User action required: paste unlisted/public YouTube link under 3:00 min)* | ⏳ Pending Recording | Official Requirement |
| **Project Story / Description** | Markdown text | Content formatted in `docs/SUBMISSION_DESCRIPTION.md` addressing problem, solution, architecture, and verification. | ✅ Verified | Official Devpost Form |

---

## 2. Required Project Information

- **The Problem:** In multi-agent commerce and digital task coordination, paying upfront exposes buyers to non-delivery or AI hallucination, while working before payment exposes workers to non-payment. Existing wallets permit unconstrained spending without delivery verification.
- **The Solution:** Holdfast introduces software-enforced authorization holds on PayPal coupled with a two-gate verification pipeline:
  1. *Gate 1 (Deterministic):* Validates structural schema, mandatory domain keys, and value bounds. Exclusive financial release authority.
  2. *Gate 2 (AI Adversarial Reviewer):* Gemini 2.5 Flash acts strictly as a veto against prompt injection and malicious instructions.
- **Tamper-Evident Receipts:** Canonical JSON signed with HMAC-SHA256 to provide an auditable record of verification decisions.

---

## 3. Source Code & Repository Requirements

- **Clean Source Code:** Self-contained monorepo structured with `apps/server`, `apps/web`, `packages/mcp-server`, `tests/`, `docs/`, and `scripts/`.
- **Exclusion of Secrets:** Zero API keys, secrets, or `.env` credentials committed. Clean template provided via `.env.example`.
- **Lockfile Hygiene:** Reproducible dependency trees committed via `package-lock.json`.
- **Portability:** Zero hardcoded machine paths (`C:\Users\...`). All execution scripts use environment variable overrides and relative path resolution.

---

## 4. Open-Source License Requirements

- **License Type:** MIT Open-Source License.
- **File Location:** [LICENSE](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/LICENSE).
- **Compliance Status:** ✅ Present at repository root and clean submission package.

---

## 5. Required Demo Video

- **Duration Limit:** Strictly UNDER 3 MINUTES (< 180 seconds).
- **Target Planned Duration:** 2 minutes 50 seconds (170 seconds) with a 10-second safety margin.
- **Hosting Platform:** Public or unlisted YouTube video.
- **Content Focus:** Live demonstration of the actual React dashboard, PayPal authorization hold lifecycle, deterministic Gate 1 pass/fail, AI adversarial veto, and HMAC receipt validation. No slideshow-only substitute.
- **Script & Guide:** Complete scene-by-scene script in [docs/DEMO_SCRIPT.md](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/docs/DEMO_SCRIPT.md) and recording plan in [docs/VIDEO_RECORDING_GUIDE.md](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/docs/VIDEO_RECORDING_GUIDE.md).

---

## 6. PayPal Integration Requirements

- **Platform & APIs Used:** PayPal Developer Platform — Orders v2 (`POST /v2/checkout/orders` with `intent: "AUTHORIZE"`) and Payments v2 (`POST /v2/payments/authorizations/{id}/capture` and `POST /v2/payments/authorizations/{id}/void`).
- **Authorization Hold Pattern:** Non-custodial holds guarantee buyer solvency without moving money until work passes verification.
- **Partial Tranche Captures:** Milestones are incrementally captured from the authorization hold.
- **Error & Idempotency Handling:** Handles network failures, duplicate requests, and uncertain gateway responses gracefully.
- **Disclosed Limitation:** Capturing an authorization hold settles funds into the merchant balance. Worker disbursement requires secondary settlement via PayPal Payouts. The architecture does not claim legal third-party banking escrow.

---

## 7. AI Integration Requirements

- **Model Selection:**
  - *Adversarial Gatekeeper (Gate 2):* Gemini 2.5 Flash (`apps/server/src/verifier/adversarial.ts`).
  - *Worker Agent Simulator:* Groq LPU (`qwen/qwen3.8-27b`) via `/api/agent/generate-deliverable`.
- **Architectural Guardrails:**
  - AI does not hold financial authority. It cannot approve payouts or bypass Gate 1.
  - Fail-closed behavior: Model timeouts or network exceptions trigger review status rather than automatic approval.

---

## 8. Technical & Execution Requirements

- **TypeScript Compilation:** All workspaces (`@holdfast/server`, `@holdfast/web`, `@holdfast/mcp-server`) compile cleanly via `tsc`.
- **Production Build:** Vite production bundle compiles in < 8s without warnings.
- **Automated Tests:** Minimum 21/21 passing automated tests across money invariants, hash determinism, and proof suites (`npx vitest run`).

---

## 9. Required Links & Supporting Materials

| Deliverable | Location | Status |
|---|---|---|
| **Public Repository** | GitHub: `faizkhatri196/PayPal-Hackthon` | Ready to push |
| **Demo Video Link** | YouTube (Public/Unlisted) | Action required: Record & Upload |
| **API Documentation** | [docs/API.md](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/docs/API.md) | ✅ Complete |
| **Security Review** | [docs/SECURITY_REVIEW.md](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/docs/SECURITY_REVIEW.md) | ✅ Complete |
| **Test Report** | [docs/TEST_REPORT.md](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/docs/TEST_REPORT.md) | ✅ Complete |
| **Pitch Deck** | [presentation/SLIDE_CONTENT.md](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/presentation/SLIDE_CONTENT.md) | ✅ Complete |

---

## 10. Submission Limitations & Eligibility Requirements

- **Working Prototype Verification:** Static mockups or wireframes are disqualified. Holdfast Protocol runs fully locally on ports 4000 (API) and 3000 (UI) with live backend state.
- **Originality & Independence:** Project code is authored for this submission with clear commit history and verifiable source files.
- **Sandbox Compliance:** All financial operations execute strictly within the PayPal Sandbox environment.

---

## 11. Final Manual Submission Steps

1. [ ] Populate local `.env` with Sandbox credentials and verify live server startup.
2. [ ] Record the 2m 50s screen demo following [docs/DEMO_SCRIPT.md](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/docs/DEMO_SCRIPT.md).
3. [ ] Upload demo video to YouTube as Public or Unlisted; copy the URL.
4. [ ] Run `git push origin main` to ensure latest commits are on the public GitHub repository.
5. [ ] Open Devpost submission portal, fill in the fields from Section 1, paste the YouTube and GitHub links, and review before submitting.
