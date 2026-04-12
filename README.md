# Anti-Distillation Detection

Watermarking, fingerprinting, and canary token middleware to detect unauthorized distillation of LLM API outputs.

## Problem

Model providers have no way to detect when their API outputs are being used to train competing models. This is a growing concern (OpenAI vs DeepSeek, etc.) with no open-source solution.

## Solution

Drop-in middleware for Express/Fastify that invisibly protects LLM API responses using three complementary techniques:

1. **Steganographic Watermarking** — Zero-width Unicode characters encode consumer ID + timestamp
2. **Statistical Fingerprinting** — Subtle synonym substitutions create detectable patterns
3. **Canary Tokens** — Unique trackable tokens injected into responses

## Install

```bash
npm install @phoenixaihub/anti-distillation-detection
```

## Quick Start — Express

```typescript
import express from 'express';
import { antiDistillation, getStats, dashboardHandler } from '@phoenixaihub/anti-distillation-detection';

const app = express();

app.use(antiDistillation({
  watermark: { secretKey: process.env.WATERMARK_SECRET! },
  fingerprint: { seed: 'my-model-v1' },
  canary: { prefix: 'myco' },
}));

// Dashboard
app.get('/dashboard', dashboardHandler(getStats));

app.post('/v1/chat/completions', (req, res) => {
  // Your LLM logic here — response is automatically watermarked
  res.json({
    choices: [{ message: { role: 'assistant', content: 'Hello world' } }]
  });
});

app.listen(3000);
```

## Quick Start — Fastify

```typescript
import Fastify from 'fastify';
import { antiDistillationPlugin } from '@phoenixaihub/anti-distillation-detection/fastify';

const app = Fastify();

app.register(antiDistillationPlugin, {
  watermark: { secretKey: 'my-secret' },
});

app.listen({ port: 3000 });
```

## Detection API

```typescript
import { detect } from '@phoenixaihub/anti-distillation-detection';

const result = detect(suspiciousText, {
  watermarkKey: 'my-secret',
  fingerprintConfig: { seed: 'my-model-v1' },
  checkCanaries: true,
});

console.log(result);
// { protected: true, confidence: 0.95, watermark: { found: true, consumerId: 'user-123', ... }, ... }
```

## CLI

```bash
# Check a file for watermarks
add-detect check response.txt --key mysecret

# Check stdin
echo "some text" | add-detect check - --key mysecret

# Strip watermarks
add-detect strip response.txt > clean.txt
```

## Standalone Watermarking

```typescript
import { watermark, detectWatermark, stripWatermark } from '@phoenixaihub/anti-distillation-detection';

const marked = watermark('Hello world', {
  secretKey: 'secret',
  consumerId: 'user-123',
  mode: 'suffix', // or 'distributed'
});

const result = detectWatermark(marked, 'secret');
// { found: true, consumerId: 'user-123', timestamp: ..., verified: true }

const clean = stripWatermark(marked);
// 'Hello world'
```

## Docker

```bash
docker build -t add-detect .
echo "text to check" | docker run -i add-detect check - --key mysecret
```

## How It Works

### Steganographic Watermarking
Encodes a payload (consumer ID, timestamp, HMAC) as zero-width Unicode characters invisible to humans but preserved in text. Survives copy-paste.

### Statistical Fingerprinting
Deterministically substitutes synonyms (e.g., "however" → "nevertheless") based on a seeded PRNG. The pattern of substitutions forms a detectable fingerprint.

### Canary Tokens
Injects unique tokens that can be searched for in training data dumps or model outputs to prove data provenance.

## License

MIT
