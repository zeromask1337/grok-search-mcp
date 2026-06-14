import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { XAIClient, type XAISearchResult, type XAICitation } from "../xai";

export const XSearchInputSchema = z
  .object({
    query: z
      .string()
      .min(1, "Query must be a non-empty string")
      .describe("The search query to find relevant X posts and content"),
  })
  .strict();

export type XSearchParams = z.infer<typeof XSearchInputSchema>;

export const xSearchToolAnnotations: ToolAnnotations = {
  title: "X Search",
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export const xSearchToolDescription = `Search X (formerly Twitter) for posts, users, and threads using XAI's Grok agentic search.

This is a read-only search tool. It does not create, modify, or delete any X content. The query is sent to XAI's Responses API, which performs a live search on X and returns a text summary with Markdown citations to the referenced posts.

Args:
  - query (string, required): The search query. Be specific to get relevant results.

Returns:
  A text response with search results and a "Sources:" section containing Markdown links to the X posts referenced.

Examples:
  - "Latest news about TypeScript"
  - "What did xAI announce this week?"
  - "Official @xAI account"

Error handling:
  - Returns an error if the query is missing or empty.
  - Returns an error if the XAI API request fails or times out.`;

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
  async execute(params: XSearchParams): Promise<CallToolResult> {
    try {
      const { query } = params;

      console.error(`[x_search] Executing search: "${query}"`);

      const result = await this.client.search(query);

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
  private formatResult(result: XAISearchResult): CallToolResult {
    const citationText = this.formatCitations(result.citations);

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
      .filter((line): line is string => line !== null);

    if (citationLines.length === 0) {
      return "";
    }

    return `**Sources:**\n${citationLines.join("\n")}`;
  }
}

/**
 * Register the x_search tool with an McpServer instance.
 */
export function registerXSearchTool(server: McpServer, client: XAIClient): void {
  const tool = new XSearchTool(client);

  server.registerTool(
    "x_search",
    {
      title: xSearchToolAnnotations.title,
      description: xSearchToolDescription,
      inputSchema: XSearchInputSchema,
      annotations: xSearchToolAnnotations,
    },
    async (args) => tool.execute(args)
  );
}
