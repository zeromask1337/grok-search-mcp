import { describe, it, expect } from "bun:test";
import { MCPHandler } from "./handler";
import { XSearchTool } from "../tools/x-search";
import { XAIClient } from "../xai";
import type { JSONRPCResponse } from "./types";

// Mock XAI client that returns deterministic results without hitting the network
class MockXAIClient extends XAIClient {
  constructor() {
    super({
      apiKey: "test-key",
      model: "test-model",
      timeoutMs: 1000,
      maxRetries: 0,
    });
  }

  async search(query: string) {
    return {
      id: "test-id",
      text: `Mock results for: ${query}`,
      citations: [
        {
          type: "url_citation",
          title: "Mock Source",
          url: "https://x.com/mock",
        },
      ],
    };
  }
}

function assertResponse(response: JSONRPCResponse | null): asserts response is JSONRPCResponse {
  expect(response).not.toBeNull();
}

describe("MCPHandler", () => {
  const tool = new XSearchTool(new MockXAIClient() as XAIClient);
  const handler = new MCPHandler(tool);

  it("rejects invalid JSON-RPC requests", async () => {
    const response = await handler.handle({ method: "tools/list" });
    assertResponse(response);
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32600);
  });

  it("returns x_search tool with outputSchema and annotations", async () => {
    const response = await handler.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    assertResponse(response);
    expect(response.error).toBeUndefined();
    expect(response.result?.tools).toHaveLength(1);
    const toolDef = response.result?.tools[0];
    expect(toolDef.name).toBe("x_search");
    expect(toolDef.outputSchema).toBeDefined();
    expect(toolDef.annotations?.readOnlyHint).toBe(true);
    expect(toolDef.annotations?.openWorldHint).toBe(true);
  });

  it("initializes with the supported protocol version", async () => {
    const response = await handler.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    });
    assertResponse(response);
    expect(response.error).toBeUndefined();
    expect(response.result?.protocolVersion).toBe("2024-11-05");
    expect(response.result?.serverInfo.name).toBe("xai-mcp-server");
  });

  it("rejects unsupported protocol version", async () => {
    const response = await handler.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "invalid",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    });
    assertResponse(response);
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32603);
  });

  it("executes x_search with valid arguments", async () => {
    const response = await handler.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "x_search",
        arguments: { query: "Bun runtime" },
      },
    });
    assertResponse(response);
    expect(response.error).toBeUndefined();
    expect(response.result?.isError).toBe(false);
    expect(response.result?.content[0].text).toContain("Mock results for: Bun runtime");
  });

  it("rejects x_search with missing or empty query", async () => {
    const response = await handler.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "x_search",
        arguments: {},
      },
    });
    assertResponse(response);
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32603);
  });

  it("rejects unknown methods", async () => {
    const response = await handler.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "unknown/method",
    });
    assertResponse(response);
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32601);
  });

  it("returns null for initialized notification", async () => {
    const response = await handler.handle({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    expect(response).toBeNull();
  });
});
