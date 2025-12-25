import { Hono } from "hono";
import { logger } from "hono/logger";
import { MCPHandler } from "./mcp/handler";
import { XAIClient } from "./xai";
import { XSearchTool } from "./tools/x-search";
import { config, validateConfig } from "./config";
import type { JSONRPCRequest } from "./mcp/types";

/**
 * Start HTTP MCP server
 */
export async function startHttpServer(port: number) {
  validateConfig();

  const xaiClient = new XAIClient({
    apiKey: config.xai.apiKey,
    model: config.xai.model,
  });
  const xSearchTool = new XSearchTool(xaiClient);

  const app = new Hono();
  const mcpHandler = new MCPHandler(xSearchTool);

  app.use("*", logger());

  app.get("/health", (c) => {
    return c.json({
      status: "healthy",
      server: "xai-mcp-server",
      version: "0.1.0",
      uptime: process.uptime(),
    });
  });

  app.post("/mcp", async (c) => {
    try {
      const request = await c.req.json<JSONRPCRequest>();
      
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

  console.log(`🚀 XAI MCP Server starting...`);
  console.log(`📍 Server running on http://localhost:${port}`);
  console.log(`🔍 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`💚 Health check: http://localhost:${port}/health`);
  console.log(`\n✨ Ready to accept connections`);

  return {
    port,
    fetch: app.fetch,
  };
}
