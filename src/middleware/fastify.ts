/**
 * Fastify plugin for anti-distillation protection
 */

import { watermark, WatermarkOptions } from '../watermark';
import { applyFingerprint, FingerprintConfig } from '../fingerprint';
import { injectCanary, CanaryConfig } from '../canary';

export interface FastifyPluginOptions {
  watermark?: WatermarkOptions;
  fingerprint?: FingerprintConfig;
  canary?: CanaryConfig;
  getConsumerId?: (request: any) => string | undefined;
}

/**
 * Fastify plugin that applies anti-distillation protections
 */
export function antiDistillationPlugin(fastify: any, options: FastifyPluginOptions, done: () => void) {
  fastify.addHook('onSend', (_request: any, reply: any, payload: any, next: any) => {
    if (typeof payload !== 'string') return next(null, payload);

    try {
      const body = JSON.parse(payload);
      const consumerId = options.getConsumerId?.(_request) ?? _request.headers['x-api-key'];
      const processed = processBody(body, options, consumerId);
      return next(null, JSON.stringify(processed));
    } catch {
      return next(null, payload);
    }
  });

  done();
}

function processBody(body: any, options: FastifyPluginOptions, consumerId?: string): any {
  if (!body) return body;

  if (body.choices && Array.isArray(body.choices)) {
    return {
      ...body,
      choices: body.choices.map((choice: any) => {
        if (choice.message?.content) {
          return {
            ...choice,
            message: { ...choice.message, content: protect(choice.message.content, options, consumerId) },
          };
        }
        return choice;
      }),
    };
  }

  if (typeof body.content === 'string') {
    return { ...body, content: protect(body.content, options, consumerId) };
  }

  return body;
}

function protect(text: string, options: FastifyPluginOptions, consumerId?: string): string {
  let result = text;
  if (options.watermark) result = watermark(result, { ...options.watermark, consumerId });
  if (options.fingerprint) {
    result = applyFingerprint(result, options.fingerprint).text;
  }
  if (options.canary) {
    result = injectCanary(result, options.canary, consumerId).text;
  }
  return result;
}
