import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Set test environment variables
process.env.IIQ_API_BASE_URL = 'https://test.incidentiq.com/api/v1.0';
process.env.IIQ_API_KEY = 'test-api-key-jwt-token';
process.env.IIQ_API_TIMEOUT = '5000';

// Suppress console errors during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console.error = jest.fn();
}