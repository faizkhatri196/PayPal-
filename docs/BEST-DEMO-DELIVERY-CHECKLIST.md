# Holdfast Protocol — Demo Delivery Quality Checklist

**Focus:** Presentation Excellence, Criteria Adherence & Video Delivery  
**Target Ceiling:** Under 3 minutes (< 180 seconds)  
**Target Video Duration:** 2 minutes 50 seconds (170 seconds)  
**Rule:** Strictly zero promotional prize language, zero marketing hyperbole.

---

## 1. Narrative & Structure Quality

- [x] **Relatable Real-World Problem:** Opening 25 seconds clearly frames the bilateral trust dilemma (paying upfront risks capital loss from hallucinations; delivering upfront risks payment default).
- [x] **Plain English Explanation:** Technical concepts are explained intuitively (e.g., Gate 1 as "a rule-based check applying agreed requirements consistently", acceptance receipts as "tamper-evident records detecting alterations").
- [x] **Target User Identified:** Clearly identifies e-commerce brands, engineering teams, and digital service buyers hiring autonomous agents.
- [x] **Solution Before Architecture:** The practical benefit of holding funds until delivery verification is stated before diving into code or APIs.
- [x] **Single Coherent Scenario:** Entire demonstration follows a single unified scenario: an e-commerce competitor pricing research task commissioned to an autonomous agent.
- [x] **Strongest Feature Highlighted Early:** PayPal authorization hold status and live financial tracking appear within the first 45 seconds.

---

## 2. Technical Demonstrations & Authenticity

- [x] **Application Visibly Functioning:** Live React dashboard running at `http://localhost:3000` with real dynamic state transitions.
- [x] **Meaningful PayPal Integration:** Demonstrates PayPal Orders v2 authorization creation (`intent: "AUTHORIZE"`) and Payments v2 milestone tranche captures.
- [x] **Meaningful AI Integration:** Demonstrates Gemini 2.5 Flash acting strictly as a veto-only safety reviewer against prompt injection and malicious instructions.
- [x] **Visible Financial Results:** Financial metrics update dynamically (Funds Protected decrements from $35 to $20 as Milestone 1 is captured for $15).
- [x] **Cryptographic Receipts Demonstrated:** HMAC-SHA256 acceptance receipt displayed in modal, with live tamper detection test confirming 1-byte alteration failure.
- [x] **Zero Unverified Features:** Every demonstrated button, endpoint, and test case corresponds to implemented, passing source code.
- [x] **Zero Secrets Displayed:** No `.env` credentials, private keys, access tokens, or live customer account data appear on screen.

---

## 3. Video Production & Delivery Standards

- [x] **Audio-Visual Synchronization:** Narration in `docs/VOICEOVER_SCRIPT.md` aligns precisely with mouse movements and screen transitions in `docs/DEMO_SCRIPT.md`.
- [x] **Elimination of Dead Space:** Zero unexplained delays, loading freezes, or terminal hangs. All long operations use pre-seeded test states.
- [x] **Minimal On-Screen Text:** No distracting TikTok-style captions or blocks of text. Only clean, discreet state pills (`PayPal Orders v2: Authorization Active`, `Gate 1: Rules Pass`).
- [x] **Strict Duration Compliance:** Script and shot list strictly timed at **2 minutes 50 seconds**, providing a 10-second safety margin below the 3:00 ceiling.
- [x] **Public YouTube Availability:** Recording guide specifies Public or Unlisted YouTube upload settings with high-definition 1080p rendering.
- [x] **Ownership & Licensing:** All codebase assets are open source under the MIT License; all visual assets are proprietary to the project.
- [x] **Memorable Conclusion:** Concludes with a clear summary of why software-enforced trust layers are essential as autonomous agents participate in digital commerce.

---

## Quick Recording Pre-Flight Checklist

Before hitting record on OBS Studio:
1. [ ] Backend running on `http://localhost:4000/api` (verify `/api/health` returns `200 OK`).
2. [ ] Frontend running on `http://localhost:3000` (browser zoom set to 110%).
3. [ ] Chrome bookmarks bar, extension icons, and operating system taskbar hidden.
4. [ ] Microphone input tested and vocal level peaking between -6 dB and -3 dB.
5. [ ] Terminal open on secondary window ready to showcase `npx vitest run` (21/21 passing tests).
