import { IncidentIQClient } from '../../src/api/client';

/** A client configured from the test env (tests/setup.ts), passed to handlers the way the router does. */
export function testClient(): IncidentIQClient {
  return new IncidentIQClient();
}
