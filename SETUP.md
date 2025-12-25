# Setup Guide

Complete guide to setting up the XAI MCP Server.

## Prerequisites

- Bun 1.0+ (TypeScript runtime)
- XAI API key from [console.x.ai](https://console.x.ai)

## Step 1: Get XAI API Key

1. Go to [console.x.ai](https://console.x.ai)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you won't see it again)

## Step 2: Install Dependencies

```bash
cd xai-mcp-server
bun install
```

## Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

Add your API key:

```bash
XAI_API_KEY=xai-your-actual-key-here
PORT=3000
XAI_MODEL=grok-4-1-fast
LOG_LEVEL=info
```

## Step 4: Start the Server

Choose your mode:

### Local Mode (Recommended)

If using local mode (OpenCode spawns server on-demand), skip this step. OpenCode will start the server automatically.

### Remote Mode

If using remote mode (server runs 24/7):

```bash
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

## Step 5: Verify Server

### For Remote Mode

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "server": "xai-mcp-server",
  "version": "0.1.0",
  "uptime": 5.123
}
```

### For Local Mode

Verification happens automatically when OpenCode spawns the server.

## Step 6: Choose OpenCode Connection Mode

### Option A: Local Mode (Recommended)

OpenCode spawns the server as a subprocess on-demand. No need to run a separate server.

Edit `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "xai": {
      "type": "local",
      "command": ["bun", "run", "/absolute/path/to/xai-mcp-server/src/index.ts", "--stdio"],
      "environment": {
        "XAI_API_KEY": "xai-your-actual-key-here"
      },
      "enabled": true
    }
  }
}
```

**Important Notes:**
- Use absolute path (e.g., `/Users/username/projects/xai-mcp-server`), not relative path
- Find absolute path with: `cd /path/to/xai-mcp-server && pwd`
- API key can be set here or in `.env` file (both work)

**Benefits:**
- No manual server startup required
- Lower resource usage (only runs when OpenCode uses it)
- Server stops when not needed

### Option B: Remote Mode

Server runs on localhost:3000. You start and manage the server manually.

Choose one of two modes:

### Remote Mode (HTTP) - Recommended for continuous use

Server must be running separately (`npm run dev`). OpenCode connects via HTTP.

Edit `~/.config/opencode/opencode.json`:

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

### Local Mode (Stdio) - Recommended for on-demand use

OpenCode spawns the server as a subprocess. No need to run it separately.

Edit `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "xai": {
      "type": "local",
      "command": ["bun", "run", "/absolute/path/to/xai-mcp-server/src/index.ts", "--stdio"],
      "environment": {
        "XAI_API_KEY": "xai-your-actual-key-here"
      },
      "enabled": true
    }
  }
}
```

Replace `/absolute/path/to/xai-mcp-server` with your actual repository path (use `pwd` to find it).

**Mode comparison:**

| Aspect | Remote (HTTP) | Local (Stdio) |
|--------|---------------|---------------|
| Server startup | Manual (`npm run dev`) | Automatic (spawned by OpenCode) |
| Resource usage | Continuous 24/7 | Only when needed |
| Connection | Over HTTP localhost | Direct stdio |
| Best for | Continuous development | On-demand usage |

If you have an existing config, just add the `"xai"` section under `"mcp"`.

## Step 7: Test in OpenCode

1. Start OpenCode: `opencode`
2. Try a search:
   ```
   Search X for the latest news about TypeScript
   ```
3. OpenCode should automatically use the x_search tool

## Updating

```bash
cd xai-mcp-server
git pull
bun install
# Restart the server (if using remote mode)
```

## Uninstalling

1. Stop the server (if using remote mode)
2. Remove the MCP config from `~/.config/opencode/opencode.json`
3. Delete the project folder

## Next Steps

- Read [TESTING.md](./TESTING.md) for testing instructions
- Check [README.md](./README.md) for API documentation
- Review [PLAN.md](./PLAN.md) for implementation details
