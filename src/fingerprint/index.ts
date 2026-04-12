/**
 * Statistical fingerprinting of LLM response patterns.
 * Embeds detectable statistical signatures in token/word distributions.
 */

export interface FingerprintConfig {
  /** Secret seed for deterministic fingerprint generation */
  seed: string;
  /** Number of fingerprint bits to embed (default: 16) */
  bits?: number;
}

export interface FingerprintResult {
  /** The fingerprinted text */
  text: string;
  /** Fingerprint ID for later detection */
  fingerprintId: string;
}

/**
 * Simple seeded PRNG (xorshift32)
 */
function xorshift(seed: number): () => number {
  let state = seed;
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xFFFFFFFF;
  };
}

function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h || 1;
}

// Synonym pairs for subtle word substitution
const SYNONYM_PAIRS: [string, string][] = [
  ['however', 'nevertheless'],
  ['therefore', 'thus'],
  ['additionally', 'furthermore'],
  ['significant', 'substantial'],
  ['demonstrate', 'illustrate'],
  ['utilize', 'employ'],
  ['approximately', 'roughly'],
  ['regarding', 'concerning'],
  ['frequently', 'often'],
  ['sufficient', 'adequate'],
  ['commence', 'begin'],
  ['terminate', 'end'],
  ['facilitate', 'enable'],
  ['implement', 'execute'],
  ['subsequent', 'following'],
  ['primary', 'principal'],
];

/**
 * Apply statistical fingerprint to text via synonym substitution.
 * Each substitution choice encodes one bit of the fingerprint.
 */
export function applyFingerprint(text: string, config: FingerprintConfig): FingerprintResult {
  const bits = config.bits ?? 16;
  const rng = xorshift(seedFromString(config.seed));

  // Generate fingerprint bits
  const fpBits: number[] = [];
  for (let i = 0; i < bits; i++) {
    fpBits.push(rng() > 0.5 ? 1 : 0);
  }
  const fingerprintId = fpBits.map(b => b.toString()).join('');

  let result = text;
  let bitIdx = 0;

  for (const [wordA, wordB] of SYNONYM_PAIRS) {
    if (bitIdx >= fpBits.length) break;

    const regex = new RegExp(`\\b${wordA}\\b`, 'gi');
    if (regex.test(result)) {
      if (fpBits[bitIdx] === 1) {
        result = result.replace(regex, wordB);
      }
      bitIdx++;
    }
  }

  return { text: result, fingerprintId };
}

/**
 * Detect fingerprint in text by checking which synonym variant is present
 */
export function detectFingerprint(text: string, config: FingerprintConfig): {
  match: boolean;
  confidence: number;
  detectedBits: string;
} {
  const bits = config.bits ?? 16;
  const rng = xorshift(seedFromString(config.seed));

  const expectedBits: number[] = [];
  for (let i = 0; i < bits; i++) {
    expectedBits.push(rng() > 0.5 ? 1 : 0);
  }

  const detectedBits: number[] = [];
  let matchCount = 0;
  let totalChecked = 0;

  for (const [wordA, wordB] of SYNONYM_PAIRS) {
    if (totalChecked >= bits) break;

    const hasA = new RegExp(`\\b${wordA}\\b`, 'i').test(text);
    const hasB = new RegExp(`\\b${wordB}\\b`, 'i').test(text);

    if (hasA || hasB) {
      const bit = hasB ? 1 : 0;
      detectedBits.push(bit);
      if (bit === expectedBits[totalChecked]) matchCount++;
      totalChecked++;
    }
  }

  const confidence = totalChecked > 0 ? matchCount / totalChecked : 0;

  return {
    match: confidence > 0.7,
    confidence,
    detectedBits: detectedBits.join(''),
  };
}
