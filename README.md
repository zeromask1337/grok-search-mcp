# XAI MCP Server

A Model Context Protocol (MCP) server that exposes XAI's `x_search` tool to OpenCode and other MCP clients.

## What is this?

This server wraps XAI's Grok agentic search capabilities (X/Twitter search) and makes them available as an MCP tool. It allows AI coding assistants like OpenCode to search X for real-time information.

## Features

- **X Search** - Search X (Twitter) for posts, users, and threads via XAI's Grok API
- **SSE Streaming** - Real-time streaming responses
- **Simple Setup** - Runs locally on localhost, no authentication needed
- **Citations** - Automatic citation extraction from search results
- **MCP Protocol** - Full JSON-RPC 2.0 compliance

## Quick Start

### 1. Get XAI API Key

Get your API key from [console.x.ai](https://console.x.ai)

### 2. Setup

```bash
# Clone the repo (or copy files)
cd xai-mcp-server

# Copy environment template
cp .env.example .env

# Edit .env and add your XAI_API_KEY
# XAI_API_KEY=xai-your-key-here

# Install dependencies
npm install

# Start the server
npm run dev
```

### 3. Configure OpenCode

#### Option A: Remote Mode (HTTP) - Server runs separately

Start the server:
```bash
npm run dev
```

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "xai": {
      "type": "remote",
      "url": "http://localhost:3000/mcp",
      "enabled": true,
      "timeout": 30000
    }
  }
}
```

#### Option B: Local Mode (Stdio) - OpenCode spawns server

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "xai": {
      "type": "local",
      "command": ["bun", "run", "/absolute/path/to/xai-mcp-server/src/index.ts", "--stdio"],
      "environment": {
        "XAI_API_KEY": "your-xai-api-key"
      },
      "enabled": true
    }
  }
}
```

Replace `/absolute/path/to/xai-mcp-server` with the actual path to your cloned repository.

### 4. Use in OpenCode

```
Search X for the latest discussions about Bun runtime
```

OpenCode will automatically use the `x_search` tool.

## Architecture

```
OpenCode Client --> MCP Server (localhost:3000) --> XAI Responses API
                         |                              |
                    POST /mcp                     POST /v1/responses
                    (JSON-RPC 2.0)               (tools: [{ type: "x_search" }])
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info |
| `/health` | GET | Health check |
| `/mcp` | POST | MCP JSON-RPC endpoint |

## MCP Protocol

### Initialize

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05"
    }
  }'
```

### List Tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### Call x_search

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "x_search",
      "arguments": {
        "query": "What is the latest news about AI?"
      }
    }
  }'
```

## Tool: x_search

Searches X (Twitter) using XAI's Grok API.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query to find relevant X posts and content"
    }
  },
  "required": ["query"]
}
```

### Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Search results with formatted citations..."
    }
  ],
  "isError": false
}
```

## Configuration

Environment variables (`.env`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XAI_API_KEY` | Yes | - | Your XAI API key |
| `PORT` | No | `3000` | Server port |
| `XAI_MODEL` | No | `grok-4-1-fast` | XAI model to use |
| `LOG_LEVEL` | No | `info` | Logging level |

## Project Structure

```
xai-mcp-server/
├── src/
│   ├── index.ts          # Server entry point
│   ├── config.ts         # Configuration
│   ├── mcp/
│   │   ├── handler.ts    # MCP protocol handler
│   │   └── types.ts      # MCP type definitions
│   ├── xai/
│   │   ├── client.ts     # XAI API client
│   │   └── types.ts      # XAI type definitions
│   └── tools/
│       └── x-search.ts   # x_search tool implementation
├── test-integration.ts   # Integration tests
├── TESTING.md            # Testing guide
├── PLAN.md               # Implementation plan
└── README.md
```

## Testing

```bash
# Start the server
npm run dev

# In another terminal, run tests
node --loader ts-node/esm test-integration.ts
```

See [TESTING.md](./TESTING.md) for detailed testing instructions.

## Tech Stack

- **Runtime**: Node.js with ts-node (Bun compatible)
- **Framework**: Hono
- **Validation**: Zod
- **API**: XAI Responses API (`/v1/responses`)

## Troubleshooting

### Server won't start

- Check that `XAI_API_KEY` is set in `.env`
- Make sure port 3000 is available

### "Unauthorized" error

- Verify your XAI API key is valid
- Check that the key has access to the Responses API

### Tool not appearing in OpenCode

- Verify the MCP config in `~/.config/opencode/opencode.json`
- Restart OpenCode after adding the config
- Check server is running with `curl http://localhost:3000/health`

### Slow responses

- XAI search typically takes 2-10 seconds
- The server is not caching results
- Check your network connection

## License

MIT
