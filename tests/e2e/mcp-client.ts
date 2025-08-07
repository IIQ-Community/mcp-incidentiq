import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

export interface MCPTestClientOptions {
  serverPath?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export class MCPTestClient {
  private client: Client;
  private transport?: StdioClientTransport;
  private serverProcess?: ChildProcess;
  private connected: boolean = false;

  constructor(private options: MCPTestClientOptions = {}) {
    this.client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  async connect(): Promise<void> {
    const serverPath = this.options.serverPath || 
      path.join(process.cwd(), 'dist', 'index.js');

    const env = {
      ...process.env,
      IIQ_API_BASE_URL: 'https://test.incidentiq.com/api/v1.0',
      IIQ_API_KEY: 'test-api-key',
      ...this.options.env,
    };

    // Spawn the MCP server process
    this.serverProcess = spawn('node', [serverPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Create transport using the spawned process
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
    });

    // Connect the client
    await this.client.connect(this.transport);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }

    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }

  async listTools(): Promise<any> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const response = await this.client.request({
      method: 'tools/list',
      params: {},
    }, {} as any);

    return (response as any).tools;
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const response = await this.client.request({
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }, {} as any);

    return (response as any).content;
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.callTool('test_connection');
      return result?.[0]?.text?.includes('Connected');
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}