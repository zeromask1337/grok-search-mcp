#!/usr/bin/env node
import { program } from "commander";
import { startHttpServer } from "./http-server";
import { startStdioServer } from "./stdio-server";
import { config } from "./config";

program
  .name("xai-mcp-server")
  .description("XAI MCP Server - Search X (Twitter) using Grok")
  .version("0.1.0")
  .option("--transport <type>", "Transport type (stdio|http)", "http")
  .option("--port <number>", "Port for HTTP transport", String(config.port))
  .action((options) => {
    const { transport, port } = options;

    if (transport === "stdio") {
      console.log("🚀 Starting XAI MCP Server in stdio mode...");
      startStdioServer().catch((error) => {
        console.error("Failed to start stdio server:", error);
        process.exit(1);
      });
    } else {
      startHttpServer(parseInt(port, 10)).catch((error) => {
        console.error("Failed to start HTTP server:", error);
        process.exit(1);
      });
    }
  });

program.parse();
