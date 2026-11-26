/** MCP tool-call result shape returned to the client. */
export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
}

/** Tool definition as advertised by ListTools (the modules declare `inputSchema.type` as a plain string). */
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export type ToolHandler = (name: string, args: any) => Promise<unknown>;

/** One text block as an MCP result. */
export function textResult(body: string): ToolResult {
  return { content: [{ type: 'text', text: body }] };
}

/** Raw data pretty-printed as JSON, the output of the modules that do not format their results. */
export function jsonResult(data: unknown): ToolResult {
  return textResult(JSON.stringify(data, null, 2));
}
