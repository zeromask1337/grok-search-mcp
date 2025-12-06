import type {
  XAIClientConfig,
  XAIRequest,
  XAIResponse,
  XAISearchResult,
} from "./types";

export class XAIClient {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: XAIClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "grok-4-1-fast";
    this.baseURL = config.baseURL || "https://api.x.ai/v1";
  }

  /**
   * Perform X search using XAI's Responses API
   */
  async search(query: string): Promise<XAISearchResult> {
    const request: XAIRequest = {
      model: this.model,
      input: [{ role: "user", content: query }],
      tools: [{ type: "x_search" }],
    };

    const response = await fetch(`${this.baseURL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `XAI API error (${response.status}): ${error}`
      );
    }

    const data = await response.json();
    return this.parseResponse(data as XAIResponse);
  }

  /**
   * Parse XAI response and extract text + citations
   */
  private parseResponse(data: XAIResponse): XAISearchResult {
    // Find the message output in the response
    const messageOutput = data.output.find(
      (item: any) => item.type === "message"
    );

    if (!messageOutput || !("content" in messageOutput)) {
      throw new Error("No message content in XAI response");
    }

    // Extract text content
    const textContent = messageOutput.content.find(
      (c: any) => c.type === "output_text"
    );

    if (!textContent) {
      throw new Error("No text content in XAI response");
    }

    return {
      id: data.id,
      text: textContent.text || "",
      citations: textContent.annotations || [],
    };
  }

  /**
   * Perform streaming search with SSE
   */
  async *searchStream(query: string): AsyncGenerator<string> {
    const request: XAIRequest = {
      model: this.model,
      input: [{ role: "user", content: query }],
      tools: [{ type: "x_search" }],
      stream: true,
    };

    const response = await fetch(`${this.baseURL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `XAI API error (${response.status}): ${error}`
      );
    }

    if (!response.body) {
      throw new Error("No response body for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              if (parsed.output) {
                // Extract text from streaming output
                const msg = parsed.output.find(
                  (o: any) => o.type === "message"
                );
                if (msg?.content) {
                  const text = msg.content.find(
                    (c: any) => c.type === "output_text"
                  )?.text;
                  if (text) yield text;
                }
              }
            } catch (e) {
              // Skip invalid JSON chunks
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
