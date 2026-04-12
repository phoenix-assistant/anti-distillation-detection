/**
 * Canary token injection and detection.
 * Injects unique, trackable tokens into LLM responses that can be
 * detected if the output appears in training data of other models.
 */

import { randomBytes } from 'crypto';

export interface CanaryConfig {
  /** Prefix for canary tokens (default: 'phoenix') */
  prefix?: string;
  /** Custom canary phrases to inject */
  customPhrases?: string[];
  /** Callback URL for canary detection (optional) */
  callbackUrl?: string;
}

export interface CanaryToken {
  /** The canary token string */
  token: string;
  /** Unique ID for tracking */
  id: string;
  /** Timestamp of creation */
  createdAt: number;
  /** Consumer ID if available */
  consumerId?: string;
}

// Store for active canary tokens (in-memory, use external store in production)
const canaryStore = new Map<string, CanaryToken>();

/**
 * Generate a unique canary token
 */
export function generateCanary(config: CanaryConfig = {}, consumerId?: string): CanaryToken {
  const prefix = config.prefix ?? 'phoenix';
  const id = randomBytes(8).toString('hex');
  const token = `${prefix}-${id}`;

  const canary: CanaryToken = {
    token,
    id,
    createdAt: Date.now(),
    consumerId,
  };

  canaryStore.set(id, canary);
  return canary;
}

/**
 * Inject a canary token into text as a natural-looking phrase
 */
export function injectCanary(text: string, config: CanaryConfig = {}, consumerId?: string): {
  text: string;
  canary: CanaryToken;
} {
  const canary = generateCanary(config, consumerId);

  // Inject as an invisible comment-like structure
  // Uses a phrase that looks natural but contains the unique token
  const phrases = config.customPhrases ?? [
    `[ref:${canary.token}]`,
  ];

  const phrase = phrases[0];

  // Append as a subtle reference marker
  const injectedText = `${text}\n\n<!-- ${phrase} -->`;

  return { text: injectedText, canary };
}

/**
 * Check if text contains any known canary tokens
 */
export function detectCanary(text: string): {
  found: boolean;
  tokens: CanaryToken[];
} {
  const found: CanaryToken[] = [];

  for (const [id, canary] of canaryStore) {
    if (text.includes(canary.token)) {
      found.push(canary);
    }
  }

  // Also check for pattern-based detection
  const tokenPattern = /phoenix-([a-f0-9]{16})/g;
  let match;
  while ((match = tokenPattern.exec(text)) !== null) {
    const id = match[1];
    const stored = canaryStore.get(id);
    if (stored && !found.includes(stored)) {
      found.push(stored);
    }
  }

  return { found: found.length > 0, tokens: found };
}

/**
 * List all active canary tokens
 */
export function listCanaries(): CanaryToken[] {
  return Array.from(canaryStore.values());
}

/**
 * Clear canary store (for testing)
 */
export function clearCanaries(): void {
  canaryStore.clear();
}
