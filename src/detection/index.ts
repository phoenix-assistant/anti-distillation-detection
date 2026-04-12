/**
 * Detection API — unified interface for checking text against all detection methods
 */

import { detectWatermark } from '../watermark/steganography';
import { detectFingerprint, FingerprintConfig } from '../fingerprint';
import { detectCanary } from '../canary';

export interface DetectionOptions {
  /** Secret key for watermark verification */
  watermarkKey?: string;
  /** Fingerprint config for fingerprint detection */
  fingerprintConfig?: FingerprintConfig;
  /** Check for canary tokens */
  checkCanaries?: boolean;
}

export interface DetectionResult {
  /** Whether any protection was detected */
  protected: boolean;
  /** Overall confidence score 0-1 */
  confidence: number;
  /** Individual detection results */
  watermark: {
    found: boolean;
    consumerId?: string;
    timestamp?: number;
    verified?: boolean;
  };
  fingerprint: {
    match: boolean;
    confidence: number;
  };
  canary: {
    found: boolean;
    tokenCount: number;
  };
}

/**
 * Run all detection methods on a text sample
 */
export function detect(text: string, options: DetectionOptions = {}): DetectionResult {
  // Watermark detection
  const wmResult = detectWatermark(text, options.watermarkKey);

  // Fingerprint detection
  let fpResult = { match: false, confidence: 0, detectedBits: '' };
  if (options.fingerprintConfig) {
    fpResult = detectFingerprint(text, options.fingerprintConfig);
  }

  // Canary detection
  let canaryResult = { found: false, tokens: [] as any[] };
  if (options.checkCanaries !== false) {
    canaryResult = detectCanary(text);
  }

  // Calculate overall confidence
  let signals = 0;
  let totalConfidence = 0;

  if (wmResult.found) {
    signals++;
    totalConfidence += wmResult.verified ? 1.0 : 0.7;
  }
  if (fpResult.match) {
    signals++;
    totalConfidence += fpResult.confidence;
  }
  if (canaryResult.found) {
    signals++;
    totalConfidence += 1.0;
  }

  const confidence = signals > 0 ? totalConfidence / signals : 0;

  return {
    protected: signals > 0,
    confidence,
    watermark: wmResult,
    fingerprint: { match: fpResult.match, confidence: fpResult.confidence },
    canary: { found: canaryResult.found, tokenCount: canaryResult.tokens.length },
  };
}
