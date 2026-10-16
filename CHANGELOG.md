# Changelog

All notable changes to Holdfast Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-15

### Added
- **Central 5-Stage Payment Workflow**: Redesigned UI to visually track:
  1. AI agent completes work (Groq LPU worker proposal)
  2. Holdfast verifies the result (Gate 1 deterministic schema & arithmetic)
  3. Payment is approved or blocked (Gate 2 Gemini 2.5 Flash adversarial veto)
  4. PayPal processes payment (PayPal Sandbox Orders & Payments v2)
  5. Proof is recorded (HMAC-SHA256 Acceptance Receipt)
- **Visible AI Model Roles**:
  - `qwen/qwen3.8-27b` on Groq LPU for autonomous deliverable generation.
  - `gemini-2.5-flash` on Google GenAI for prompt injection defense & adversarial audit.
- **Top Metrics Ribbon**: Dynamic calculation of *Funds Protected*, *Payments Completed*, and *Action Required*.
- **Interactive Judge Walkthrough Banner**: 1-click execution for valid tranche settlement, injection veto, network drop reconciliation, and 100% capital voiding.
- **Acceptance Receipts Modal**: Live HMAC-SHA256 signature verification and PayPal Resolution Center dispute packet export.
- **18 Automated Invariant Tests**: Comprehensive test suite covering money invariants, idempotency, and dual-gate proof generation.
