import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { server } from '../mocks/server';

// Regression guard: msw/node intercepts axios's default node:http adapter under Vitest's Node
// environment with no adapter override needed. This asserts interception keeps working; a silent
// bypass would hit the real network and FAIL (onUnhandledRequest: 'error'), not pass.
describe('MSW axios-interception regression guard', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());

  it('intercepts an axios GET and returns the mocked fixture body', async () => {
    const res = await axios.get('https://test.incidentiq.com/api/v1.0/tickets/statuses');
    expect(res.data.ItemCount).toBe(3);
    expect(res.data.Items[0].StatusName).toBe('Open');
  });
});
