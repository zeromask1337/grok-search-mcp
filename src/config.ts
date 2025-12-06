/**
 * Server configuration
 */
export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  xai: {
    apiKey: process.env.XAI_API_KEY || "",
    model: process.env.XAI_MODEL || "grok-4-1-fast",
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
