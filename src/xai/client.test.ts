import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { XAIClient } from "./client";
import type { XAIResponse } from "./types";

describe("XAIClient", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createMockResponse(overrides: Partial<XAIResponse> = {}): XAIResponse {
    return {
      id: "resp-1",
      object: "response",
      status: "completed",
      model: "grok-4-1-fast",
      output: [
        {
          id: "msg-1",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "Mock result",
              annotations: [
                {
                  type: "url_citation",
                  title: "Mock Source",
                  url: "https://x.com/mock",
                },
              ],
            },
          ],
        },
      ],
      ...overrides,
    };
  }

  it("returns parsed search result with citations", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(createMockResponse()), { status: 200 })) as unknown as typeof fetch;

    const client = new XAIClient({ apiKey: "test-key", maxRetries: 0 });
    const result = await client.search("test");

    expect(result.id).toBe("resp-1");
    expect(result.text).toBe("Mock result");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].url).toBe("https://x.com/mock");
  });

  it("throws when response has no message output", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify(
          createMockResponse({
            output: [{ type: "reasoning", summary: "thinking..." }] as any,
          })
        ),
        { status: 200 }
      )) as unknown as typeof fetch;

    const client = new XAIClient({ apiKey: "test-key", maxRetries: 0 });
    await expect(client.search("test")).rejects.toThrow(
      "No message content in XAI response"
    );
  });

  it("throws when message has no output_text", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify(
          createMockResponse({
            output: [
              {
                id: "msg-1",
                type: "message",
                role: "assistant",
                content: [{ type: "refusal", text: "I can't answer that" }] as any,
              },
            ],
          })
        ),
        { status: 200 }
      )) as unknown as typeof fetch;

    const client = new XAIClient({ apiKey: "test-key", maxRetries: 0 });
    await expect(client.search("test")).rejects.toThrow(
      "No text content in XAI response"
    );
  });

  it("throws on API error without retrying 4xx", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("Unauthorized", { status: 401 });
    }) as unknown as typeof fetch;

    const client = new XAIClient({ apiKey: "test-key", maxRetries: 2 });
    await expect(client.search("test")).rejects.toThrow(
      "XAI API error (401): Unauthorized"
    );
    expect(calls).toBe(1);
  });

  it("retries on 500 and succeeds", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) {
        return new Response("Internal Server Error", { status: 500 });
      }
      return new Response(JSON.stringify(createMockResponse()), { status: 200 });
    }) as unknown as typeof fetch;

    const client = new XAIClient({
      apiKey: "test-key",
      maxRetries: 2,
      timeoutMs: 1000,
    });
    const result = await client.search("test");

    expect(result.text).toBe("Mock result");
    expect(calls).toBe(2);
  });

  it("retries on network errors and eventually throws", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      throw new Error("Network failure");
    }) as unknown as typeof fetch;

    const client = new XAIClient({
      apiKey: "test-key",
      maxRetries: 2,
      timeoutMs: 1000,
    });
    await expect(client.search("test")).rejects.toThrow("Network failure");
    expect(calls).toBe(3);
  });
});
