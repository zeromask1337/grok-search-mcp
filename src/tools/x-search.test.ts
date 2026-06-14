import { describe, it, expect } from "bun:test";
import { XSearchTool, XSearchInputSchema } from "./x-search";
import { XAIClient } from "../xai";
import type { XAISearchResult } from "../xai";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";

function getTextContent(result: { content: Array<{ type?: string; text?: string }> }): string {
  const block = result.content.find((c): c is TextContent => c.type === "text");
  return block?.text ?? "";
}

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

  async search(query: string): Promise<XAISearchResult> {
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

describe("XSearchTool", () => {
  const tool = new XSearchTool(new MockXAIClient());

  it("executes x_search with valid arguments", async () => {
    const result = await tool.execute({ query: "Bun runtime" });
    const text = getTextContent(result);

    expect(result.isError).toBe(false);
    expect(text).toContain("Mock results for: Bun runtime");
    expect(text).toContain("**Sources:**");
    expect(text).toContain("[Mock Source](https://x.com/mock)");
  });

  it("formats results without citations", async () => {
    const client = new MockXAIClient();
    client.search = async () => ({
      id: "no-citations",
      text: "No citations here",
      citations: [],
    });

    const result = await new XSearchTool(client).execute({ query: "test" });

    expect(result.isError).toBe(false);
    expect(getTextContent(result)).toBe("No citations here");
  });

  it("returns an error result when the client fails", async () => {
    const client = new MockXAIClient();
    client.search = async () => {
      throw new Error("XAI API error (500): Internal error");
    };

    const result = await new XSearchTool(client).execute({ query: "test" });
    const text = getTextContent(result);

    expect(result.isError).toBe(true);
    expect(text).toContain("Error executing X search");
    expect(text).toContain("XAI API error (500)");
  });
});

describe("XSearchInputSchema", () => {
  it("accepts a non-empty query", () => {
    const parsed = XSearchInputSchema.safeParse({ query: "Bun runtime" });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty query", () => {
    const parsed = XSearchInputSchema.safeParse({ query: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing query", () => {
    const parsed = XSearchInputSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown arguments", () => {
    const parsed = XSearchInputSchema.safeParse({
      query: "Bun runtime",
      extra: "value",
    });
    expect(parsed.success).toBe(false);
  });
});
