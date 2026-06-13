import { z } from "zod";

export const MCP_PROTOCOL_VERSION = "2024-11-05";

// JSON-RPC 2.0 Base Types
export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0", {
    invalid_type_error: "jsonrpc must be '2.0'",
  }),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.unknown()).optional().default({}),
});

export const JSONRPCResponseSchema = z.object({
  jsonrpc: z.literal("2.0").default("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  result: z.any().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.any().optional(),
    })
    .optional(),
});

// MCP Protocol Types
export const MCPInitializeParamsSchema = z.object({
  protocolVersion: z.string(),
  capabilities: z.record(z.unknown()).optional().default({}),
  clientInfo: z.object({
    name: z.string(),
    version: z.string(),
  }),
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

// Loose JSON Schema shape for input/output schemas
const JSONSchemaObjectSchema = z.object({
  type: z.literal("object"),
  properties: z.record(z.unknown()).optional(),
  required: z.array(z.string()).optional(),
});

export const MCPToolAnnotationsSchema = z.object({
  title: z.string().optional(),
  readOnlyHint: z.boolean().optional(),
  destructiveHint: z.boolean().optional(),
  idempotentHint: z.boolean().optional(),
  openWorldHint: z.boolean().optional(),
});

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: JSONSchemaObjectSchema,
  outputSchema: JSONSchemaObjectSchema.optional(),
  annotations: MCPToolAnnotationsSchema.optional(),
});

export const MCPToolsListResultSchema = z.object({
  tools: z.array(MCPToolSchema),
});

export const MCPToolCallParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()).optional().default({}),
});

export const MCPToolCallResultSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
      data: z.any().optional(),
    })
  ),
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

// Validate a JSON-RPC request. Returns the parsed request or an error response.
export function validateJSONRPCRequest(
  value: unknown
): { success: true; request: JSONRPCRequest } | { success: false; error: JSONRPCResponse } {
  const parsed = JSONRPCRequestSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        jsonrpc: "2.0",
        id: undefined,
        error: {
          code: MCPErrorCode.InvalidRequest,
          message: `Invalid JSON-RPC request: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        },
      },
    };
  }
  return { success: true, request: parsed.data };
}

// Validate initialize params.
export function validateInitializeParams(
  value: unknown
): { success: true; params: MCPInitializeParams } | { success: false; message: string } {
  const parsed = MCPInitializeParamsSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
    };
  }
  return { success: true, params: parsed.data };
}

// Validate tool call params.
export function validateToolCallParams(
  value: unknown
): { success: true; params: MCPToolCallParams } | { success: false; message: string } {
  const parsed = MCPToolCallParamsSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
    };
  }
  return { success: true, params: parsed.data };
}
