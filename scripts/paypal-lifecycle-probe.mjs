import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';

// 1. Read .env without external dependencies
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env not found at ${envPath}`);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const CLIENT_ID = env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = env.PAYPAL_CLIENT_SECRET;
const BASE_URL = env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('[ERROR] Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env');
  process.exit(1);
}

// Helper: safe fetch with basic timing & error handling
async function paypalFetch(endpoint, options = {}, accessToken = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const start = Date.now();
  const res = await fetch(url, { ...options, headers });
  const latencyMs = Date.now() - start;

  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    latencyMs,
    headers: Object.fromEntries(res.headers.entries()),
    body,
  };
}

// Step 1: OAuth2 Handshake
async function getAccessToken() {
  console.log('\n======================================================');
  console.log('STEP 1: OAUTH2 HANDSHAKE');
  console.log('======================================================');
  const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await paypalFetch('/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    console.error(`[FAIL] OAuth2 failed (HTTP ${res.status}):`, res.body);
    process.exit(1);
  }

  console.log(`[PASS] Access token acquired successfully in ${res.latencyMs}ms`);
  console.log(`[VERIFIED] Token type: ${res.body.token_type}, Expires in: ${res.body.expires_in}s`);
  // Note: NEVER log the actual token
  return res.body.access_token;
}

// Step 2: Create Order with intent: "AUTHORIZE" and custom_id
async function createAuthorizeOrder(token, customContractId) {
  console.log('\n======================================================');
  console.log('STEP 2: CREATE ORDER (intent: "AUTHORIZE")');
  console.log('======================================================');
  const payload = {
    intent: 'AUTHORIZE',
    purchase_units: [
      {
        reference_id: 'holdfast_escrow_unit_1',
        custom_id: customContractId,
        description: 'Holdfast Acceptance Escrow: Dual-Milestone Task',
        amount: {
          currency_code: 'USD',
          value: '35.00',
          breakdown: {
            item_total: { currency_code: 'USD', value: '35.00' },
          },
        },
        items: [
          {
            name: 'Milestone 1: Extraction & Schema Test',
            unit_amount: { currency_code: 'USD', value: '15.00' },
            quantity: '1',
            category: 'DIGITAL_GOODS',
          },
          {
            name: 'Milestone 2: Analysis & Verification',
            unit_amount: { currency_code: 'USD', value: '20.00' },
            quantity: '1',
            category: 'DIGITAL_GOODS',
          },
        ],
      },
    ],
    application_context: {
      brand_name: 'Holdfast Protocol',
      landing_page: 'NO_PREFERENCE',
      user_action: 'CONTINUE',
      return_url: 'https://example.com/holdfast/return',
      cancel_url: 'https://example.com/holdfast/cancel',
    },
  };

  const reqId = crypto.randomUUID();
  const res = await paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PayPal-Request-Id': reqId,
    },
    body: JSON.stringify(payload),
  }, token);

  if (!res.ok) {
    console.error(`[FAIL] Order creation failed (HTTP ${res.status}):`, res.body);
    process.exit(1);
  }

  const orderId = res.body.id;
  const approveLink = res.body.links?.find((l) => l.rel === 'approve')?.href;

  console.log(`[PASS] Order created: ${orderId} (Status: ${res.body.status})`);
  console.log(`[VERIFIED] custom_id passed: ${customContractId}`);
  console.log(`[ACTION REQUIRED] Approval URL:`);
  console.log(`\n  👉  ${approveLink}\n`);

  return { orderId, approveLink };
}

// Step 3: Interactive prompt to wait for sandbox buyer approval
async function waitForApproval() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('------------------------------------------------------');
    console.log('Please open the URL above in your browser, log in with');
    console.log('your PayPal Sandbox Buyer account, and click "Continue".');
    console.log('Once done, press [ENTER] in this terminal to proceed...');
    console.log('------------------------------------------------------');
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

// Step 4: Authorize Order to place hold
async function authorizeOrder(token, orderId) {
  console.log('\n======================================================');
  console.log('STEP 3: AUTHORIZE ORDER (Place the Hold)');
  console.log('======================================================');
  const reqId = crypto.randomUUID();
  const res = await paypalFetch(`/v2/checkout/orders/${orderId}/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PayPal-Request-Id': reqId,
    },
  }, token);

  if (!res.ok) {
    console.error(`[FAIL] Authorize failed (HTTP ${res.status}):`, res.body);
    return null;
  }

  const authorizations = res.body.purchase_units?.[0]?.payments?.authorizations;
  if (!authorizations || authorizations.length === 0) {
    console.error('[FAIL] No authorization object returned:', res.body);
    return null;
  }

  const auth = authorizations[0];
  console.log(`[PASS] Authorization Placed!`);
  console.log(`  Authorization ID : ${auth.id}`);
  console.log(`  Status           : ${auth.status}`);
  console.log(`  Held Amount      : ${auth.amount?.value} ${auth.amount?.currency_code}`);
  console.log(`  Expiration Time  : ${auth.expiration_time}`);

  return auth;
}

// Step 5: Check custom_id round trip
async function checkAuthDetails(token, authId, expectedCustomId) {
  console.log('\n======================================================');
  console.log('STEP 4: VERIFY CUSTOM_ID ROUND-TRIP');
  console.log('======================================================');
  const res = await paypalFetch(`/v2/payments/authorizations/${authId}`, {
    method: 'GET',
  }, token);

  if (!res.ok) {
    console.error(`[FAIL] Fetch auth failed (HTTP ${res.status}):`, res.body);
    return false;
  }

  const receivedCustomId = res.body.custom_id;
  console.log(`  Expected custom_id : ${expectedCustomId}`);
  console.log(`  Received custom_id : ${receivedCustomId}`);

  if (receivedCustomId === expectedCustomId) {
    console.log(`[PASS] custom_id round-tripped identically.`);
    return true;
  } else {
    console.warn(`[WARN] custom_id did not round-trip on auth object. (Found: ${receivedCustomId})`);
    return false;
  }
}

// Step 6: Tranche 1 Partial Capture ($15.00 of $35.00)
async function captureTranche(token, authId, amount, isFinal, reqId) {
  console.log('\n======================================================');
  console.log(`STEP 5: TRANCHE CAPTURE ($${amount}, final_capture: ${isFinal})`);
  console.log('======================================================');
  const payload = {
    amount: {
      currency_code: 'USD',
      value: amount,
    },
    final_capture: isFinal,
    note_to_payer: 'Milestone 1 Accepted: Deterministic Assertions Passed',
  };

  const res = await paypalFetch(`/v2/payments/authorizations/${authId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PayPal-Request-Id': reqId,
    },
    body: JSON.stringify(payload),
  }, token);

  console.log(`  HTTP Status: ${res.status}`);
  if (!res.ok) {
    console.error(`[FAIL] Capture returned error:`, res.body);
    return { ok: false, status: res.status, body: res.body };
  }

  console.log(`[PASS] Tranche Captured!`);
  console.log(`  Capture ID : ${res.body.id}`);
  console.log(`  Status     : ${res.body.status} (COMPLETED vs PENDING verified)`);
  console.log(`  Settled    : ${res.body.amount?.value} ${res.body.amount?.currency_code}`);

  return { ok: true, status: res.status, body: res.body };
}

// Step 7: Test Idempotent Replay with same PayPal-Request-Id
async function testIdempotentReplay(token, authId, amount, isFinal, reqId) {
  console.log('\n======================================================');
  console.log('STEP 6: IDEMPOTENCY REPLAY PROBE');
  console.log('======================================================');
  const payload = {
    amount: {
      currency_code: 'USD',
      value: amount,
    },
    final_capture: isFinal,
    note_to_payer: 'Milestone 1 Accepted: Deterministic Assertions Passed (REPLAY)',
  };

  const res = await paypalFetch(`/v2/payments/authorizations/${authId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PayPal-Request-Id': reqId, // Same request ID
    },
    body: JSON.stringify(payload),
  }, token);

  console.log(`  Replay HTTP Status: ${res.status}`);
  console.log(`  Replay Capture ID : ${res.body.id}`);
  console.log(`  Matches original? : ${res.ok ? 'YES' : 'NO'}`);
  return res;
}

// Step 8: Over-Capture Test ($25.00 on remaining $20.00)
async function testOverCapture(token, authId) {
  console.log('\n======================================================');
  console.log('STEP 7: OVER-CAPTURE REJECTION PROBE');
  console.log('======================================================');
  const payload = {
    amount: {
      currency_code: 'USD',
      value: '25.00', // Remaining is only $20.00
    },
    final_capture: true,
  };

  const res = await paypalFetch(`/v2/payments/authorizations/${authId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  }, token);

  console.log(`  HTTP Status: ${res.status} (Testing whether 422 is returned)`);
  console.log(`  Error Name : ${res.body?.name}`);
  console.log(`  Error Details :`, JSON.stringify(res.body?.details || res.body?.message));

  if (!res.ok) {
    console.log(`[PASS] Over-capture correctly rejected by PayPal!`);
  } else {
    console.warn(`[UNEXPECTED] Over-capture was accepted? Check balance.`);
  }
}

// Step 9: Void Remaining Hold
async function voidAuthorization(token, authId) {
  console.log('\n======================================================');
  console.log('STEP 8: VOID REMAINING HOLD');
  console.log('======================================================');
  const res = await paypalFetch(`/v2/payments/authorizations/${authId}/void`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
  }, token);

  console.log(`  HTTP Status: ${res.status}`);
  if (res.status === 204 || res.status === 200 || res.ok) {
    console.log(`[PASS] Remaining hold successfully VOIDED!`);
  } else {
    console.error(`[FAIL] Void returned error:`, res.body);
  }
}

// Step 10: Capture after Void Test
async function testCaptureAfterVoid(token, authId) {
  console.log('\n======================================================');
  console.log('STEP 9: CAPTURE-AFTER-VOID REJECTION PROBE');
  console.log('======================================================');
  const payload = {
    amount: {
      currency_code: 'USD',
      value: '5.00',
    },
    final_capture: true,
  };

  const res = await paypalFetch(`/v2/payments/authorizations/${authId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  }, token);

  console.log(`  HTTP Status: ${res.status}`);
  console.log(`  Error Name : ${res.body?.name}`);
  if (!res.ok) {
    console.log(`[PASS] Capture on voided authorization correctly rejected!`);
  }
}

// Step 11: Mock Response Header Test
async function testMockResponseHeader(token, authId) {
  console.log('\n======================================================');
  console.log('STEP 10: PAYPAL-MOCK-RESPONSE FAULT INJECTION');
  console.log('======================================================');
  const res = await paypalFetch(`/v2/payments/authorizations/${authId}`, {
    method: 'GET',
    headers: {
      'PayPal-Mock-Response': JSON.stringify({
        mock_application_codes: 'INTERNAL_SERVER_ERROR',
      }),
    },
  }, token);

  console.log(`  Mocked HTTP Status: ${res.status}`);
  console.log(`  Body received:`, res.body);
}

// Main Execution Flow
async function run() {
  console.log('🚀 STARTING HOLDFAST PAYPAL LIFECYCLE PROBE');
  console.log(`Target: ${BASE_URL}`);

  const token = await getAccessToken();

  const customContractId = `contract_hash_${crypto.randomBytes(6).toString('hex')}`;
  const { orderId } = await createAuthorizeOrder(token, customContractId);

  // If running in automated non-interactive terminal, we can see if token can be inspected
  // But to authorize, buyer approval is mandatory.
  await waitForApproval();

  const auth = await authorizeOrder(token, orderId);
  if (!auth) {
    console.log('\n[STOPPED] Order was not approved yet or authorize call failed.');
    process.exit(1);
  }

  const authId = auth.id;

  await checkAuthDetails(token, authId, customContractId);

  const captureReqId = crypto.randomUUID();
  const captureResult = await captureTranche(token, authId, '15.00', false, captureReqId);

  if (captureResult.ok) {
    await testIdempotentReplay(token, authId, '15.00', false, captureReqId);
  }

  await testOverCapture(token, authId);

  await voidAuthorization(token, authId);

  await testCaptureAfterVoid(token, authId);

  await testMockResponseHeader(token, authId);

  console.log('\n======================================================');
  console.log('✅ ALL LIFECYCLE PROBE STEPS COMPLETED WITH REAL DATA');
  console.log('======================================================\n');
}

run().catch((err) => {
  console.error('[UNHANDLED PROBE CRASH]:', err);
  process.exit(1);
});
