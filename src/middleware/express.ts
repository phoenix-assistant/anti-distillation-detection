/**
 * Express middleware for anti-distillation protection
 */

import { watermark, WatermarkOptions } from '../watermark';
import { applyFingerprint, FingerprintConfig } from '../fingerprint';
import { injectCanary, CanaryConfig } from '../canary';

export interface MiddlewareOptions {
  watermark?: WatermarkOptions;
  fingerprint?: FingerprintConfig;
  canary?: CanaryConfig;
  /** Extract consumer ID from request (default: uses API key header) */
  getConsumerId?: (req: any) => string | undefined;
  /** Which response fields to watermark (default: ['choices[].message.content']) */
  responseFields?: string[];
}

// Stats tracking
const stats = {
  totalRequests: 0,
  watermarked: 0,
  fingerprinted: 0,
  canaryInjected: 0,
};

export function getStats() { return { ...stats }; }
export function resetStats() {
  stats.totalRequests = 0;
  stats.watermarked = 0;
  stats.fingerprinted = 0;
  stats.canaryInjected = 0;
}

/**
 * Express middleware that intercepts JSON responses and applies protections
 */
export function antiDistillation(options: MiddlewareOptions) {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      stats.totalRequests++;

      const consumerId = options.getConsumerId?.(req) ?? req.headers['x-api-key'] as string;

      try {
        const processed = processResponseBody(body, options, consumerId);
        return originalJson(processed);
      } catch {
        return originalJson(body);
      }
    };

    next();
  };
}

function processResponseBody(body: any, options: MiddlewareOptions, consumerId?: string): any {
  if (!body) return body;

  // Handle OpenAI-style chat completion responses
  if (body.choices && Array.isArray(body.choices)) {
    return {
      ...body,
      choices: body.choices.map((choice: any) => {
        if (choice.message?.content) {
          return {
            ...choice,
            message: {
              ...choice.message,
              content: protectText(choice.message.content, options, consumerId),
            },
          };
        }
        if (choice.text) {
          return { ...choice, text: protectText(choice.text, options, consumerId) };
        }
        return choice;
      }),
    };
  }

  // Handle simple text responses
  if (typeof body.text === 'string') {
    return { ...body, text: protectText(body.text, options, consumerId) };
  }
  if (typeof body.content === 'string') {
    return { ...body, content: protectText(body.content, options, consumerId) };
  }

  return body;
}

function protectText(text: string, options: MiddlewareOptions, consumerId?: string): string {
  let result = text;

  if (options.watermark) {
    result = watermark(result, { ...options.watermark, consumerId });
    stats.watermarked++;
  }

  if (options.fingerprint) {
    const fp = applyFingerprint(result, options.fingerprint);
    result = fp.text;
    stats.fingerprinted++;
  }

  if (options.canary) {
    const c = injectCanary(result, options.canary, consumerId);
    result = c.text;
    stats.canaryInjected++;
  }

  return result;
}
