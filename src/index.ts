import { Hono } from "hono";
import { logger } from "hono/logger";
import { MCPHandler } from "./mcp/handler";
import { config, validateConfig } from "./config";
import type { JSONRPCRequest } from "./mcp/types";

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  console.error("Configuration error:", error instanceof Error ? error.message : error);
  process.exit(1);
}

const app = new Hono();
const mcpHandler = new MCPHandler();

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
    return c.json({
      jsonrpc: "2.0",
      error: {
        code: -32700,
        message: "Parse error",
        data: error instanceof Error ? error.message : "Unknown error",
      },
    }, 500);
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

// Start server
const port = config.port;
console.log(`🚀 XAI MCP Server starting...`);
console.log(`📍 Server running on http://localhost:${port}`);
console.log(`🔍 MCP endpoint: http://localhost:${port}/mcp`);
console.log(`💚 Health check: http://localhost:${port}/health`);
console.log(`\n✨ Ready to accept connections`);

export default {
  port,
  fetch: app.fetch,
};
