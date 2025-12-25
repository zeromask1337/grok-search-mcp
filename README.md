# XAI MCP Server

A Model Context Protocol (MCP) server that exposes XAI's `x_search` tool to OpenCode and other MCP clients.

## What is this?

This server wraps XAI's Grok agentic search capabilities (X/Twitter search) and makes them available as an MCP tool. It allows AI coding assistants like OpenCode to search X for real-time information.

## Features

- **X Search** - Search X (Twitter) for posts, users, and threads via XAI's Grok API
- **Dual Mode** - Works as HTTP server (remote mode) or stdio subprocess (local mode)
- **Simple Setup** - Runs locally, no authentication needed
- **Citations** - Automatic citation extraction from search results
- **MCP Protocol** - Full JSON-RPC 2.0 compliance

## Quick Start

### Choose Your Mode

XAI MCP Server works in two modes:

- **Local Mode** (recommended for most users)
  - OpenCode spawns server on-demand
  - No need to manage server separately
  - Lower resource usage (only runs when needed)
  
- **Remote Mode** (for continuous development)
  - Server runs 24/7 on localhost:3000
  - Useful during active development
  - Slightly faster subsequent calls

Choose below based on your workflow.

### 1. Get XAI API Key

Get your API key from [console.x.ai](https://console.x.ai)

### 2A. Setup - Local Mode

```bash
# Clone the repo (or copy files)
cd xai-mcp-server

# Copy environment template
cp .env.example .env

# Edit .env and add your XAI_API_KEY
# XAI_API_KEY=xai-your-key-here

# Install dependencies
bun install
```

### 2B. Setup - Remote Mode

```bash
# Clone the repo (or copy files)
cd xai-mcp-server

# Copy environment template
cp .env.example .env

# Edit .env and add your XAI_API_KEY
# XAI_API_KEY=xai-your-key-here

# Install dependencies
bun install

# Start the server
bun run dev
```

You should see:

```
🚀 XAI MCP Server starting...
📍 Server running on http://localhost:3000
🔍 MCP endpoint: http://localhost:3000/mcp
💚 Health check: http://localhost:3000/health

✨ Ready to accept connections
```

### 3A. Configure OpenCode - Local Mode

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "xai": {
      "type": "local",
      "command": ["bun", "run", "/absolute/path/to/xai-mcp-server/src/index.ts", "--stdio"],
      "environment": {
        "XAI_API_KEY": "xai-your-key-here"
      },
      "enabled": true
    }
  }
}
```

**Important:** Use absolute path to the repository (e.g., `/Users/username/projects/xai-mcp-server`).

### 3B. Configure OpenCode - Remote Mode

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

### Remote Mode (HTTP)

```
┌─ REMOTE MODE ──────────────────────────────────────────────────────┐
│                                                                      │
│  OpenCode                          XAI MCP Server                   │
│     │                                      │                        │
│     │─ initialize ─────────────────────────→│                       │
│     │                                       │                       │
│     │◄───── serverInfo, capabilities ──────│                       │
│     │                                       │                       │
│     │─ tools/list ──────────────────────────→│                      │
│     │                                       │                       │
│     │◄────── x_search tool definition ──────│                      │
│     │                                       │                       │
│     │─ tools/call (query:"AI") ────────────→│                      │
│     │                                       │ ┌─ XAI API ──────────┐│
│     │                                       │ │                    ││
│     │                                       │─→ POST /v1/responses ││
│     │                                       │ │   (x_search tool)  ││
│     │                                       │←─ Response + citations││
│     │                                       │ └────────────────────┘│
│     │◄─ search results + citations ────────│                      │
│     │                                       │                       │
│  (HTTP localhost:3000/mcp)            (JSON-RPC 2.0)              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Local Mode (Stdio)

```
┌─ LOCAL MODE ───────────────────────────────────────────────────────┐
│                                                                      │
│  OpenCode                          XAI MCP Server (subprocess)      │
│     │                                      │                        │
│     │─ initialize (stdin) ─────────────────→│                       │
│     │                                       │                       │
│     │◄─ serverInfo (stdout) ────────────────│                      │
│     │                                       │                       │
│     │─ tools/list (stdin) ──────────────────→│                      │
│     │                                       │                       │
│     │◄─ tools (stdout) ──────────────────────│                      │
│     │                                       │                       │
│     │─ tools/call (stdin) ──────────────────→│                      │
│     │                                       │ ┌─ XAI API ──────────┐│
│     │                                       │ │                    ││
│     │                                       │─→ POST /v1/responses ││
│     │                                       │ │   (x_search tool)  ││
│     │                                       │←─ Response + citations││
│     │                                       │ └────────────────────┘│
│     │◄─ results (stdout) ────────────────────│                      │
│     │                                       │                       │
│  (stdio)                               (JSON-RPC 2.0)              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## MCP Protocol

### Remote Mode (HTTP)

All requests go to: `POST http://localhost:3000/mcp`

#### Initialize

Request:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "OpenCode",
        "version": "1.0.0"
      }
    }
  }'
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "xai-mcp-server",
      "version": "0.1.0"
    }
  }
}
```

#### List Tools

Request:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "x_search",
        "description": "Search X (Twitter) for posts, users, and threads using XAI's Grok search capabilities",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "The search query to find relevant X posts and content"
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

#### Call x_search Tool

Request:
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
        "query": "latest developments in Bun runtime"
      }
    }
  }'
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Recent discussions about Bun runtime show...\n\n**Sources:**\n1. [Tweet about Bun 1.0](https://x.com/...)\n2. [Discussion on Bun performance](https://x.com/...)"
      }
    ],
    "isError": false
  }
}
```

### Local Mode (Stdio)

OpenCode spawns: `bun run /path/to/xai-mcp-server/src/index.ts --stdio`

Communication happens via stdin/stdout with JSON-RPC 2.0 messages (one per line).

#### Initialize

Send to stdin:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"OpenCode","version":"1.0.0"}}}
```

Receive from stdout:
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"xai-mcp-server","version":"0.1.0"}}}
```

#### List Tools

Send to stdin:
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```

Receive from stdout:
```json
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"x_search","description":"Search X (Twitter) for posts, users, and threads using XAI's Grok search capabilities","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"The search query to find relevant X posts and content"}},"required":["query"]}}]}}
```

#### Call x_search Tool

Send to stdin:
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"x_search","arguments":{"query":"latest developments in Bun runtime"}}}
```

Receive from stdout:
```json
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Recent discussions about Bun runtime show...\n\n**Sources:**\n1. [Tweet about Bun 1.0](https://x.com/...)\n2. [Discussion on Bun performance](https://x.com/...)"}],"isError":false}}
```

### Manual Stdio Testing

For debugging purposes, you can test the stdio mode manually:

```bash
(
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
  sleep 0.1
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 0.1
  echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"x_search","arguments":{"query":"test"}}}'
) | bun run /path/to/xai-mcp-server/src/index.ts --stdio
```

Output:
- Logs appear on stderr: `[xai-mcp-server] Connected via stdio transport`
- MCP responses appear on stdout: `{"jsonrpc":"2.0",...}`

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
| `PORT` | No | `3000` | Server port (remote mode only) |
| `XAI_MODEL` | No | `grok-4-1-fast` | XAI model to use |
| `LOG_LEVEL` | No | `info` | Logging level |

## Project Structure

```
xai-mcp-server/
├── src/
│   ├── index.ts               # Server entry point (detects mode)
│   ├── config.ts              # Configuration
│   ├── mcp/
│   │   ├── handler.ts         # MCP JSON-RPC protocol handler
│   │   ├── stdio-server.ts    # MCP stdio transport (local mode)
│   │   └── types.ts           # MCP type definitions
│   ├── xai/
│   │   ├── client.ts          # XAI API client
│   │   └── types.ts           # XAI type definitions
│   └── tools/
│       └── x-search.ts        # x_search tool implementation
├── test-integration.ts        # Integration tests
├── TESTING.md                 # Testing guide
├── PLAN.md                    # Implementation plan
├── README.md                  # This file
└── SETUP.md                   # Setup guide
```

## Testing

### Remote Mode (HTTP)

```bash
# Start the server
bun run dev

# In another terminal, run tests
bun run test-integration.ts
```

### Local Mode (Stdio)

```bash
# Run with stdio mode
bun run src/index.ts --stdio
```

See [TESTING.md](./TESTING.md) for detailed testing instructions.

## Tech Stack

- **Runtime**: Bun (native TypeScript runtime)
- **Framework**: Hono
- **Validation**: Zod
- **MCP**: @modelcontextprotocol/sdk
- **API**: XAI Responses API (`/v1/responses`)

## Troubleshooting

### Server won't start

- Check that `XAI_API_KEY` is set in `.env`
- For remote mode: Make sure port 3000 is available
- For local mode: Ensure the command path is absolute

### "Unauthorized" error

- Verify your XAI API key is valid
- Check that the key has access to the Responses API

### Tool not appearing in OpenCode

- Verify the MCP config in `~/.config/opencode/opencode.json`
- Restart OpenCode after adding the config
- For remote mode: Check server is running with `curl http://localhost:3000/health`
- For local mode: Check that the absolute path in config is correct

### Slow responses

- XAI search typically takes 2-10 seconds
- The server is not caching results
- Check your network connection

### Local Mode Issues

- **Command not found**: Ensure absolute path is used (not relative)
- **Permission denied**: Check file permissions on `src/index.ts`
- **Connection timeout**: Verify XAI_API_KEY is set in environment

### Stdio Connection Issues

- **No output received**: Check that server is properly spawned
- **Partial JSON responses**: Ensure each message is sent on a single line
- **Logs on stdout**: Logs should appear on stderr, not stdout

## License

MIT
