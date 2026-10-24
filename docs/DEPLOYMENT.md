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

---

## 7. Step-by-Step Deployment: Render (Backend) & Vercel (Frontend)

Holdfast Protocol is built as a TypeScript monorepo with an Express API backend (`apps/server`) and a React + Vite frontend (`apps/web`). The recommended production deployment splits the services across **Render** (for persistent Node.js/Express execution) and **Vercel** (for high-performance global CDN edge delivery of the Vite SPA).

```
                      ┌─────────────────────────────────┐
                      │   Vercel Global Edge Network    │
                      │  (@holdfast/web - React + Vite) │
                      └────────────────┬────────────────┘
                                       │
                      /api/* rewrites  │  (Zero CORS issues)
                                       ▼
                      ┌─────────────────────────────────┐
                      │      Render Web Service         │
                      │  (@holdfast/server - Node.js)   │
                      └─────────────────────────────────┘
```

---

### Step 1: Deploy Backend to Render

You can deploy the backend to Render using either the **Render Dashboard** or the **Render Blueprint (`render.yaml`)**.

#### Method A: Using Render Blueprint (`render.yaml`) (Easiest)

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat(deploy): add render and vercel deployment configs"
   git push origin main
   ```
2. Go to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** ➔ **Blueprint**.
4. Connect your GitHub repository (`PayPal-Hackthon`).
5. Render detects the root [`render.yaml`](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/render.yaml) automatically.
6. Under environment variables, enter your secrets:
   - `PAYPAL_CLIENT_ID`: Your PayPal Sandbox App Client ID
   - `PAYPAL_CLIENT_SECRET`: Your PayPal Sandbox App Client Secret
   - `GEMINI_API_KEY`: Google Gemini API key (optional for AI review)
7. Click **Apply**.
8. Once deployed, Render provides your public backend URL (e.g., `https://holdfast-protocol-api.onrender.com`).

#### Method B: Manual Web Service Setup on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) ➔ **New +** ➔ **Web Service**.
2. Select your GitHub repository (`PayPal-Hackthon`).
3. Configure the service settings:
   - **Name**: `holdfast-protocol-api`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Region**: `Oregon (US West)` or closest to your users
   - **Build Command**:
     ```bash
     npm install && npm run build --workspace=@holdfast/server
     ```
   - **Start Command**:
     ```bash
     node apps/server/dist/index.js
     ```
   - **Instance Type**: `Free`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `PAYPAL_BASE_URL`: `https://api-m.sandbox.paypal.com`
   - `PAYPAL_CLIENT_ID`: `<your_sandbox_client_id>`
   - `PAYPAL_CLIENT_SECRET`: `<your_sandbox_client_secret>`
   - `RECEIPT_SECRET`: `<generate_random_32_char_hex>`
   - `CORS_ORIGIN`: `*`
   - `AI_PROVIDER`: `gemini`
   - `GEMINI_API_KEY`: `<your_gemini_key>`
5. Click **Create Web Service**.
6. Note down the assigned URL: `https://<YOUR-RENDER-APP>.onrender.com`.
7. Verify health:
   ```bash
   curl https://<YOUR-RENDER-APP>.onrender.com/api/health
   ```

---

### Step 2: Deploy Frontend to Vercel

The root [`vercel.json`](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/vercel.json) automatically proxies `/api/*` requests to your Render backend and directs all other routes to `/index.html`.

#### Method A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository (`faizkhatri196/PayPal-Hackthon`).
4. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Leave as `./` (project root)
   - **Build Command**: (Override if needed): `npm run build --workspace=@holdfast/web`
   - **Output Directory**: `apps/web/dist`
5. Update [`vercel.json`](file:///c:/Users/Infinity/OneDrive/Desktop/Paypal%20Hackthon/vercel.json) destination URL with your actual Render URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://<YOUR-RENDER-APP>.onrender.com/api/$1"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
6. Click **Deploy**.
7. Vercel builds the bundle and assigns your production domain (e.g., `https://paypal-hackthon.vercel.app`).

#### Method B: Using Vercel CLI

```bash
# 1. Install Vercel CLI globally if not already installed
npm install -g vercel

# 2. Log in to Vercel
vercel login

# 3. Deploy preview
vercel

# 4. Deploy directly to production
vercel --prod
```

---

### Step 3: Verify the Live Deployment

After both services are running:

1. **Verify Backend Health**:
   ```bash
   curl -s https://<YOUR-RENDER-APP>.onrender.com/api/health | jq .
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "Holdfast Acceptance Receipt Protocol",
     "paypal_status": "CONNECTED"
   }
   ```

2. **Verify Frontend Proxy**:
   Visit your Vercel URL in your browser:
   `https://<YOUR-VERCEL-APP>.vercel.app`

3. **Verify Interactive Features**:
   - The top banner shows `PayPal Sandbox: Connected`.
   - Run the `$15.00 Standard Settlement` test scenario.
   - Run the `$150.00 Ceiling Breach` policy check.
   - Run the `Prompt Injection Veto` test.
   - Search and sort in the AG Grid ledger.
