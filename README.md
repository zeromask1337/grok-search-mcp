# XAI MCP Server

A Model Context Protocol (MCP) server that exposes XAI's `x_search` tool to OpenCode and other MCP clients.

## What is this?

This server wraps XAI's Grok agentic search capabilities (X/Twitter search) and makes them available as an MCP tool. It allows AI coding assistants like OpenCode to search X for real-time information.

## Features

- 🔍 **X Search** - Search X (Twitter) for posts, users, and threads via XAI's Grok API
- 🔄 **SSE Streaming** - Real-time streaming responses
- 🚀 **Simple Setup** - Runs locally on localhost, no authentication needed
- 📝 **Citations** - Automatic citation extraction from search results

## Quick Start

1. Get your XAI API key from [console.x.ai](https://console.x.ai)
2. Clone and setup:
   ```bash
   cp .env.example .env
   # Edit .env and add your XAI_API_KEY
   npm install  # or bun install
   npm run dev  # or bun run dev
   ```
3. Configure OpenCode (in `~/.config/opencode/opencode.json`):
   ```json
   {
     "mcp": {
       "xai": {
         "type": "remote",
         "url": "http://localhost:3000/mcp",
         "enabled": true
       }
     }
   }
   ```

## Tech Stack

- **Runtime**: Bun / Node.js
- **Framework**: Hono
- **Validation**: Zod
- **API**: XAI Responses API (`/v1/responses`)

## License

MIT
