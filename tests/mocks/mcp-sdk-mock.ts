// Mock for @modelcontextprotocol/sdk modules
// This allows us to test without dealing with ES module issues

export class Client {
  constructor(public info: any, public options: any) {}
  
  async connect(transport: any) {
    return Promise.resolve();
  }
  
  async close() {
    return Promise.resolve();
  }
  
  async request(method: any, params: any) {
    // Mock response based on method
    if (method.method === 'tools/list') {
      return {
        tools: [
          { name: 'test_connection', description: 'Test connection' },
          { name: 'ticket_create', description: 'Create ticket' },
        ]
      };
    }
    if (method.method === 'tools/call') {
      return {
        content: [{ type: 'text', text: 'Mock response' }]
      };
    }
    return {};
  }
}

export class StdioClientTransport {
  constructor(public options: any) {}
}

export const Protocol = {
  // Add any Protocol exports if needed
};