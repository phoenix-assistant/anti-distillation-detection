import { describe, it, expect } from 'vitest';
import { watermark, detectWatermark, stripWatermark } from '../src/watermark';
import { applyFingerprint, detectFingerprint } from '../src/fingerprint';
import { generateCanary, injectCanary, detectCanary, clearCanaries } from '../src/canary';
import { detect } from '../src/detection';

describe('Steganographic Watermarking', () => {
  const opts = { secretKey: 'test-secret', consumerId: 'user-123' };

  it('should embed and detect watermark', () => {
    const text = 'Hello, this is a test response from an LLM.';
    const marked = watermark(text, opts);

    expect(marked).toContain('Hello');
    expect(stripWatermark(marked)).toBe(text);

    const result = detectWatermark(marked, 'test-secret');
    expect(result.found).toBe(true);
    expect(result.consumerId).toBe('user-123');
    expect(result.verified).toBe(true);
  });

  it('should not detect watermark in clean text', () => {
    const result = detectWatermark('Just normal text');
    expect(result.found).toBe(false);
  });

  it('should support distributed mode', () => {
    const text = 'word1 word2 word3 word4 word5';
    const marked = watermark(text, { ...opts, mode: 'distributed' });
    const result = detectWatermark(marked, 'test-secret');
    expect(result.found).toBe(true);
  });
});

describe('Statistical Fingerprinting', () => {
  it('should apply and detect fingerprint', () => {
    const text = 'This is however a significant demonstration that we utilize frequently.';
    const config = { seed: 'test-seed' };

    const { text: fpText, fingerprintId } = applyFingerprint(text, config);
    expect(fingerprintId).toBeTruthy();

    const detection = detectFingerprint(fpText, config);
    expect(detection.confidence).toBeGreaterThan(0);
  });
});

describe('Canary Tokens', () => {
  it('should inject and detect canary', () => {
    clearCanaries();
    const text = 'Some LLM response content.';
    const { text: injected, canary } = injectCanary(text, {}, 'consumer-1');

    expect(injected).toContain(canary.token);
    expect(canary.consumerId).toBe('consumer-1');

    const result = detectCanary(injected);
    expect(result.found).toBe(true);
    expect(result.tokens).toHaveLength(1);
  });
});

describe('Unified Detection', () => {
  it('should detect watermarked text', () => {
    const text = watermark('Test text', { secretKey: 'key1', consumerId: 'u1' });
    const result = detect(text, { watermarkKey: 'key1' });
    expect(result.protected).toBe(true);
    expect(result.watermark.found).toBe(true);
  });

  it('should return not protected for clean text', () => {
    clearCanaries();
    const result = detect('Clean text with no protections');
    expect(result.protected).toBe(false);
  });
});
