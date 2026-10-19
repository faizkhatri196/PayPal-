import crypto from 'node:crypto';
import { CONFIG } from '../config.js';

export interface PayPalAuthResult {
  id: string;
  status: string;
  amount: {
    currency_code: string;
    value: string;
  };
  expiration_time: string;
}

export interface PayPalCaptureResult {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'DECLINED' | 'FAILED';
  amount: {
    currency_code: string;
    value: string;
  };
  final_capture: boolean;
  create_time: string;
}

class PayPalClient {
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private async fetchAPI(endpoint: string, options: RequestInit = {}, useToken = true) {
    const url = `${CONFIG.PAYPAL.BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (useToken) {
      const token = await this.getAccessToken();
      headers.set('Authorization', `Bearer ${token}`);
    }

    const start = Date.now();
    const signal = options.signal || AbortSignal.timeout(4000);
    const res = await fetch(url, { ...options, headers, signal });
    const latencyMs = Date.now() - start;

    let body: any = null;
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

  clearCache() {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  async checkConnection(): Promise<{
    status: 'CONNECTED' | 'CONNECTION_FAILED' | 'NOT_CONFIGURED';
    connected: boolean;
    environment: 'PayPal Sandbox' | 'PayPal Live' | 'Unconfigured';
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    latencyMs?: number;
    error?: string;
    checkedAt: string;
  }> {
    const clientId = CONFIG.PAYPAL.CLIENT_ID?.trim();
    const clientSecret = CONFIG.PAYPAL.CLIENT_SECRET?.trim();
    const isSandbox = CONFIG.PAYPAL.BASE_URL.includes('sandbox');
    const environment = !clientId ? 'Unconfigured' : isSandbox ? 'PayPal Sandbox' : 'PayPal Live';

    if (!clientId || !clientSecret) {
      return {
        status: 'NOT_CONFIGURED',
        connected: false,
        environment: 'Unconfigured',
        clientIdConfigured: Boolean(clientId),
        clientSecretConfigured: Boolean(clientSecret),
        error: 'PayPal credentials not set. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server environment.',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const start = Date.now();
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await this.fetchAPI(
        '/v1/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        },
        false
      );

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errorDesc = res.body?.error_description || res.body?.message || `HTTP ${res.status}`;
        return {
          status: 'CONNECTION_FAILED',
          connected: false,
          environment,
          clientIdConfigured: true,
          clientSecretConfigured: true,
          latencyMs,
          error: `PayPal Sandbox Authentication Failed: ${errorDesc}`,
          checkedAt: new Date().toISOString(),
        };
      }

      if (!res.body?.access_token) {
        return {
          status: 'CONNECTION_FAILED',
          connected: false,
          environment,
          clientIdConfigured: true,
          clientSecretConfigured: true,
          latencyMs,
          error: 'No access token in response from PayPal OAuth service',
          checkedAt: new Date().toISOString(),
        };
      }

      this.cachedToken = res.body.access_token as string;
      this.tokenExpiresAt = Date.now() + (res.body.expires_in || 3600) * 1000;

      return {
        status: 'CONNECTED',
        connected: true,
        environment,
        clientIdConfigured: true,
        clientSecretConfigured: true,
        latencyMs,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'CONNECTION_FAILED',
        connected: false,
        environment,
        clientIdConfigured: true,
        clientSecretConfigured: true,
        error: err.message || 'Network error reaching PayPal Sandbox endpoint',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async getAccessToken(): Promise<string> {
    if (!CONFIG.PAYPAL.CLIENT_ID || !CONFIG.PAYPAL.CLIENT_SECRET) {
      throw new Error('[PayPal Client Error] PayPal Client ID or Secret is not configured in environment.');
    }

    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt - 300_000) {
      return this.cachedToken;
    }

    const authHeader = Buffer.from(
      `${CONFIG.PAYPAL.CLIENT_ID}:${CONFIG.PAYPAL.CLIENT_SECRET}`
    ).toString('base64');

    const res = await this.fetchAPI(
      '/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      },
      false
    );

    if (!res.ok) {
      throw new Error(`[PayPal OAuth Failed] HTTP ${res.status}: ${JSON.stringify(res.body)}`);
    }

    if (!res.body?.access_token) {
      throw new Error(`[PayPal OAuth Failed] No access_token in response: ${JSON.stringify(res.body)}`);
    }

    this.cachedToken = res.body.access_token as string;
    this.tokenExpiresAt = now + (res.body.expires_in || 3600) * 1000;
    return this.cachedToken;
  }

  async createAuthorizeOrder(
    contractId: string,
    contractHash: string,
    totalAmount: string,
    milestones: Array<{ title: string; amount: string }>
  ) {
    const items = milestones.map((m, idx) => ({
      name: `Milestone ${idx + 1}: ${m.title}`,
      unit_amount: { currency_code: 'USD', value: m.amount },
      quantity: '1',
      category: 'DIGITAL_GOODS',
    }));

    const payload = {
      intent: 'AUTHORIZE',
      purchase_units: [
        {
          reference_id: `holdfast_${contractId}`,
          custom_id: contractHash,
          description: `Holdfast Authorization Hold for Contract ${contractId}`,
          amount: {
            currency_code: 'USD',
            value: totalAmount,
            breakdown: {
              item_total: { currency_code: 'USD', value: totalAmount },
            },
          },
          items,
        },
      ],
      application_context: {
        brand_name: 'Holdfast Protocol',
        landing_page: 'NO_PREFERENCE',
        user_action: 'CONTINUE',
        return_url: `${CONFIG.APP_URL}/api/paypal/return?contractId=${contractId}`,
        cancel_url: `${CONFIG.APP_URL}/api/paypal/cancel?contractId=${contractId}`,
      },
    };

    const reqId = crypto.randomUUID();
    const res = await this.fetchAPI('/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PayPal-Request-Id': reqId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`[PayPal Create Order Failed] HTTP ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const orderId = res.body.id;
    const approveUrl = res.body.links?.find((l: any) => l.rel === 'approve')?.href;

    return {
      orderId,
      status: res.body.status,
      approveUrl,
    };
  }

  async getOrder(orderId: string): Promise<any> {
    const res = await this.fetchAPI(`/v2/checkout/orders/${orderId}`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error(`[PayPal Get Order Failed] HTTP ${res.status}: ${JSON.stringify(res.body)}`);
    }
    return res.body;
  }

  async authorizeOrder(orderId: string): Promise<PayPalAuthResult> {
    const reqId = crypto.randomUUID();
    const res = await this.fetchAPI(`/v2/checkout/orders/${orderId}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PayPal-Request-Id': reqId,
      },
    });

    if (!res.ok) {
      const errDetail = res.body?.details?.[0]?.issue || res.body?.message || 'AUTHORIZE_FAILED';
      throw new Error(`[PayPal Authorize Failed] HTTP ${res.status} (${errDetail}): ${JSON.stringify(res.body)}`);
    }

    const auth = res.body.purchase_units?.[0]?.payments?.authorizations?.[0];
    if (!auth) {
      throw new Error(`[PayPal Authorize Failed] No authorization object in response: ${JSON.stringify(res.body)}`);
    }

    return {
      id: auth.id,
      status: auth.status,
      amount: auth.amount,
      expiration_time: auth.expiration_time,
    };
  }

  async captureTranche(
    authId: string,
    amount: string,
    isFinal: boolean,
    requestId?: string
  ): Promise<PayPalCaptureResult> {
    const reqId = requestId || crypto.randomUUID();
    const payload = {
      amount: {
        currency_code: 'USD',
        value: amount,
      },
      final_capture: isFinal,
      note_to_payer: 'Holdfast Milestone Verified: Acceptance Receipt Issued',
    };

    const res = await this.fetchAPI(`/v2/payments/authorizations/${authId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PayPal-Request-Id': reqId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errName = res.body?.name || 'CAPTURE_FAILED';
      const issue = res.body?.details?.[0]?.issue || res.body?.message;
      throw new Error(`[PayPal Capture Failed] HTTP ${res.status} (${errName} - ${issue}): ${JSON.stringify(res.body)}`);
    }

    return {
      id: res.body.id,
      status: res.body.status,
      amount: res.body.amount,
      final_capture: res.body.final_capture,
      create_time: res.body.create_time,
    };
  }

  async voidAuthorization(authId: string, requestId?: string): Promise<{ success: boolean; status: number }> {
    const reqId = requestId || crypto.randomUUID();
    const res = await this.fetchAPI(`/v2/payments/authorizations/${authId}/void`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PayPal-Request-Id': reqId,
      },
    });

    if (res.status === 204 || res.status === 200 || res.ok) {
      return { success: true, status: res.status };
    }

    throw new Error(`[PayPal Void Failed] HTTP ${res.status}: ${JSON.stringify(res.body)}`);
  }

  // Reconciliation: Crucial for Lost-Response Recovery!
  // If a client or network times out, this call inspects the exact live authorization state.
  async reconcileAuthorization(authId: string) {
    const res = await this.fetchAPI(`/v2/payments/authorizations/${authId}`, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error(`[PayPal Reconcile Failed] HTTP ${res.status}: ${JSON.stringify(res.body)}`);
    }

    return {
      id: res.body.id,
      status: res.body.status,
      amount: res.body.amount,
      expiration_time: res.body.expiration_time,
      custom_id: res.body.custom_id,
      links: res.body.links,
    };
  }
}

export const paypal = new PayPalClient();
