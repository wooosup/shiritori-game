#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gradlePath = resolve(process.cwd(), 'android/app/build.gradle');
const source = readFileSync(gradlePath, 'utf8');

const versionCodeRegex = /(\bversionCode\s+)(\d+)/;
const match = source.match(versionCodeRegex);

if (!match) {
  console.error('[android-version] Failed: versionCode not found in android/app/build.gradle');
  process.exit(1);
}

const currentVersionCode = Number(match[2]);
if (!Number.isInteger(currentVersionCode) || currentVersionCode < 1) {
  console.error(`[android-version] Failed: invalid current versionCode "${match[2]}"`);
  process.exit(1);
}

const nextVersionCode = currentVersionCode + 1;
const updated = source.replace(versionCodeRegex, `$1${nextVersionCode}`);
writeFileSync(gradlePath, updated, 'utf8');

console.log(`[android-version] versionCode ${currentVersionCode} -> ${nextVersionCode}`);
