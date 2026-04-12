// Zero-width character steganography for text watermarking
// Uses Unicode zero-width characters to embed invisible markers

const ZWC = {
  ZERO: '\u200B',   // zero-width space (bit 0)
  ONE: '\u200C',    // zero-width non-joiner (bit 1)
  SEP: '\u200D',    // zero-width joiner (separator)
  MARK: '\uFEFF',   // byte order mark (start/end marker)
} as const;

export interface WatermarkOptions {
  /** Secret key for HMAC-based watermark generation */
  secretKey: string;
  /** Identifier for the API consumer */
  consumerId?: string;
  /** Inject at word boundaries vs end of text */
  mode?: 'distributed' | 'suffix';
}

/**
 * Encode a string payload into zero-width characters
 */
function encodeToZWC(payload: string): string {
  const bits: string[] = [];
  for (const char of payload) {
    const code = char.charCodeAt(0);
    for (let i = 7; i >= 0; i--) {
      bits.push((code >> i) & 1 ? ZWC.ONE : ZWC.ZERO);
    }
    bits.push(ZWC.SEP);
  }
  return ZWC.MARK + bits.join('') + ZWC.MARK;
}

/**
 * Decode zero-width characters back to a string payload
 */
function decodeFromZWC(text: string): string | null {
  // Extract content between markers
  const startIdx = text.indexOf(ZWC.MARK);
  if (startIdx === -1) return null;
  const endIdx = text.indexOf(ZWC.MARK, startIdx + 1);
  if (endIdx === -1) return null;

  const encoded = text.slice(startIdx + 1, endIdx);
  const chars: string[] = [];
  let currentBits: number[] = [];

  for (const ch of encoded) {
    if (ch === ZWC.ZERO) currentBits.push(0);
    else if (ch === ZWC.ONE) currentBits.push(1);
    else if (ch === ZWC.SEP) {
      if (currentBits.length === 8) {
        const code = currentBits.reduce((acc, b) => (acc << 1) | b, 0);
        chars.push(String.fromCharCode(code));
      }
      currentBits = [];
    }
  }
  return chars.length > 0 ? chars.join('') : null;
}

/**
 * Generate a simple HMAC-like hash (no crypto dependency for portability)
 */
function simpleHash(key: string, data: string): string {
  let hash = 0;
  const combined = key + ':' + data;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36).padStart(8, '0').slice(0, 8);
}

/**
 * Create a watermark payload
 */
function createPayload(options: WatermarkOptions, timestamp?: number): string {
  const ts = timestamp ?? Date.now();
  const id = options.consumerId ?? 'anonymous';
  const hash = simpleHash(options.secretKey, `${id}:${ts}`);
  return `ADD:${id}:${ts}:${hash}`;
}

/**
 * Inject watermark into text
 */
export function watermark(text: string, options: WatermarkOptions): string {
  const payload = createPayload(options);
  const encoded = encodeToZWC(payload);

  if (options.mode === 'distributed') {
    // Insert at word boundaries
    const words = text.split(' ');
    if (words.length < 3) return text + encoded;
    const insertIdx = Math.floor(words.length / 2);
    words.splice(insertIdx, 0, encoded);
    return words.join(' ');
  }

  // Default: suffix mode
  return text + encoded;
}

/**
 * Extract and verify watermark from text
 */
export function detectWatermark(text: string, secretKey?: string): {
  found: boolean;
  consumerId?: string;
  timestamp?: number;
  verified?: boolean;
} {
  const payload = decodeFromZWC(text);
  if (!payload || !payload.startsWith('ADD:')) {
    return { found: false };
  }

  const parts = payload.split(':');
  if (parts.length !== 4) return { found: false };

  const [, consumerId, tsStr, hash] = parts;
  const timestamp = parseInt(tsStr, 10);

  let verified: boolean | undefined;
  if (secretKey) {
    const expectedHash = simpleHash(secretKey, `${consumerId}:${timestamp}`);
    verified = hash === expectedHash;
  }

  return { found: true, consumerId, timestamp, verified };
}

/**
 * Strip all zero-width watermark characters from text
 */
export function stripWatermark(text: string): string {
  return text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
}
