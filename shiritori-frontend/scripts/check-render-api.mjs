#!/usr/bin/env node

const args = process.argv.slice(2);
const envFlag = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'dev';

const targets = {
  dev: process.env.VITE_API_URL_DEV || process.env.VITE_API_URL || 'http://localhost:8080/api',
  prod: process.env.VITE_API_URL_PROD || process.env.VITE_API_URL,
};

const baseUrl = targets[envFlag];

if (!baseUrl) {
  console.error(`[api-check] Missing API URL for env="${envFlag}". Set VITE_API_URL or VITE_API_URL_PROD.`);
  process.exit(1);
}

const normalized = baseUrl.replace(/\/$/, '');
const healthUrl = `${normalized}/healthz`;

console.log(`[api-check] env=${envFlag} -> ${healthUrl}`);

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(healthUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: controller.signal,
  });

  const text = await response.text();
  clearTimeout(timeout);

  if (!response.ok) {
    console.error(`[api-check] FAIL ${response.status} ${response.statusText}`);
    console.error(text);
    process.exit(1);
  }

  console.log(`[api-check] PASS ${response.status}`);
  console.log(text);
} catch (error) {
  clearTimeout(timeout);
  console.error('[api-check] FAIL request error:', error.message);
  process.exit(1);
}
