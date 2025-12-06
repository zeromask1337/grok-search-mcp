import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPToolsListResult,
  MCPToolCallParams,
  MCPToolCallResult,
} from "./types";
import { MCPErrorCode } from "./types";

export class MCPHandler {
  private protocolVersion = "2024-11-05";
  private serverName = "xai-mcp-server";
  private serverVersion = "0.1.0";

  /**
   * Handle incoming JSON-RPC request
   */
  async handle(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    try {
      const { method, params, id } = request;

      let result: any;

      switch (method) {
        case "initialize":
          result = await this.handleInitialize(params);
          break;
        case "tools/list":
          result = await this.handleToolsList(params);
          break;
        case "tools/call":
          result = await this.handleToolCall(params);
          break;
        default:
          return this.errorResponse(
            id,
            MCPErrorCode.MethodNotFound,
            `Method not found: ${method}`
          );
      }

      return {
        jsonrpc: "2.0",
        id,
        result,
      };
    } catch (error) {
      return this.errorResponse(
        request.id,
        MCPErrorCode.InternalError,
        error instanceof Error ? error.message : "Internal error"
      );
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(
    _params: any
  ): Promise<MCPInitializeResult> {
    return {
      protocolVersion: this.protocolVersion,
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
  private async handleToolsList(_params: any): Promise<MCPToolsListResult> {
    return {
      tools: [
        {
          name: "x_search",
          description:
            "Search X (Twitter) for posts, users, and threads using XAI's Grok search capabilities",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find relevant X posts and content",
              },
            },
            required: ["query"],
          },
        },
      ],
    };
  }

  /**
   * Handle tools/call request
   * This will be implemented in Phase 3 with actual XAI integration
   */
  private async handleToolCall(
    params: any
  ): Promise<MCPToolCallResult> {
    const toolParams = params as MCPToolCallParams;

    if (toolParams.name !== "x_search") {
      throw new Error(`Unknown tool: ${toolParams.name}`);
    }

    // Placeholder - will be implemented in Phase 3
    return {
      content: [
        {
          type: "text",
          text: "Tool implementation pending - Phase 3",
        },
      ],
      isError: false,
    };
  }

  /**
   * Create error response
   */
  private errorResponse(
    id: string | number | undefined,
    code: number,
    message: string,
    data?: any
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
