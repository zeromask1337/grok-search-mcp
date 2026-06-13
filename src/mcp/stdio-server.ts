import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { XSearchTool, xSearchToolDefinition, type XSearchParams } from "../tools/x-search";

/**
 * Create and start MCP server using stdio transport
 * This mode allows OpenCode to spawn this server as a local process
 */
export async function startStdioServer(xSearchTool: XSearchTool): Promise<void> {
  // Create MCP server instance with low-level API
  const server = new Server(
    {
      name: "xai-mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tools/list request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [xSearchToolDefinition],
    };
  });

  // Handle tools/call request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== xSearchToolDefinition.name) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const query = (request.params.arguments as XSearchParams | undefined)?.query;
    if (!query || typeof query !== "string") {
      throw new Error(
        `Invalid arguments for ${xSearchToolDefinition.name}: query is required and must be a non-empty string`
      );
    }

    const result = await xSearchTool.execute({ query });
    return result;
  });

  // Connect stdio transport and start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr to avoid polluting stdout (which is used for MCP protocol)
  console.error("[xai-mcp-server] Connected via stdio transport");
}
