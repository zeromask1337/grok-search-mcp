import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { XSearchTool, type XSearchParams } from "../tools/x-search";

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
      tools: [
        {
          name: "x_search",
          description:
            "Search X (Twitter) for posts, users, and threads using XAI's Grok search capabilities",
          inputSchema: {
            type: "object" as const,
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
  });

  // Handle tools/call request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "x_search") {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const toolParams = (request.params.arguments || {}) as unknown as XSearchParams;
    const result = await xSearchTool.execute(toolParams);

    return result;
  });

  // Connect stdio transport and start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr to avoid polluting stdout (which is used for MCP protocol)
  console.error("[xai-mcp-server] Connected via stdio transport");
}
