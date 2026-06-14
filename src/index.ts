import { Hono } from "hono";
import { logger } from "hono/logger";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config, validateConfig, getServerMode } from "./config";
import { XAIClient } from "./xai";
import { registerXSearchTool } from "./tools/x-search";

const SERVER_VERSION = "0.1.0";
const SERVER_NAME = "xai-mcp-server";

// Handle CLI flags before requiring config
const arg = process.argv[2];
if (arg === "--help" || arg === "-h") {
  console.log(`
${SERVER_NAME} v${SERVER_VERSION}

Usage:
  bun run src/index.ts              Run HTTP server (default)
  bun run src/index.ts --stdio      Run stdio MCP server
  bun run src/index.ts --help       Show this help
  bun run src/index.ts --version    Show version

Environment variables:
  XAI_API_KEY      Required. XAI API key from https://console.x.ai
  PORT             HTTP server port (default: 3000)
  XAI_MODEL        Model to use (default: grok-4-1-fast)
  XAI_TIMEOUT_MS   Request timeout in ms (default: 30000)
  XAI_MAX_RETRIES  Max retries on transient failures (default: 2)
  LOG_LEVEL        Logging level (default: info)
  MCP_MODE         Set to "stdio" to force stdio mode
`);
  process.exit(0);
}

if (arg === "--version" || arg === "-v") {
  console.log(`${SERVER_NAME} v${SERVER_VERSION}`);
  process.exit(0);
}

// Validate configuration on startup
const mode = getServerMode();
try {
  validateConfig();
} catch (error) {
  console.error(
    "Configuration error:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}

// Initialize XAI client and MCP server (shared between both modes)
const xaiClient = new XAIClient({
  apiKey: config.xai.apiKey,
  model: config.xai.model,
  timeoutMs: config.xai.timeoutMs,
  maxRetries: config.xai.maxRetries,
});

const server = new McpServer(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

registerXSearchTool(server, xaiClient);

let honoApp: Hono | null = null;
let serverPort: number | null = null;

// STDIO MODE: Run as MCP stdio server for local mode
if (mode === "stdio") {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[xai-mcp-server] Connected via stdio transport");
} else {
  // HTTP MODE: Run as HTTP server for remote mode (default)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  const app = new Hono();

  // Logging middleware
  app.use("*", logger());

  // Health check endpoint
  app.get("/health", (c) => {
    return c.json({
      status: "healthy",
      server: SERVER_NAME,
      version: SERVER_VERSION,
      uptime: process.uptime(),
    });
  });

  // MCP endpoint - Streamable HTTP (stateless JSON)
  app.post("/mcp", async (c) => {
    return transport.handleRequest(c.req.raw);
  });

  // Root endpoint
  app.get("/", (c) => {
    return c.json({
      name: "XAI MCP Server",
      version: SERVER_VERSION,
      description: "Model Context Protocol server for XAI x_search tool",
      endpoints: {
        health: "/health",
        mcp: "/mcp (POST)",
      },
    });
  });

  // Store for export
  honoApp = app;
  serverPort = config.port;

  console.log(`🚀 ${SERVER_NAME} v${SERVER_VERSION} starting...`);
  console.log(`📍 Server running on http://localhost:${serverPort}`);
  console.log(`🔍 MCP endpoint: http://localhost:${serverPort}/mcp`);
  console.log(`💚 Health check: http://localhost:${serverPort}/health`);
  console.log(`\n✨ Ready to accept connections`);
}

// Export for Bun (only in HTTP mode)
export default honoApp
  ? {
      port: serverPort,
      hostname: "127.0.0.1",
      fetch: honoApp.fetch,
    }
  : undefined;
