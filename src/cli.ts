#!/usr/bin/env node

/**
 * CLI tool for checking text samples against anti-distillation protections
 */

import { readFileSync } from 'fs';
import { detect, DetectionOptions } from './detection';

const args = process.argv.slice(2);

function usage() {
  console.log(`
add-detect — Anti-Distillation Detection CLI

Usage:
  add-detect check <file|->  [--key <secret>] [--seed <seed>]
  add-detect strip <file|->

Commands:
  check   Detect watermarks, fingerprints, and canary tokens in text
  strip   Remove all watermark characters from text

Options:
  --key <secret>   Secret key for watermark verification
  --seed <seed>    Fingerprint seed for fingerprint detection
  -h, --help       Show this help

Examples:
  echo "some text" | add-detect check -
  add-detect check response.txt --key mysecret
  add-detect strip response.txt
`);
}

function getInput(source: string): string {
  if (source === '-') {
    return readFileSync(0, 'utf-8');
  }
  return readFileSync(source, 'utf-8');
}

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

const command = args[0];

if (!command || command === '-h' || command === '--help') {
  usage();
  process.exit(0);
}

if (command === 'check') {
  const source = args[1];
  if (!source) { console.error('Error: provide file path or - for stdin'); process.exit(1); }

  const text = getInput(source);
  const options: DetectionOptions = {};

  const key = getArg('--key');
  if (key) options.watermarkKey = key;

  const seed = getArg('--seed');
  if (seed) options.fingerprintConfig = { seed };

  const result = detect(text, options);

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.protected ? 0 : 1);
}

if (command === 'strip') {
  const source = args[1];
  if (!source) { console.error('Error: provide file path or - for stdin'); process.exit(1); }

  const { stripWatermark } = require('./watermark');
  const text = getInput(source);
  process.stdout.write(stripWatermark(text));
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
usage();
process.exit(1);
