#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFileIfPresent() {
  if (process.env.CI === 'true' || process.env.MOBILE_ENV_SKIP_DOTENV === '1') {
    return;
  }

  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFileIfPresent();

const required = [
  'VITE_API_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_GOOGLE_WEB_CLIENT_ID',
  'VITE_GOOGLE_ANDROID_CLIENT_ID',
];

const missing = required.filter((key) => !process.env[key] || !process.env[key].trim());
if (missing.length > 0) {
  console.error(`[mobile-env] Missing required mobile env: ${missing.join(', ')}`);
  process.exit(1);
}

const apiUrl = process.env.VITE_API_URL.replace(/\/$/, '');
const supabaseUrl = process.env.VITE_SUPABASE_URL.replace(/\/$/, '');
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY.trim();
const googleWebClientId = process.env.VITE_GOOGLE_WEB_CLIENT_ID.trim();
const googleAndroidClientId = process.env.VITE_GOOGLE_ANDROID_CLIENT_ID.trim();

try {
  new URL(apiUrl);
  new URL(supabaseUrl);
} catch {
  console.error('[mobile-env] VITE_API_URL and VITE_SUPABASE_URL must be valid URLs.');
  process.exit(1);
}

const forbiddenChecks = [
  ['VITE_API_URL', /^https?:\/\/localhost(:\d+)?\/?/i, apiUrl],
  ['VITE_SUPABASE_URL', /example\.supabase\.co/i, supabaseUrl],
  ['VITE_SUPABASE_ANON_KEY', /^public-anon-key$/i, supabaseAnonKey],
  ['VITE_GOOGLE_WEB_CLIENT_ID', /^replace-with-google-web-client-id/i, googleWebClientId],
  ['VITE_GOOGLE_ANDROID_CLIENT_ID', /^replace-with-google-android-client-id/i, googleAndroidClientId],
];

for (const [key, pattern, value] of forbiddenChecks) {
  if (pattern.test(value)) {
    console.error(`[mobile-env] ${key} uses placeholder value. This is not allowed for mobile release.`);
    process.exit(1);
  }
}

console.log('[mobile-env] PASS');
console.log(`[mobile-env] API: ${apiUrl}`);
console.log(`[mobile-env] SUPABASE: ${supabaseUrl}`);
console.log(`[mobile-env] GOOGLE_WEB_CLIENT_ID: ${googleWebClientId}`);
console.log(`[mobile-env] GOOGLE_ANDROID_CLIENT_ID: ${googleAndroidClientId}`);
