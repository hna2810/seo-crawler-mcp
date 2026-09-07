import { spawn } from "child_process";
import path from "path";

const serverPath = path.resolve(__dirname, "../dist/index.js");
const child = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", "inherit"]
});

let buffer = "";

child.stdout.on("data", (data) => {
  buffer += data.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line.trim());
      console.log("[MCP Response received]:", msg.id, msg.result ? "SUCCESS" : "ERROR");
      if (msg.id === 2) {
        console.log("Tools count:", msg.result.tools.length);
        console.log("Tools list:", msg.result.tools.map((t: any) => t.name).join(", "));
        
        // Call classify tool
        send({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "classify_single_url_or_text",
            arguments: {
              title: "Dịch vụ tắm bé tại nhà Hà Nội giá bao nhiêu?"
            }
          }
        });
      } else if (msg.id === 3) {
        console.log("Classify result:\n", msg.result.content[0].text);
        console.log("\nMCP PROTOCOL TEST COMPLETED SUCCESSFULLY!");
        child.kill();
        process.exit(0);
      }
    } catch (err) {
      // not JSON
    }
  }
});

function send(req: any) {
  child.stdin.write(JSON.stringify(req) + "\n");
}

// 1. Initialize
send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" }
  }
});

// 2. List tools
send({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/list",
  params: {}
});
