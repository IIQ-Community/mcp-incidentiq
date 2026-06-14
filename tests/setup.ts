import { vi } from 'vitest';

// Test environment variables. Under Vitest's default Node environment, MSW (msw/node)
// intercepts axios's default node:http adapter directly, so no adapter override is needed
// (the bun-era `axios.defaults.adapter = 'fetch'` workaround was specific to `bun test`).
process.env.IIQ_API_BASE_URL = 'https://test.incidentiq.com/api/v1.0';
process.env.IIQ_API_KEY = 'test-api-key-jwt-token';
process.env.IIQ_API_TIMEOUT = '5000';

// Suppress console errors during tests unless debugging.
if (!process.env.DEBUG_TESTS) {
  console.error = vi.fn();
}
