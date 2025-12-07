import { XAIClient } from "./client";

/**
 * Simple test to verify XAI client works
 * Run with: XAI_API_KEY=your_key bun run src/xai/test.ts
 */
async function testXAIClient() {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    console.error("Error: XAI_API_KEY environment variable not set");
    console.log("Usage: XAI_API_KEY=your_key npm run dev");
    process.exit(1);
  }

  const client = new XAIClient({ apiKey });

  console.log("Testing XAI Client...\n");
  console.log("Query: What is the latest news about Bun runtime?\n");

  try {
    // Test non-streaming
    console.log("--- Non-streaming mode ---");
    const result = await client.search(
      "What is the latest news about Bun runtime?"
    );

    console.log("Response ID:", result.id);
    console.log("\nText:", result.text);
    console.log("\nCitations:");
    result.citations.forEach((citation, i) => {
      console.log(`  ${i + 1}. ${citation.title || "No title"}`);
      console.log(`     ${citation.url || "No URL"}`);
    });

    // Test streaming
    console.log("\n\n--- Streaming mode ---");
    console.log("Streaming response:");
    for await (const chunk of client.searchStream(
      "What is Bun runtime?"
    )) {
      process.stdout.write(chunk);
    }
    console.log("\n\nStreaming complete!");
  } catch (error) {
    console.error("Error testing XAI client:", error);
    process.exit(1);
  }
}

testXAIClient();
