// Main entry point
export { watermark, detectWatermark, stripWatermark } from './watermark';
export type { WatermarkOptions } from './watermark';

export { applyFingerprint, detectFingerprint } from './fingerprint';
export type { FingerprintConfig, FingerprintResult } from './fingerprint';

export { generateCanary, injectCanary, detectCanary, listCanaries, clearCanaries } from './canary';
export type { CanaryConfig, CanaryToken } from './canary';

export { detect } from './detection';
export type { DetectionOptions, DetectionResult } from './detection';

export { antiDistillation, getStats, resetStats } from './middleware/express';
export type { MiddlewareOptions } from './middleware/express';

export { antiDistillationPlugin } from './middleware/fastify';
export type { FastifyPluginOptions } from './middleware/fastify';

export { generateDashboardHTML, dashboardHandler } from './dashboard';
