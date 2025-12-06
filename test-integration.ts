/**
 * Integration test for XAI MCP Server
 * 
 * Prerequisites:
 * 1. Set XAI_API_KEY environment variable
 * 2. Start the server: npm run dev
 * 3. Run this test: node --loader ts-node/esm test-integration.ts
 */

const MCP_URL = "http://localhost:3000/mcp";
const HEALTH_URL = "http://localhost:3000/health";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
}

async function runTests() {
  console.log("🧪 XAI MCP Server Integration Tests");
  console.log("=".repeat(60));
  console.log();

  try {
    // Test 1: Health check
    console.log("1. Testing health check endpoint...");
    try {
      const healthResponse = await fetch(HEALTH_URL);
      const healthData = await healthResponse.json();
      
      if (healthResponse.ok && healthData.status === "healthy") {
        logTest("Health check", true);
      } else {
        logTest("Health check", false, "Server not healthy");
      }
    } catch (error) {
      logTest("Health check", false, error instanceof Error ? error.message : "Unknown error");
      console.log("\n❌ Server is not running. Start it with: npm run dev\n");
      process.exit(1);
    }

    // Test 2: MCP Initialize
    console.log("\n2. Testing MCP initialize...");
    try {
      const initResponse = await fetch(MCP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        }),
      });

      const initData = await initResponse.json();
      
      if (initData.result?.protocolVersion && initData.result?.serverInfo) {
        logTest("MCP initialize", true);
        console.log(`   Protocol: ${initData.result.protocolVersion}`);
        console.log(`   Server: ${initData.result.serverInfo.name} v${initData.result.serverInfo.version}`);
      } else {
        logTest("MCP initialize", false, "Invalid response structure");
      }
    } catch (error) {
      logTest("MCP initialize", false, error instanceof Error ? error.message : "Unknown error");
    }

    // Test 3: MCP Tools List
    console.log("\n3. Testing MCP tools/list...");
    try {
      const listResponse = await fetch(MCP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
        }),
      });

      const listData = await listResponse.json();
      
      if (listData.result?.tools && Array.isArray(listData.result.tools)) {
        const hasXSearch = listData.result.tools.some((t: any) => t.name === "x_search");
        if (hasXSearch) {
          logTest("MCP tools/list", true);
          console.log(`   Found ${listData.result.tools.length} tool(s): ${listData.result.tools.map((t: any) => t.name).join(", ")}`);
        } else {
          logTest("MCP tools/list", false, "x_search tool not found");
        }
      } else {
        logTest("MCP tools/list", false, "Invalid tools list structure");
      }
    } catch (error) {
      logTest("MCP tools/list", false, error instanceof Error ? error.message : "Unknown error");
    }

    // Test 4: MCP Tool Call - x_search (requires XAI API key)
    console.log("\n4. Testing MCP tools/call - x_search...");
    console.log("   Query: What is XAI?");
    try {
      const callResponse = await fetch(MCP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "x_search",
            arguments: {
              query: "What is XAI?",
            },
          },
        }),
      });

      const callData = await callResponse.json();
      
      if (callData.result?.content && Array.isArray(callData.result.content)) {
        const textContent = callData.result.content.find((c: any) => c.type === "text");
        if (textContent?.text && !callData.result.isError) {
          logTest("MCP tool call - x_search", true);
          console.log(`   Response length: ${textContent.text.length} characters`);
          console.log(`   Preview: ${textContent.text.slice(0, 100)}...`);
          
          // Check for citations
          if (textContent.text.includes("**Sources:**")) {
            console.log("   ✓ Citations included");
          }
        } else if (callData.result.isError) {
          logTest("MCP tool call - x_search", false, textContent?.text || "Tool returned error");
        } else {
          logTest("MCP tool call - x_search", false, "No text content in response");
        }
      } else if (callData.error) {
        logTest("MCP tool call - x_search", false, callData.error.message);
      } else {
        logTest("MCP tool call - x_search", false, "Invalid response structure");
      }
    } catch (error) {
      logTest("MCP tool call - x_search", false, error instanceof Error ? error.message : "Unknown error");
    }

    // Test 5: Error handling - unknown method
    console.log("\n5. Testing error handling - unknown method...");
    try {
      const errorResponse = await fetch(MCP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "unknown/method",
        }),
      });

      const errorData = await errorResponse.json();
      
      if (errorData.error && errorData.error.code === -32601) {
        logTest("Error handling - unknown method", true);
      } else {
        logTest("Error handling - unknown method", false, "Expected method not found error");
      }
    } catch (error) {
      logTest("Error handling - unknown method", false, error instanceof Error ? error.message : "Unknown error");
    }

    // Test 6: Error handling - missing query
    console.log("\n6. Testing error handling - missing query parameter...");
    try {
      const errorResponse = await fetch(MCP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "x_search",
            arguments: {},
          },
        }),
      });

      const errorData = await errorResponse.json();
      
      if (errorData.result?.isError || errorData.error) {
        logTest("Error handling - missing query", true);
      } else {
        logTest("Error handling - missing query", false, "Should have returned error");
      }
    } catch (error) {
      logTest("Error handling - missing query", false, error instanceof Error ? error.message : "Unknown error");
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`\n📊 Test Results: ${passed}/${total} passed (${percentage}%)`);
    
    if (passed === total) {
      console.log("\n🎉 All tests passed!");
      process.exit(0);
    } else {
      console.log("\n⚠️  Some tests failed. Review errors above.");
      const failed = results.filter(r => !r.passed);
      console.log("\nFailed tests:");
      failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
      process.exit(1);
    }

  } catch (error) {
    console.error("\n💥 Test suite error:", error);
    process.exit(1);
  }
}

runTests();
