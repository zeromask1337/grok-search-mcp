# Testing Guide

## Prerequisites

1. **XAI API Key**: Get your API key from [console.x.ai](https://console.x.ai)
2. **Environment Setup**: Copy `.env.example` to `.env` and add your API key
3. **Dependencies**: Run `npm install`

## Running Tests

### 1. Start the Server

```bash
npm run dev
```

The server should start on `http://localhost:3000`

### 2. Run Integration Tests

In a separate terminal:

```bash
node --loader ts-node/esm test-integration.ts
```

This will test:
- ✅ Health check endpoint
- ✅ MCP initialize protocol
- ✅ MCP tools/list
- ✅ MCP tools/call with x_search
- ✅ Error handling (unknown method)
- ✅ Error handling (missing parameters)

### 3. Manual Testing with curl

#### Health Check
```bash
curl http://localhost:3000/health
```

#### MCP Initialize
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
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

#### List Tools
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

#### Call x_search Tool
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
        "query": "What is the latest news about Bun runtime?"
      }
    }
  }'
```

## Testing with OpenCode

### 1. Configure OpenCode

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

### 2. Start OpenCode

```bash
opencode
```

### 3. Test the Tool

In OpenCode, try:

```
Search X for the latest discussions about OpenAI
```

OpenCode should automatically discover and use the `x_search` tool.

## Expected Behavior

### Successful Response
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Search results...\n\n**Sources:**\n1. [Title](https://x.com/...)\n2. [Title](https://x.com/...)"
      }
    ],
    "isError": false
  }
}
```

### Error Response
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error executing X search: XAI API error (401): Unauthorized"
      }
    ],
    "isError": true
  }
}
```

## Common Issues

### "XAI_API_KEY environment variable is required"
- Make sure you have a `.env` file with `XAI_API_KEY=your-key-here`
- Restart the server after adding the API key

### "Connection refused" or "ECONNREFUSED"
- Make sure the server is running on port 3000
- Check if another service is using port 3000

### "XAI API error (401): Unauthorized"
- Your API key is invalid or expired
- Get a new API key from https://console.x.ai

### "XAI API error (429): Too Many Requests"
- You've hit the rate limit
- Wait a few minutes and try again

## Performance Testing

Test search latency:

```bash
time curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "x_search",
      "arguments": {
        "query": "test query"
      }
    }
  }'
```

Expected response time: 2-10 seconds (depends on XAI API)
