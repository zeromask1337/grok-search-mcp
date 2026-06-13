/**
 * Server configuration
 */
function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const config = {
  port: parseIntEnv(process.env.PORT, 3000),
  xai: {
    apiKey: process.env.XAI_API_KEY || "",
    model: process.env.XAI_MODEL || "grok-4-1-fast",
    timeoutMs: parseIntEnv(process.env.XAI_TIMEOUT_MS, 30000),
    maxRetries: parseIntEnv(process.env.XAI_MAX_RETRIES, 2),
  },
  logLevel: process.env.LOG_LEVEL || "info",
};

/**
 * Validate required configuration
 */
export function validateConfig() {
  if (!config.xai.apiKey) {
    throw new Error(
      "XAI_API_KEY environment variable is required. Get your API key from https://console.x.ai"
    );
  }
}

/**
 * Determine server mode from CLI or environment
 */
export function getServerMode(): "stdio" | "http" {
  const arg = process.argv[2];
  if (arg === "--stdio" || process.env.MCP_MODE === "stdio") {
    return "stdio";
  }
  return "http";
}
