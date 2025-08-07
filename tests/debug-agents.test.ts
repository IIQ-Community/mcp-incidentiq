import { IncidentIQClient } from '../src/api/client';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());

describe('Debug Agents Test', () => {
  it('should call agents endpoint', async () => {
    const client = new IncidentIQClient('https://test.incidentiq.com/api/v1.0', 'test-api-key');
    
    console.log('Calling getAgents...');
    try {
      const agents = await client.getAgents();
      console.log('Response:', agents);
    } catch (error: any) {
      console.error('Error:', error.message);
      console.error('Response data:', error.response?.data);
    }
  });
});