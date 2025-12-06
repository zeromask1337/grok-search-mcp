# Implementation Plan: XAI X Search MCP Server

## Overview
Build a localhost MCP server that exposes XAI's `x_search` tool to OpenCode clients.

## Architecture
```
OpenCode → MCP Server (localhost:3000) → XAI Responses API
                                          └─> x_search tool
```

## Key Implementation Details

### XAI Responses API Format
```json
{
  "model": "grok-4-1-fast",
  "input": [{ "role": "user", "content": "query" }],
  "tools": [{ "type": "x_search" }]
}
```

### MCP Tool Definition
```json
{
  "name": "x_search",
  "description": "Search X (Twitter) for posts, users, and threads",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  }
}
```

## Implementation Phases

### ✅ Phase 0: Project Setup
- [x] Create project structure
- [x] Initialize project with npm
- [x] Install dependencies (hono, zod)
- [x] Setup TypeScript config
- [x] Create .env.example
- [x] Initial commit

### ✅ Phase 1: XAI Client (30-45 min)
- [x] Create XAI client with Responses API
- [x] Implement x_search request formatting
- [x] Add response parsing with citations
- [x] Implement SSE streaming support
- [x] Add error handling
- [x] Test XAI client directly

### ✅ Phase 2: MCP Server (1-1.5 hours)
- [x] Setup Hono HTTP server
- [x] Implement MCP protocol handler
  - [x] `initialize` method
  - [x] `tools/list` method
  - [x] `tools/call` method
- [x] Add health check endpoint
- [x] Add logging
- [x] Test MCP protocol compliance

### ⏳ Phase 3: Tool Integration (1-1.5 hours)
- [ ] Create x_search tool wrapper
- [ ] Wire XAI client to MCP handler
- [ ] Format responses for MCP
- [ ] Handle citations
- [ ] Add streaming support
- [ ] Error handling and timeouts

### ⏳ Phase 4: Testing (30 min)
- [ ] Unit tests for XAI client
- [ ] Integration tests for MCP protocol
- [ ] Manual testing with OpenCode
- [ ] Test error cases

### ⏳ Phase 5: Documentation (15-30 min)
- [ ] Update README with usage
- [ ] Add SETUP.md guide
- [ ] Document API format
- [ ] Add troubleshooting section

## Estimated Timeline
Total: 3.5 - 5 hours

## Tech Decisions
- **Bun/Node**: Fast runtime, native TypeScript
- **Hono**: Lightweight HTTP framework
- **No Auth**: Localhost only, single user
- **No Database**: Stateless server
- **SSE Streaming**: Real-time responses
