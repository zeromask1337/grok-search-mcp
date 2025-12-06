# Setup Guide

Complete guide to setting up the XAI MCP Server.

## Prerequisites

- Node.js 18+ (or Bun 1.0+)
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
npm install
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

```bash
npm run dev
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

## Step 6: Configure OpenCode

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

If you have an existing config, just add the `"xai"` section under `"mcp"`.

## Step 7: Test in OpenCode

1. Start OpenCode: `opencode`
2. Try a search:
   ```
   Search X for the latest news about TypeScript
   ```
3. OpenCode should automatically use the x_search tool

## Running as a Service (Optional)

### Using systemd (Linux)

Create `/etc/systemd/system/xai-mcp.service`:

```ini
[Unit]
Description=XAI MCP Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/xai-mcp-server
ExecStart=/usr/bin/node --loader ts-node/esm src/index.ts
Restart=always
EnvironmentFile=/path/to/xai-mcp-server/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable xai-mcp
sudo systemctl start xai-mcp
```

### Using launchd (macOS)

Create `~/Library/LaunchAgents/com.xai-mcp.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.xai-mcp</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>--loader</string>
        <string>ts-node/esm</string>
        <string>/path/to/xai-mcp-server/src/index.ts</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/xai-mcp-server</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>XAI_API_KEY</key>
        <string>your-api-key</string>
    </dict>
</dict>
</plist>
```

Load the service:

```bash
launchctl load ~/Library/LaunchAgents/com.xai-mcp.plist
```

## Updating

```bash
cd xai-mcp-server
git pull
npm install
# Restart the server
```

## Uninstalling

1. Stop the server (Ctrl+C or stop the service)
2. Remove the MCP config from `~/.config/opencode/opencode.json`
3. Delete the project folder

## Next Steps

- Read [TESTING.md](./TESTING.md) for testing instructions
- Check [README.md](./README.md) for API documentation
- Review [PLAN.md](./PLAN.md) for implementation details
