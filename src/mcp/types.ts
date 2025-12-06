import { z } from "zod";

// JSON-RPC 2.0 Base Types
export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0").default("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.any().optional(),
});

export const JSONRPCResponseSchema = z.object({
  jsonrpc: z.literal("2.0").default("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
});

// MCP Protocol Types
export const MCPInitializeParamsSchema = z.object({
  protocolVersion: z.string(),
  capabilities: z.object({}).optional(),
  clientInfo: z.object({
    name: z.string(),
    version: z.string(),
  }).optional(),
});

export const MCPInitializeResultSchema = z.object({
  protocolVersion: z.string(),
  capabilities: z.object({
    tools: z.object({}).optional(),
  }),
  serverInfo: z.object({
    name: z.string(),
    version: z.string(),
  }),
});

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal("object"),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
});

export const MCPToolsListResultSchema = z.object({
  tools: z.array(MCPToolSchema),
});

export const MCPToolCallParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()).optional(),
});

export const MCPToolCallResultSchema = z.object({
  content: z.array(z.object({
    type: z.string(),
    text: z.string().optional(),
    data: z.any().optional(),
  })),
  isError: z.boolean().optional(),
});

// Exported Types
export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>;
export type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>;
export type MCPInitializeParams = z.infer<typeof MCPInitializeParamsSchema>;
export type MCPInitializeResult = z.infer<typeof MCPInitializeResultSchema>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPToolsListResult = z.infer<typeof MCPToolsListResultSchema>;
export type MCPToolCallParams = z.infer<typeof MCPToolCallParamsSchema>;
export type MCPToolCallResult = z.infer<typeof MCPToolCallResultSchema>;

// Error codes
export const MCPErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;
