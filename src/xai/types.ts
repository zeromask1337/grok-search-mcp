import { z } from "zod";

// XAI Responses API Request Types
export const XAIMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const XAIToolSchema = z.object({
  type: z.enum(["x_search", "web_search"]),
});

export const XAIRequestSchema = z.object({
  model: z.string().default("grok-4-1-fast"),
  input: z.array(XAIMessageSchema),
  tools: z.array(XAIToolSchema),
  stream: z.boolean().optional(),
});

// XAI Responses API Response Types
export const XAICitationSchema = z.object({
  type: z.string(),
  url: z.string().optional(),
  title: z.string().optional(),
  snippet: z.string().optional(),
});

export const XAIOutputTextSchema = z.object({
  type: z.literal("output_text"),
  text: z.string(),
  annotations: z.array(XAICitationSchema).optional(),
});

export const XAIMessageOutputSchema = z.object({
  id: z.string(),
  type: z.literal("message"),
  role: z.string(),
  content: z.array(XAIOutputTextSchema),
});

export const XAIResponseSchema = z.object({
  id: z.string(),
  object: z.literal("response"),
  status: z.string(),
  model: z.string(),
  output: z.array(z.union([XAIMessageOutputSchema, z.any()])),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
});

// Exported Types
export type XAIMessage = z.infer<typeof XAIMessageSchema>;
export type XAITool = z.infer<typeof XAIToolSchema>;
export type XAIRequest = z.infer<typeof XAIRequestSchema>;
export type XAICitation = z.infer<typeof XAICitationSchema>;
export type XAIOutputText = z.infer<typeof XAIOutputTextSchema>;
export type XAIMessageOutput = z.infer<typeof XAIMessageOutputSchema>;
export type XAIResponse = z.infer<typeof XAIResponseSchema>;

// Client Response Types
export interface XAISearchResult {
  id: string;
  text: string;
  citations: XAICitation[];
}

export interface XAIClientConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}
