import { IncidentIQClient } from '../../src/api/client';
import type { ToolResult } from '../../src/tools/result';

/** A client configured from the test env (tests/setup.ts), passed to handlers the way the router does. */
export function testClient(): IncidentIQClient {
  return new IncidentIQClient();
}

type ModuleHandler = (name: string, args: any, client: IncidentIQClient) => Promise<ToolResult>;

/** A module handler with the test client bound, for tests that pass handlers around as `(name, args)`. */
export function withClient(handler: ModuleHandler): (name: string, args: any) => Promise<ToolResult> {
  return (name, args) => handler(name, args, testClient());
}
