import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPInitializeResult,
  MCPToolsListResult,
  MCPToolCallParams,
  MCPToolCallResult,
} from "./types";
import {
  MCPErrorCode,
  MCP_PROTOCOL_VERSION,
  validateInitializeParams,
  validateJSONRPCRequest,
  validateToolCallParams,
} from "./types";
import { XSearchTool, xSearchToolDefinition } from "../tools/x-search";
import { z } from "zod";

export const XSearchArgumentsSchema = z.object({
  query: z.string().min(1, "Query must be a non-empty string"),
});

export class MCPHandler {
  private serverName = "xai-mcp-server";
  private serverVersion = "0.1.0";
  private xSearchTool: XSearchTool;

  constructor(xSearchTool: XSearchTool) {
    this.xSearchTool = xSearchTool;
  }

  /**
   * Handle incoming JSON-RPC request.
   * Returns null for notifications (no response should be sent).
   */
  async handle(request: unknown): Promise<JSONRPCResponse | null> {
    const validation = validateJSONRPCRequest(request);
    if (!validation.success) {
      return validation.error;
    }

    const { id, method, params = {} } = validation.request;

    // Handle notifications (no response)
    if (id === undefined && method.startsWith("notifications/")) {
      if (method === "notifications/initialized") {
        return null;
      }
      // Unknown notifications are ignored per JSON-RPC 2.0 spec
      return null;
    }

    try {
      switch (method) {
        case "initialize":
          return {
            jsonrpc: "2.0",
            id,
            result: await this.handleInitialize(params),
          };
        case "tools/list":
          return {
            jsonrpc: "2.0",
            id,
            result: await this.handleToolsList(),
          };
        case "tools/call": {
          const result = await this.handleToolCall(params);
          return {
            jsonrpc: "2.0",
            id,
            result,
          };
        }
        default:
          return this.errorResponse(
            id,
            MCPErrorCode.MethodNotFound,
            `Method not found: ${method}`
          );
      }
    } catch (error) {
      return this.errorResponse(
        id,
        MCPErrorCode.InternalError,
        error instanceof Error ? error.message : "Internal error"
      );
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(params: unknown): Promise<MCPInitializeResult> {
    const validated = validateInitializeParams(params);
    if (!validated.success) {
      throw new Error(`Invalid initialize params: ${validated.message}`);
    }

    if (validated.params.protocolVersion !== MCP_PROTOCOL_VERSION) {
      throw new Error(
        `Unsupported protocol version: ${validated.params.protocolVersion}. Supported: ${MCP_PROTOCOL_VERSION}`
      );
    }

    return {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: this.serverName,
        version: this.serverVersion,
      },
    };
  }

  /**
   * Handle tools/list request
   */
  private async handleToolsList(): Promise<MCPToolsListResult> {
    return {
      tools: [xSearchToolDefinition],
    };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(params: unknown): Promise<MCPToolCallResult> {
    const validated = validateToolCallParams(params);
    if (!validated.success) {
      throw new Error(`Invalid tool call params: ${validated.message}`);
    }

    const toolParams = validated.params as MCPToolCallParams;

    if (toolParams.name !== xSearchToolDefinition.name) {
      throw new Error(`Unknown tool: ${toolParams.name}`);
    }

    const argsResult = XSearchArgumentsSchema.safeParse(toolParams.arguments || {});
    if (!argsResult.success) {
      throw new Error(
        `Invalid arguments for ${xSearchToolDefinition.name}: ${argsResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }

    return await this.xSearchTool.execute(argsResult.data);
  }

  /**
   * Create error response
   */
  private errorResponse(
    id: string | number | undefined,
    code: number,
    message: string,
    data?: unknown
  ): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        data,
      },
    };
  }
}
