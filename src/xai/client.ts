import {
  type XAIClientConfig,
  type XAIRequest,
  type XAIResponse,
  XAIResponseSchema,
  type XAISearchResult,
  type XAIMessageOutput,
} from "./types";

class XAIAPIError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "XAIAPIError";
  }
}

export class XAIClient {
  private apiKey: string;
  private model: string;
  private baseURL: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: XAIClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "grok-4-1-fast";
    this.baseURL = config.baseURL || "https://api.x.ai/v1";
    this.timeoutMs = config.timeoutMs || 30000;
    this.maxRetries = config.maxRetries ?? 2;
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

    const response = await this.fetchWithRetry(
      `${this.baseURL}/responses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    const data = await response.json();
    const parsed = XAIResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        `Unexpected XAI response format: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
      );
    }

    return this.parseResponse(parsed.data);
  }

  /**
   * Parse XAI response and extract text + citations
   */
  private parseResponse(data: XAIResponse): XAISearchResult {
    const messageOutput = data.output.find(
      (item): item is XAIMessageOutput => item.type === "message"
    );

    if (!messageOutput) {
      throw new Error("No message content in XAI response");
    }

    const textContent = messageOutput.content.find((c) => c.type === "output_text");

    if (!textContent) {
      throw new Error("No text content in XAI response");
    }

    return {
      id: data.id,
      text: textContent.text,
      citations: textContent.annotations || [],
    };
  }

  /**
   * Fetch with timeout and retry logic.
   * Retries on network errors and 5xx/429 responses.
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          const error = new XAIAPIError(
            `XAI API error (${response.status}): ${errorText}`,
            response.status
          );

          // Retry on 5xx and 429 rate limits
          if ((response.status >= 500 || response.status === 429) && attempt < this.maxRetries) {
            lastError = error;
            const delay = Math.min(1000 * 2 ** attempt, 8000);
            await sleep(delay);
            continue;
          }

          throw error;
        }

        return response;
      } catch (error) {
        clearTimeout(timeout);

        // Do not retry non-retryable HTTP errors (4xx except 429)
        if (error instanceof XAIAPIError && error.status < 500 && error.status !== 429) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`XAI API request timed out after ${this.timeoutMs}ms`);
        } else if (error instanceof Error) {
          lastError = error;
        } else {
          lastError = new Error("Unknown error during XAI API request");
        }

        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          await sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error("XAI API request failed");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
