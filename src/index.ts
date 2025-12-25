import { Hono } from "hono";
import { logger } from "hono/logger";
import { MCPHandler } from "./mcp/handler";
import { startStdioServer } from "./mcp/stdio-server";
import { XAIClient } from "./xai";
import { XSearchTool } from "./tools/x-search";
import { config, validateConfig } from "./config";
import type { JSONRPCRequest } from "./mcp/types";

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  console.error("Configuration error:", error instanceof Error ? error.message : error);
  process.exit(1);
}

// Determine server mode: stdio or http
const mode = process.argv[2] === "--stdio" || process.env.MCP_MODE === "stdio" ? "stdio" : "http";

// Initialize XAI client and tools (shared between both modes)
const xaiClient = new XAIClient({
  apiKey: config.xai.apiKey,
  model: config.xai.model,
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
      server: "xai-mcp-server",
      version: "0.1.0",
      uptime: process.uptime(),
    });
  });

  // MCP endpoint - JSON-RPC 2.0
  app.post("/mcp", async (c) => {
    try {
      const request = await c.req.json<JSONRPCRequest>();

      // Log incoming request
      console.log(`[MCP] ${request.method}`, request.params ? JSON.stringify(request.params).slice(0, 100) : "");

      const response = await mcpHandler.handle(request);

      return c.json(response);
    } catch (error) {
      console.error("[MCP] Error handling request:", error);
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
        },
        500
      );
    }
  });

  // Root endpoint
  app.get("/", (c) => {
    return c.json({
      name: "XAI MCP Server",
      version: "0.1.0",
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

  console.log(`🚀 XAI MCP Server starting...`);
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
