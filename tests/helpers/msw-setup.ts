import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, mock } from 'bun:test';
import { server } from '../mocks/server';

export function setupMSW() {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}