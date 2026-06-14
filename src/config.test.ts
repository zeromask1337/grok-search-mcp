import { describe, it, expect, afterEach } from "bun:test";
import { validateConfig, getServerMode, config } from "./config";

describe("config", () => {
  const originalApiKey = config.xai.apiKey;

  afterEach(() => {
    config.xai.apiKey = originalApiKey;
    delete process.env.XAI_API_KEY;
    delete process.argv[2];
  });

  it("throws when XAI_API_KEY is missing", () => {
    config.xai.apiKey = "";
    expect(() => validateConfig()).toThrow(
      "XAI_API_KEY environment variable is required"
    );
  });

  it("passes when XAI_API_KEY is set", () => {
    config.xai.apiKey = "test-key";
    expect(() => validateConfig()).not.toThrow();
  });

  it("defaults to http mode", () => {
    process.argv = ["bun", "index.ts"];
    expect(getServerMode()).toBe("http");
  });

  it("switches to stdio mode via CLI flag", () => {
    process.argv = ["bun", "index.ts", "--stdio"];
    expect(getServerMode()).toBe("stdio");
  });

  it("switches to stdio mode via env var", () => {
    process.argv = ["bun", "index.ts"];
    process.env.MCP_MODE = "stdio";
    expect(getServerMode()).toBe("stdio");
  });

  it("uses default config values", () => {
    expect(config.port).toBe(3000);
    expect(config.xai.model).toBe("grok-4-1-fast");
    expect(config.xai.timeoutMs).toBe(30000);
    expect(config.xai.maxRetries).toBe(2);
  });
});
