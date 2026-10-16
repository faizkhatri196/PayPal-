# Contributing to Holdfast Protocol

Thank you for your interest in contributing to Holdfast Protocol — safe payments and non-custodial authorization holds for autonomous AI agents.

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/faizkhatri196/PayPal-Hackthon.git
   cd PayPal-Hackthon
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and provide your PayPal Sandbox credentials and AI API keys:
   ```bash
   cp .env.example .env
   ```

4. **Run the local servers**:
   - Backend API: `npm run dev --workspace=apps/server` (Port 4000)
   - Frontend UI: `npm run dev --workspace=apps/web` (Port 3000)

## Financial Code Invariants

When modifying backend financial or verification logic:

- **Never capture without prior authorization**: Captures must reference a valid PayPal authorization hold.
- **Enforce Decimal Precision**: All arithmetic calculations must preserve cents formatting (`toFixed(2)`).
- **Never allow LLMs to directly capture funds**: LLM roles are strictly limited to proposal generation (Worker) or adversarial veto (Auditor).
- **Preserve Idempotency Keys**: All network calls to PayPal capture and void endpoints must pass a deterministic or UUID-based idempotency key.

## Running Tests

Before submitting a Pull Request, verify that all 18 automated tests pass:

```bash
npx vitest run
```

And verify the web build:

```bash
npm run build --workspace=apps/web
```
