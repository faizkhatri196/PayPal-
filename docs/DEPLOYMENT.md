# Holdfast Protocol — Deployment & Operations Guide

## 1. Overview & Current Deployment Status

> [!NOTE]
> **Deployment Status**: Holdfast Protocol is configured for local development and containerized cloud deployment (e.g., Google Cloud Run, AWS ECS, or Render). **The application is NOT currently publicly hosted.** All commands below describe how to deploy and configure it cleanly for production.

---

## 2. Architecture & Persistent Storage

- **Backend Architecture**: Node.js / Express TypeScript service (`@holdfast/server`) listening on `PORT` (default: 4000).
- **Frontend Architecture**: React 18 + Vite SPA (`@holdfast/web`) built as static assets or proxied on port 3000.
- **Persistence Layer**:
  - Holdfast uses an atomic JSON file storage engine (`data/holdfast-store.json`) with safe temporary write and rename (`.tmp` atomic rename) to prevent state corruption.
  - **Container Persistent Volume**: In containerized environments, mount a persistent volume at `/app/data` to ensure transaction history, receipts, approvals, and audit trails survive container restarts.
  - **No Fake Databases**: Holdfast does not pretend to use an external PostgreSQL or MongoDB instance. All records are managed via `DataStore` in `data/holdfast-store.json`.

---

## 3. Environment Variables & Secret Configuration

Never commit credentials to version control. Pass the following variables to your hosting environment:

| Variable | Description | Safe Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `4000` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `production` |
| `APP_URL` | Public base URL of backend (for return/cancel URLs) | `https://api.yourdomain.com` |
| `CORS_ORIGIN` | Allowed CORS origins for frontend requests | `https://app.yourdomain.com` |
| `VITE_API_URL` | Target API URL used by the frontend build / proxy | `https://api.yourdomain.com` |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox REST App Client ID | *(keep secret)* |
| `PAYPAL_CLIENT_SECRET`| PayPal Sandbox REST App Client Secret | *(keep secret)* |
| `PAYPAL_BASE_URL` | PayPal endpoint (`https://api-m.sandbox.paypal.com`) | `https://api-m.sandbox.paypal.com` |
| `AI_PROVIDER` | Default primary AI model (`gemini` / `groq` / `openai`) | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API Key | *(keep secret)* |
| `GROQ_API_KEY` | Groq LPU API Key | *(keep secret)* |
| `OPENAI_API_KEY` | OpenAI API Key | *(keep secret)* |
| `RECEIPT_SECRET` | HMAC-SHA256 signature secret for acceptance receipts | `min_32_characters_random_hex` |

---

## 4. Health Checks & Verification Endpoints

The server exposes dedicated endpoints for container orchestrator readiness and liveness probes:

- **Liveness Probe**: `GET /api/health`
  - Returns: `{ "status": "ok", "service": "Holdfast Acceptance Receipt Protocol", "paypal_status": "CONNECTED" | "NOT_CONFIGURED" | "CONNECTION_FAILED" }`
- **Configuration & Connection Probe**: `GET /api/status`
  - Returns active configuration, AI provider availability, and Sandbox probe results without exposing secrets.
- **On-Demand Sandbox Test**: `POST /api/paypal/test-connection`
  - Tests OAuth token acquisition against PayPal Sandbox API.

---

## 5. First-Run Developer Modes

1. **Explore Demo Mode (Zero Credentials Required)**:
   - If `PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_SECRET` is omitted, the application automatically launches in **Explore Demo** mode.
   - Sample scenarios (Safe Micro-purchase, Prompt Injection, 29-Day Hold Expiration, Lost-Response Reconciliation) run with clearly labeled simulated data.
   - No mock calls are disguised as live transactions.
2. **Connect Sandbox Mode**:
   - Supplying Sandbox credentials enables live token authentication and authorization hold creation against `api-m.sandbox.paypal.com`.

---

## 6. Build & Run Commands

```bash
# Install workspace dependencies
npm install

# Run automated tests
npm test

# Build production bundles
npm run build

# Start production server
npm run dev:server
```
