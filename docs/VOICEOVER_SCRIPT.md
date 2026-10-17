# Holdfast Protocol — Voice-Over Narration Script

**Target Duration:** 2 minutes 50 seconds (170 seconds)  
**Total Spoken Words:** ~345 words  
**Speaking Rate:** 120–125 words per minute (deliberate, confident, natural tempo with clear pauses)  
**Tone:** Experienced product engineer explaining a practical software innovation to an intelligent general audience.  
**Strict Rule:** Zero promotional claims, zero prize or award references, zero exaggerated guarantees.

---

## Pronunciation & Concept Translation Guide

| Written Term | How to Say It | Plain English Explanation for Judges |
|---|---|---|
| **Holdfast Protocol** | *HOLD-fast PRO-tuh-kahl* | The software layer that manages verification and payment decisions. |
| **PayPal** | *PAY-pal* | The underlying payment network managing authorization holds and tranches. |
| **Deterministic Verifier (Gate 1)** | *Rule-based verifier* | "A rule-based check that applies agreed requirements consistently, with zero hallucination." |
| **AI Adversarial Reviewer (Gate 2)** | *AI safety reviewer* | "An AI reviewer that acts strictly as a veto against prompt injection and malicious instructions." |
| **Acceptance Receipt** | *Tamper-evident receipt* | "A cryptographic record whose integrity can be checked to detect changes." |
| **MCP** | *M-C-P (Model Context Protocol)* | "An industry-standard interface that allows autonomous agents to trigger contracts and submissions." |

---

## Timed Narration Script

### Section 1: The Human Problem & Core Idea
**Timestamp:** `00:00 – 00:25`  
**Estimated Spoken Words:** 52 words  
**Speaking Pace:** Steady, conversational  

> "Imagine a business hiring an autonomous AI agent to produce a critical digital deliverable, like market research or code audit reports.
>
> If you pay upfront, you risk hallucinations and broken data. But if the worker delivers before payment, they risk non-payment.
>
> Existing payment tools let agents spend, but none verify delivery before releasing funds."

*(2-second pause. Transition to dashboard view.)*

---

### Section 2: Introducing Holdfast Protocol
**Timestamp:** `00:27 – 00:52`  
**Estimated Spoken Words:** 54 words  
**Speaking Pace:** Clear, engaging  

> "Holdfast Protocol solves this with software-enforced authorization holds on PayPal, combined with a dual-gate verification pipeline.
>
> In our dashboard, you can see real-time financial tracking: funds currently protected under PayPal authorization, completed milestone payments, and tasks awaiting verification.
>
> Every dollar tracked here reflects actual contract state, rather than hardcoded metrics."

*(2-second pause. Click into contract detail view.)*

---

### Section 3: PayPal Authorization Hold & Milestone Submission
**Timestamp:** `00:54 – 01:25`  
**Estimated Spoken Words:** 58 words  
**Speaking Pace:** Measured, focused on screen action  

> "When a contract begins, Holdfast creates a non-custodial authorization hold using PayPal Orders v2. The buyer’s funds are guaranteed, but no money moves yet.
>
> Here, a worker agent submits a competitive pricing dataset for milestone one.
>
> Notice that the deliverable is not evaluated by an unconstrained AI model. It must first pass our deterministic rule check."

*(2-second pause. Demonstrate Gate 1 verification.)*

---

### Section 4: Dual-Gate Verification (Deterministic Rules + AI Veto)
**Timestamp:** `01:27 – 01:58`  
**Estimated Spoken Words:** 62 words  
**Speaking Pace:** Technical clarity, deliberate emphasis  

> "Gate 1 deterministically checks schema types, required keys, and positive price bounds. It is the sole authority permitted to release funds.
>
> Next, Gate 2 uses Gemini Flash strictly as an adversarial reviewer. It inspects the payload for prompt injection, jailbreaks, or instruction overrides.
>
> The AI cannot authorize payments—it can only issue a veto if malicious instructions are detected."

*(2-second pause. Open receipt modal.)*

---

### Section 5: Acceptance Receipts & Partial Tranche Capture
**Timestamp:** `02:00 – 02:30`  
**Estimated Spoken Words:** 65 words  
**Speaking Pace:** Smooth, demonstrative  

> "Once both gates pass, Holdfast generates a tamper-evident acceptance receipt signed with SHA-256. If even one byte of the deliverable payload is modified, the signature check fails immediately.
>
> Holdfast then instructs PayPal to capture that exact tranche from the authorization hold.
>
> If a milestone is rejected or canceled, the remaining balance can be voided back to the buyer instantly."

*(2-second pause. Transition to MCP tools and test suite terminal.)*

---

### Section 6: Standardized Agent Tooling & Conclusion
**Timestamp:** `02:32 – 02:50`  
**Estimated Spoken Words:** 54 words  
**Speaking Pace:** Confident, forward-looking  

> "Through the Model Context Protocol, any AI agent can create contracts, submit deliverables, and retrieve verified receipts programmatically.
>
> Our complete suite of twenty-one automated tests validates these money invariants and cryptographic proofs.
>
> Holdfast Protocol provides the verifiable foundation needed for autonomous commerce on the global PayPal network."

*(Fade to clean end card with GitHub URL.)*

---

## Recording Checklist for the Voice-Over Artist / Engineer

1. **Microphone Setup:** Use a dedicated USB/XLR microphone positioned 6 inches away with a pop filter. Avoid built-in laptop microphones.
2. **Room Acoustics:** Record in a quiet room with soft furnishings to eliminate room echo and fan noise.
3. **Pacing:** Do not rush. Let the screen action breathe. Follow the estimated timestamps to ensure video and voice synchronize naturally.
4. **Volume Normalization:** Normalize the vocal track to -14 LUFS (integrated) with a peak limiter at -1.0 dB.
