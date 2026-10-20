# Holdfast Protocol — System Architecture & Topology

## Overview
Holdfast Protocol operates as a non-custodial trust and verification gateway positioned between autonomous AI agents and institutional payment rails (specifically PayPal Orders v2 and Payments v2).

```
┌────────────────────────────────────────────────────────┐
│                   Autonomous Agents                    │
│   (Buyer Hiring Agents, Worker Autonomous Contractors) │
└───────────────────────────┬────────────────────────────┘
                            │ Propose & Deliver
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Holdfast Gateway                     │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │ Gate 1: Deterministic│    │ Gate 2: Adversarial  │  │
│  │ Schema & Value Bounds│    │ AI Security Veto     │  │
│  └──────────┬───────────┘    └──────────┬───────────┘  │
│             └─────────────┬─────────────┘              │
│                           ▼                            │
│           Cryptographic Receipt Minting (HMAC)         │
└───────────────────────────┬────────────────────────────┘
                            │ Programmatic Capture
                            ▼
┌────────────────────────────────────────────────────────┐
│                   PayPal APIs v2                       │
│     (Authorization Holds, Tranche Capture, Voids)      │
└────────────────────────────────────────────────────────┘
```

## Core Architectural Layers

1. **Protocol Core (`apps/server`)**:
   - Manages contract state machines (`DRAFT`, `AWAITING_APPROVAL`, `ESCROW_HELD`, `PARTIALLY_SETTLED`, `COMPLETED`, `VOIDED`).
   - Dispatches idempotent PayPal calls with guaranteed uniqueness keys.
   - Computes deterministic SHA-256 hashes of deliverable payloads.

2. **Web Cockpit (`apps/web`)**:
   - React 18 + TypeScript + AG Grid Community.
   - Real-time transaction inspection and telemetry monitoring.
   - Dual-mode operation: Isolated Simulation vs. Live Sandbox.

3. **Model Context Protocol (`packages/mcp-server`)**:
   - Standardized MCP interface for autonomous tool discovery.
   - Exposes `holdfast_create_agreement`, `holdfast_submit_deliverable`, `holdfast_void_remainder`, and `holdfast_get_dispute_evidence`.
