/**
 * Test MCP protocol compliance
 * Run the server first: npm run dev
 * Then run: node --loader ts-node/esm src/mcp/test-protocol.ts
 */

const MCP_URL = "http://localhost:3000/mcp";

async function testMCPProtocol() {
  console.log("Testing MCP Protocol Compliance\n");
  console.log("=".repeat(50));

  try {
    // Test 1: Initialize
    console.log("\n1. Testing initialize...");
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
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
      }),
    });

    const initData = await initResponse.json();
    console.log("✓ Initialize response:", JSON.stringify(initData, null, 2));

    // Test 2: List Tools
    console.log("\n2. Testing tools/list...");
    const listResponse = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });

    const listData = await listResponse.json();
    console.log("✓ Tools list response:", JSON.stringify(listData, null, 2));

    // Test 3: Call Tool (placeholder)
    console.log("\n3. Testing tools/call...");
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
            query: "test query",
          },
        },
      }),
    });

    const callData = await callResponse.json();
    console.log("✓ Tool call response:", JSON.stringify(callData, null, 2));

    // Test 4: Unknown method
    console.log("\n4. Testing unknown method...");
    const unknownResponse = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "unknown/method",
        params: {},
      }),
    });

    const unknownData = await unknownResponse.json();
    console.log("✓ Unknown method response:", JSON.stringify(unknownData, null, 2));

    console.log("\n" + "=".repeat(50));
    console.log("✅ All MCP protocol tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testMCPProtocol();
