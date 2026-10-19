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
  APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || '4000'}`,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  PAYPAL: {
    CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
    CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
    BASE_URL: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
  },
  AI: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    PROVIDER: process.env.AI_PROVIDER || 'gemini',
  },
  SECURITY: {
    RECEIPT_SECRET: process.env.RECEIPT_SECRET || 'holdfast_receipt_hmac_secret_2026',
  },
};

export function maskSecret(secret?: string): string {
  if (!secret || secret.trim() === '') return '(not configured)';
  if (secret.length <= 8) return '********';
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

if (!CONFIG.PAYPAL.CLIENT_ID || !CONFIG.PAYPAL.CLIENT_SECRET) {
  console.log('[INFO] PayPal credentials not detected. Holdfast running in Explore Demo mode.');
}
