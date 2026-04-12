/**
 * Simple HTML dashboard for detection stats
 */

export function generateDashboardHTML(stats: {
  totalRequests: number;
  watermarked: number;
  fingerprinted: number;
  canaryInjected: number;
  recentDetections?: Array<{ timestamp: number; consumerId?: string; method: string }>;
}): string {
  const detections = stats.recentDetections ?? [];
  const detectionsHTML = detections
    .map(d => `<tr><td>${new Date(d.timestamp).toISOString()}</td><td>${d.consumerId ?? 'unknown'}</td><td>${d.method}</td></tr>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anti-Distillation Detection Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 2rem; }
    h1 { color: #ff6b35; margin-bottom: 2rem; font-size: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #1a1a2e; border-radius: 8px; padding: 1.5rem; border: 1px solid #333; }
    .card h3 { color: #888; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }
    .card .value { font-size: 2rem; font-weight: bold; color: #ff6b35; margin-top: 0.5rem; }
    table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 8px; overflow: hidden; }
    th { background: #16213e; padding: 0.75rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; }
    td { padding: 0.75rem; border-top: 1px solid #333; }
    .empty { color: #666; padding: 2rem; text-align: center; }
  </style>
</head>
<body>
  <h1>🛡️ Anti-Distillation Detection</h1>
  <div class="grid">
    <div class="card"><h3>Total Requests</h3><div class="value">${stats.totalRequests}</div></div>
    <div class="card"><h3>Watermarked</h3><div class="value">${stats.watermarked}</div></div>
    <div class="card"><h3>Fingerprinted</h3><div class="value">${stats.fingerprinted}</div></div>
    <div class="card"><h3>Canaries Injected</h3><div class="value">${stats.canaryInjected}</div></div>
  </div>
  <h2 style="color: #ff6b35; margin-bottom: 1rem; font-size: 1.1rem;">Recent Detections</h2>
  ${detections.length > 0
    ? `<table><thead><tr><th>Time</th><th>Consumer</th><th>Method</th></tr></thead><tbody>${detectionsHTML}</tbody></table>`
    : '<div class="empty">No detections yet</div>'}
</body>
</html>`;
}

/**
 * Create an Express route handler for the dashboard
 */
export function dashboardHandler(getStatsFunction: () => any) {
  return (_req: any, res: any) => {
    const stats = getStatsFunction();
    const html = generateDashboardHTML(stats);
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  };
}
