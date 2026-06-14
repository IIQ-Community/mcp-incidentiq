import { mock } from 'bun:test';
import axios from 'axios';

// Force axios to use its fetch adapter so MSW (msw/node) can intercept requests under
// `bun test`: bun's node:http is not patchable by MSW's interceptor, but its global fetch is.
// The IIQ client uses axios.create() with no adapter override, so it inherits this default.
axios.defaults.adapter = 'fetch';

// Test environment variables. bun provides TextEncoder/TextDecoder and the node-compatible
// globals natively, so no polyfill is needed (the Jest setup imported them from 'util').
process.env.IIQ_API_BASE_URL = 'https://test.incidentiq.com/api/v1.0';
process.env.IIQ_API_KEY = 'test-api-key-jwt-token';
process.env.IIQ_API_TIMEOUT = '5000';

// Suppress console errors during tests unless debugging.
if (!process.env.DEBUG_TESTS) {
  console.error = mock(() => {});
}
