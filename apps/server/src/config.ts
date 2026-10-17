import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Look for .env in root or server directory
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PAYPAL: {
    CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
    CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
    BASE_URL: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
  },
  AI: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    PROVIDER: process.env.AI_PROVIDER || 'gemini',
  },
  SECURITY: {
    RECEIPT_SECRET: process.env.RECEIPT_SECRET || 'holdfast_receipt_hmac_secret_2026',
  },
};

if (!CONFIG.PAYPAL.CLIENT_ID || !CONFIG.PAYPAL.CLIENT_SECRET) {
  console.warn('[CONFIG WARNING] PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing.');
}
