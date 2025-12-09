import fetch from "node-fetch";

export default async function handler(req) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing GITHUB_TOKEN" }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  // SSE for tool discovery
  if (req.method === "GET") {
    const stream = new ReadableStream({
      start(controller) {
        function send(event, data) {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }

        // Send MCP tools once
        send("mcp.tools", {
          tools: [
            { 
              id: "list_repos", 
              name: "List Repos", 
              description: "List GitHub repos", 
              inputs: { owner: { type: "string" } } 
            },
            { 
              id: "read_file", 
              name: "Read File", 
              description: "Read a file from repo", 
              inputs: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" } } 
            }
          ]
        });

        // Periodic ping every 15 seconds
        setInterval(() => send("ping", { t: Date.now() }), 15000);
      }
    });

    return new Response(stream, {
      headers: { 
        "Content-Type": "text/event-stream", 
        "Cache-Control": "no-cache, no-transform", 
        "Connection": "keep-alive" 
      }
    });
  }

  // POST requests for MCP tool calls
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const { tool, input, call_id } = body;

    if (!tool || !input) {
      return new Response(JSON.stringify({ error: "Missing tool or input" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    async function gh(url) {
      return fetch(url, { headers: { Authorization: `token ${token}`, "User-Agent": "mcp-vercel-github" } });
    }

    if (tool === "list_repos") {
      const r = await gh(`https://api.github.com/users/${input.owner}/repos`);
      const data = await r.json();
      return new Response(JSON.stringify({ call_id, output: data }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (tool === "read_file") {
      const r = await gh(`https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.path}`);
      const data = await r.json();
      return new Response(JSON.stringify({ call_id, output: data }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ error: "Unknown tool" }), { 
      status: 400, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
}
