import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import axios from 'axios';
import { server } from '../mocks/server';

// Regression guard: msw/node does NOT intercept axios's default node:http adapter under
// `bun test`, but DOES intercept its fetch adapter. tests/setup.ts sets axios.defaults.adapter
// = 'fetch' globally; this asserts that path keeps working (no explicit adapter here, so it
// proves the global setup). A silent bypass would hit the network and FAIL, not pass.
describe('MSW-under-bun (fetch adapter) regression guard', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());

  it('intercepts an axios GET and returns the mocked fixture body', async () => {
    const res = await axios.get('https://test.incidentiq.com/api/v1.0/tickets/statuses');
    expect(res.data.ItemCount).toBe(3);
    expect(res.data.Items[0].StatusName).toBe('Open');
  });
});
