# 📘 Holdfast Protocol — PayPal Sandbox Integration Guide

This guide explains how to configure, test, and verify the Holdfast Protocol against the live **PayPal Developer Sandbox**.

---

## 1. Required Credentials & Configuration

To interact with the live PayPal Sandbox, you need an application created on the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox).

### Required Environment Variables in `.env`
Create a `.env` file in the project root (never commit this file to version control):

```env
PORT=4000
NODE_ENV=development

# PayPal Developer Sandbox (Obtain from developer.paypal.com)
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# Cryptographic Receipt Secret
RECEIPT_SECRET=your_secure_hmac_signing_secret_here
```

### Keeping Credentials Private
- The root `.gitignore` strictly ignores `.env` and `.env.*`.
- **Backend Isolation:** Only `apps/server` accesses PayPal credentials. The frontend (`apps/web`) communicates exclusively with `apps/server` and has zero knowledge of PayPal secrets.
- **Never Log Secrets:** Client tokens and secrets are never printed to terminal logs, audit logs, or error responses.

---

## 2. The Complete Sandbox Payment Lifecycle

Holdfast strictly follows the official PayPal Orders v2 and Payments v2 sequence:

```
[1. Create Order] ──► [2. Buyer Approves] ──► [3. Authorize Order] ──► [4. Partial Capture(s)] ──► [5. Void Remainder]
(intent: AUTHORIZE)    (sandbox.paypal.com)     (/orders/{id}/authorize)  (/authorizations/{id}/capture)  (/authorizations/{id}/void)
```

### Step 1: Create Order (`intent: "AUTHORIZE"`)
- **API Call:** `POST /v2/checkout/orders`
- **Payload:**
  - `intent: "AUTHORIZE"`
  - `purchase_units[0].custom_id: <contract_hash>` (Binds PayPal transaction to internal contract hash)
  - `purchase_units[0].amount.value: "35.00"`
  - `purchase_units[0].items`: Itemized breakdown of milestone tranches.
- **Result:** PayPal returns `order_id` (status `CREATED`) and an `approve` link.
- **Note:** *Creating an order does NOT place a hold on funds.*

### Step 2: Buyer Approval
- Open the returned `approve` link: `https://www.sandbox.paypal.com/checkoutnow?token={order_id}`.
- Log in with your PayPal Sandbox Personal/Buyer test account (e.g., `sb-buyer@business.example.com`).
- Click **"Continue" / "Authorize"**.
- PayPal redirects to `return_url` with the authorization token.

### Step 3: Authorize Order (Place the Hold)
- **API Call:** `POST /v2/checkout/orders/{order_id}/authorize`
- **Result:** Returns `authorization_id` with status `CREATED`.
- **Hold Guarantee:** Funds are now held on the buyer's payment source.
  - **Honor Period:** 3 days (guaranteed settlement).
  - **Maximum Validity:** 29 days before automatic expiration.

### Step 4: Tranche Capture (`final_capture: false`)
- **API Call:** `POST /v2/payments/authorizations/{authorization_id}/capture`
- **Header:** `PayPal-Request-Id: <uuidv4>` (Guarantees idempotency; protects against network drop retries).
- **Payload:**
  - `amount.value: "15.00"`
  - `final_capture: false` (Leaves remaining $20.00 authorized for future milestones).
- **Result:** PayPal captures $15.00 into the Merchant of Record account and returns `capture_id` with status `COMPLETED`.
- **Acceptance Receipt:** Holdfast immediately mints an HMAC-signed receipt for Milestone 1.

### Step 5: Voiding Remaining Hold
- **API Call:** `POST /v2/payments/authorizations/{authorization_id}/void`
- **Header:** `PayPal-Request-Id: <uuidv4>`
- **Result:** Releases the remaining uncaptured $20.00 hold. Status transitions to `VOIDED`.
- **Capital Safety:** Buyer incurs $0 loss on unfulfilled milestones.

---

## 3. Reconciliation & Lost-Response Recovery

If a network packet drops or an upstream server times out during a capture call:
1. **DO NOT blindly retry the capture.**
2. **Reconcile:** Call `GET /v2/payments/authorizations/{authorization_id}`.
3. Compare the reported live settled amount against the local database to confirm whether the tranche was already captured or is still pending.

---

## 4. Distinguishing Mocked Tests from Live Sandbox Tests

| Test Suite | Environment | Network Activity | Purpose |
| :--- | :--- | :--- | :--- |
| **`tests/proof-suite.test.ts`** | Local / Offline | Zero external calls | Validates Gate 1 schemas, Gate 2 prompt-injection defense, HMAC receipt integrity, and state machine logic in <500ms. |
| **`tests/money-invariants.test.ts`** | Local / Offline | Zero external calls | Verifies integer cents arithmetic, boundary checks, and over-capture prevention. |
| **`scripts/paypal-lifecycle-probe.mjs`** | Live Sandbox | Real calls to `api-m.sandbox.paypal.com` | Proves OAuth2, order creation, buyer approval, hold placement, partial capture, idempotency replay, and voiding. |
