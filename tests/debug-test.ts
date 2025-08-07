import { IncidentIQClient } from '../src/api/client';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());

describe('Debug Response Format', () => {
  const client = new IncidentIQClient('https://test.incidentiq.com/api/v1.0', 'test-api-key');
  
  it('should show statuses response', async () => {
    const statuses = await client.getTicketStatuses();
    console.log('Statuses:', statuses);
    console.log('Type:', typeof statuses);
    console.log('Is Array:', Array.isArray(statuses));
  });

  it('should show agents response', async () => {
    const agents = await client.getAgents();
    console.log('Agents:', agents);
    console.log('Type:', typeof agents);
    console.log('Is Array:', Array.isArray(agents));
  });
});