import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { XAIClient } from "./xai";
import { config, validateConfig } from "./config";
import { z } from "zod";

/**
 * Start stdio MCP server
 */
export async function startStdioServer() {
  validateConfig();

  const server = new McpServer({
    name: "xai-mcp-server",
    version: "0.1.0",
  });

  const xaiClient = new XAIClient({
    apiKey: config.xai.apiKey,
    model: config.xai.model,
  });

  server.tool(
    "x_search",
    "Search X (Twitter) for posts, users, and threads using XAI's Grok search capabilities",
    {
      query: z.string().describe("The search query to find relevant X posts and content")
    },
    async ({ query }) => {
      try {
        const result = await xaiClient.search(query);
        
        const citationText = formatCitations(result.citations);
        const fullText = citationText
          ? `${result.text}\n\n${citationText}`
          : result.text;

        return {
          content: [{ type: "text", text: fullText }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error executing X search: ${error instanceof Error ? error.message : "Unknown error"}`
          }],
          isError: true
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function formatCitations(citations: any[]): string {
  if (!citations || citations.length === 0) {
    return "";
  }

  const citationLines = citations
    .map((citation: any, index: number) => {
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
