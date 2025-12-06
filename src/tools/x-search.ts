import { XAIClient, type XAISearchResult, type XAICitation } from "../xai";
import type { MCPToolCallResult } from "../mcp/types";

export interface XSearchParams {
  query: string;
}

/**
 * X Search Tool - searches X (Twitter) using XAI's Grok API
 */
export class XSearchTool {
  private client: XAIClient;

  constructor(client: XAIClient) {
    this.client = client;
  }

  /**
   * Execute X search and format response for MCP
   */
  async execute(params: XSearchParams): Promise<MCPToolCallResult> {
    try {
      const { query } = params;

      if (!query || typeof query !== "string") {
        throw new Error("Query parameter is required and must be a string");
      }

      console.log(`[x_search] Executing search: "${query}"`);

      // Call XAI API
      const result = await this.client.search(query);

      // Format response for MCP
      return this.formatResult(result);
    } catch (error) {
      console.error("[x_search] Error:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error executing X search: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Format XAI search result for MCP protocol
   */
  private formatResult(result: XAISearchResult): MCPToolCallResult {
    const citationText = this.formatCitations(result.citations);

    // Combine text and citations
    const fullText = citationText
      ? `${result.text}\n\n${citationText}`
      : result.text;

    return {
      content: [
        {
          type: "text",
          text: fullText,
        },
      ],
      isError: false,
    };
  }

  /**
   * Format citations as markdown links
   */
  private formatCitations(citations: XAICitation[]): string {
    if (!citations || citations.length === 0) {
      return "";
    }

    const citationLines = citations
      .map((citation, index) => {
        const title = citation.title || "Source";
        const url = citation.url || "";
        return url ? `${index + 1}. [${title}](${url})` : null;
      })
      .filter(Boolean);

    if (citationLines.length === 0) {
      return "";
    }

    return `**Sources:**\n${citationLines.join("\n")}`;
  }
}
