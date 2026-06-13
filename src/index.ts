import { Hono } from "hono";
import { logger } from "hono/logger";
import { MCPHandler } from "./mcp/handler";
import { startStdioServer } from "./mcp/stdio-server";
import { XAIClient } from "./xai";
import { XSearchTool } from "./tools/x-search";
import { config, validateConfig, getServerMode } from "./config";
import { MCPErrorCode } from "./mcp/types";

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

// Initialize XAI client and tools (shared between both modes)
const xaiClient = new XAIClient({
  apiKey: config.xai.apiKey,
  model: config.xai.model,
  timeoutMs: config.xai.timeoutMs,
  maxRetries: config.xai.maxRetries,
});
const xSearchTool = new XSearchTool(xaiClient);

let honoApp: Hono | null = null;
let serverPort: number | null = null;

// STDIO MODE: Run as MCP stdio server for local mode
if (mode === "stdio") {
  startStdioServer(xSearchTool)
    .then(() => {
      // Server is now listening on stdin/stdout
      // No additional logging needed - all logs go to stderr
    })
    .catch((error) => {
      console.error("[xai-mcp-server] Fatal error:", error);
      process.exit(1);
    });
} else {
  // HTTP MODE: Run as HTTP server for remote mode (default)
  const app = new Hono();
  const mcpHandler = new MCPHandler(xSearchTool);

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

  // MCP endpoint - JSON-RPC 2.0
  app.post("/mcp", async (c) => {
    let requestBody: unknown;
    try {
      requestBody = await c.req.json();
    } catch (error) {
      console.error("[MCP] Parse error:", error);
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: MCPErrorCode.ParseError,
            message: "Parse error: request body is not valid JSON",
          },
        },
        400
      );
    }

    const response = await mcpHandler.handle(requestBody);

    // Log incoming request (only if valid JSON-RPC)
    if (
      typeof requestBody === "object" &&
      requestBody !== null &&
      "method" in requestBody
    ) {
      console.log(
        `[MCP] ${(requestBody as { method: string }).method}`,
        "params" in requestBody
          ? JSON.stringify((requestBody as { params: unknown }).params).slice(0, 100)
          : ""
      );
    }

    // Notifications return null (no response body)
    if (response === null) {
      return new Response(null, { status: 202 });
    }

    return c.json(response);
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
      fetch: honoApp.fetch,
    }
  : undefined;
