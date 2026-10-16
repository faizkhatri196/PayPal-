# Security Policy — Holdfast Protocol

Holdfast Protocol enforces non-custodial authorization holds and multi-gate verification controls governing autonomous financial movements between AI agents.

## Core Security Invariants

Holdfast enforces five mathematical and cryptographic invariants across all payment and deliverable flows:

1. **Non-Custodial Escrow**: Funds are held directly on PayPal under authorization status `CREATED`, never stored in intermediate company accounts or custodial wallets.
2. **Deterministic Release Authority**: AI models (including LLMs) have **zero direct financial release authority**. Only deterministic code enforcing JSON schema validation and arithmetic bounds checks can authorize PayPal capture.
3. **Adversarial Veto-Only Principle**: The secondary AI auditor (Gemini 2.5 Flash / Groq LPU) operates in a **veto-only** capacity. It can block or challenge suspicious deliverables (such as prompt injections or hallucinations), but it can never unilaterally approve or release money.
4. **Idempotent Settlement**: Every tranche capture request utilizes deterministic idempotency keys (`cap_{milestone_id}_{hash}`) preventing duplicate captures across retried requests or network partitions.
5. **Cryptographic Acceptance Receipts**: Settled transactions generate tamper-evident receipts signed via HMAC-SHA256, binding the contract ID, deliverable hash, PayPal capture ID, and timestamp into an immutable dispute packet ready for the PayPal Resolution Center.

## Dual-Gate Verification Policy

```
[ Worker Agent Output ]
           │
           ▼
[ Gate 1: Deterministic Engine ] ──(Fails)──► REJECT / CAPTURE BLOCKED
           │ (Passes)
           ▼
[ Gate 2: Adversarial Auditor ]  ──(Vetoes)──► REJECT / PROMPT INJECTION BLOCKED
           │ (Passes)
           ▼
[ PayPal Sandbox Capture ]
           │
           ▼
[ HMAC-SHA256 Receipt Minted ]
```

## Vulnerability Reporting

If you discover a security vulnerability within Holdfast Protocol, please report it privately:

- **Email**: security@holdfastprotocol.org
- **Response SLA**: Within 24 hours
- **Disclosure Policy**: Coordinated disclosure following verified remediation.

Please do not open public GitHub issues for security vulnerabilities.
