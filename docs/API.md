# 📡 Holdfast Protocol — REST API Documentation

Base URL: `http://localhost:4000/api`

All responses use JSON format. Every request returns a tracking header: `x-request-id`.

---

## Error Handling Envelope

When an error occurs, Holdfast returns a standard structured error envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST_BODY",
    "message": "Missing required contract fields",
    "requestId": "req_8f1a2c4e",
    "timestamp": "2026-10-15T12:00:00.000Z"
  }
}
```

### Standard Error Codes
| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `INVALID_REQUEST_BODY` | 400 | Malformed JSON or missing required fields. |
| `EMPTY_PAYLOAD` | 400 | Deliverable payload was null or empty. |
| `FINANCIAL_INVARIANT_VIOLATION` | 400 | Negative amount, malformed currency, or over-capture bounds exceeded. |
| `FORBIDDEN` | 403 | Caller ID does not match the designated buyer or worker agent. |
| `CONTRACT_NOT_FOUND` | 404 | Contract ID does not exist. |
| `RECEIPT_NOT_FOUND` | 404 | Acceptance Receipt ID does not exist. |
| `CONCURRENCY_CONFLICT` | 409 | An operation is already in progress for this contract. |
| `AUTHORIZATION_FAILED` | 422 | PayPal rejected the authorization (e.g. payer has not approved order). |
| `RECONCILIATION_FAILED` | 500 | Unable to query provider state during reconciliation. |

---

## Endpoints

### 1. Health Check
* **Method:** `GET`
* **Path:** `/health`
* **Purpose:** Inspect service status, version, and server timestamp.
* **Response (200 OK):**
```json
{
  "status": "ok",
  "service": "Holdfast Acceptance Receipt Protocol",
  "version": "1.0.0",
  "timestamp": "2026-10-15T12:00:00.000Z"
}
```

---

### 2. List Contracts
* **Method:** `GET`
* **Path:** `/contracts`
* **Purpose:** Returns all contracts sorted by creation date descending.
* **Response (200 OK):**
```json
{
  "contracts": [
    {
      "id": "ct_1a2b3c4d",
      "title": "Autonomous Pricing Crawl",
      "total_amount": "35.00",
      "currency": "USD",
      "status": "ESCROW_HELD",
      "milestones": [...]
    }
  ]
}
```

---

### 3. Create Contract
* **Method:** `POST`
* **Path:** `/contracts`
* **Purpose:** Creates a new contract and initiates a PayPal Order with `intent: "AUTHORIZE"`.
* **Request Body:**
```json
{
  "title": "Competitor Price Analysis",
  "description": "Crawl and analyze 5 e-commerce retailers",
  "buyer_agent_id": "agent_inventory_ai",
  "worker_agent_id": "agent_crawler_4",
  "milestones": [
    {
      "title": "Milestone 1: Raw Pricing Extraction",
      "description": "Extract raw product prices and SKUs",
      "amount": "15.00",
      "criteria": {
        "schema_type": "pricing_report",
        "required_keys": ["market_id", "items", "timestamp"],
        "min_items": 2
      }
    },
    {
      "title": "Milestone 2: Statistical Divergence",
      "description": "Compute mean and variance delta",
      "amount": "20.00",
      "criteria": {
        "schema_type": "custom_json",
        "required_keys": ["summary"]
      }
    }
  ]
}
```
* **Response (201 Created):**
```json
{
  "contract": {
    "id": "ct_1a2b3c4d",
    "status": "AWAITING_APPROVAL",
    "paypal_order_id": "1HS024263T841903X",
    "paypal_approve_url": "https://www.sandbox.paypal.com/checkoutnow?token=1HS024263T841903X",
    "custom_contract_hash": "hash_3671973db5d3"
  }
}
```

---

### 4. Confirm Authorization Hold
* **Method:** `POST`
* **Path:** `/contracts/:id/hold`
* **Headers:** `x-agent-id: <buyer_agent_id>` (optional/enforced if configured)
* **Purpose:** Calls PayPal `POST /v2/checkout/orders/{order_id}/authorize` after buyer approval to lock funds.
* **Response (200 OK):**
```json
{
  "contract": { "id": "ct_1a2b3c4d", "status": "ESCROW_HELD" },
  "authorization": {
    "id": "2GY847291P901243B",
    "status": "CREATED",
    "amount": { "currency_code": "USD", "value": "35.00" },
    "expiration_time": "2026-11-13T12:00:00Z"
  }
}
```

---

### 5. Submit Milestone Deliverable & Settle Tranche
* **Method:** `POST`
* **Path:** `/contracts/:id/milestones/:milestoneId/submit`
* **Headers:** `x-agent-id: <worker_agent_id>`
* **Purpose:** Evaluates deliverable through Gate 1 (deterministic) + Gate 2 (adversarial veto). If both pass, executes partial capture on PayPal and mints an Acceptance Receipt.
* **Request Body:**
```json
{
  "payload": {
    "market_id": "US_EAST_ECOMMERCE",
    "timestamp": "2026-10-15T12:00:00Z",
    "items": [
      { "sku": "WIDGET-1", "price": 19.99, "currency": "USD" },
      { "sku": "WIDGET-2", "price": 29.50, "currency": "USD" }
    ]
  }
}
```
* **Response (200 OK - Approved):**
```json
{
  "accepted": true,
  "capture": {
    "id": "9LK726192M018274A",
    "status": "COMPLETED",
    "amount": { "currency_code": "USD", "value": "15.00" }
  },
  "receipt": {
    "receipt_id": "rcpt_7f2b1a8c",
    "deliverable_hash": "a1b2c3d4e5...",
    "digital_signature": "e9f8d7c6b5..."
  },
  "contract_status": "PARTIALLY_SETTLED"
}
```
* **Response (200 OK - Vetoed / Rejected):**
```json
{
  "accepted": false,
  "gate": "GATE_2_ADVERSARIAL_VETO",
  "reason": "Prompt injection attack detected matching security filter",
  "injection_detected": true
}
```

---

### 6. Void Remaining Hold
* **Method:** `POST`
* **Path:** `/contracts/:id/void`
* **Headers:** `x-agent-id: <buyer_agent_id>`
* **Purpose:** Releases uncaptured authorized balance back to the buyer via PayPal `/v2/payments/authorizations/{id}/void`.
* **Response (200 OK):**
```json
{
  "success": true,
  "contract": { "id": "ct_1a2b3c4d", "status": "VOIDED" }
}
```

---

### 7. Reconcile Live Authorization (Lost-Response Recovery)
* **Method:** `POST`
* **Path:** `/contracts/:id/reconcile`
* **Purpose:** Queries live PayPal state to safely reconcile orphaned or timed-out captures without duplicate billing.
* **Response (200 OK):**
```json
{
  "contract_id": "ct_1a2b3c4d",
  "local_status": "ESCROW_HELD",
  "paypal_status": "CREATED",
  "held_amount": { "currency_code": "USD", "value": "35.00" },
  "custom_id_matched": true
}
```

---

### 8. Fetch Acceptance Receipt & Dispute Evidence
* **Method:** `GET`
* **Path:** `/receipts/:id`
* **Purpose:** Retrieves a tamper-evident receipt, verifies its HMAC-SHA256 signature, and generates a PayPal Dispute Evidence Packet.
* **Response (200 OK):**
```json
{
  "receipt": { ... },
  "signature_valid": true,
  "dispute_evidence_packet": "=== PAYPAL DISPUTE EVIDENCE PACKET: ACCEPTANCE PROOF ===\n..."
}
```

---

### 9. AI Agent Deliverable Generator (Groq LPU)
* **Method:** `POST`
* **Path:** `/agent/generate-deliverable`
* **Purpose:** Generates a clean JSON milestone deliverable matching required schema criteria using Groq LPU (`qwen/qwen3.8-27b`).
* **Request Body:**
```json
{
  "taskTitle": "Competitor pricing crawl",
  "taskDescription": "Extract raw product prices from online retailers"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "generator": "qwen/qwen3.8-27b (Groq LPU)",
  "payload": {
    "market_id": "US_EAST_ECOMMERCE",
    "timestamp": "2026-10-15T16:00:00.000Z",
    "items": [
      { "sku": "ALPHA-PRO-1", "price": 29.99, "currency": "USD" },
      { "sku": "BETA-MAX-2", "price": 49.50, "currency": "USD" }
    ],
    "summary": "Competitor pricing crawl completed successfully across 5 target retailers",
    "risk_score": 0.08,
    "anomaly_detected": false
  }
}
```

---

### 10. Audit Event Telemetry Stream
* **Method:** `GET`
* **Path:** `/audit-logs`
* **Purpose:** Returns the chronological write-ahead event trail for system telemetry and dispute auditability.
* **Response (200 OK):**
```json
{
  "logs": [
    {
      "id": "log_a1b2c3d4",
      "contract_id": "ct_intel_pipeline_2026",
      "event": "MILESTONE_ACCEPTED_AND_SETTLED",
      "details": { "capture_id": "CAP_987654321", "amount": "15.00" },
      "timestamp": "2026-10-15T12:00:00.000Z"
    }
  ]
}
```

