
import fetch from "node-fetch";

export default async function handler(req) {
  if (req.method === "GET") {
    // SSE endpoint
    const stream = new ReadableStream({
      start(controller) {
        function send(event, data) {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }

        send("mcp.tools", {
          tools: [
            {
              id: "list_repos",
              name: "List GitHub repositories",
              description: "Lists public repositories for a user.",
              inputs: {
                type: "object",
                properties: { owner: { type: "string" } },
                required: ["owner"]
              }
            },
            {
              id: "read_file",
              name: "Read GitHub file",
              description: "Reads a file from a repository.",
              inputs: {
                type: "object",
                properties: {
                  owner: { type: "string" },
                  repo: { type: "string" },
                  path: { type: "string" }
                },
                required: ["owner", "repo", "path"]
              }
            }
          ]
        });

        const interval = setInterval(() => send("ping", { t: Date.now() }), 15000);

        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
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

  if (req.method === "POST") {
    const { tool, input, call_id } = await req.json();
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing GITHUB_TOKEN" }), { status: 500 });
    }

    async function gh(url) {
      return fetch(url, { headers: { Authorization: `token ${token}`, "User-Agent": "mcp-vercel-github" } });
    }

    if (tool === "list_repos") {
      const r = await gh(`https://api.github.com/users/${input.owner}/repos`);
      const data = await r.json();
      return new Response(JSON.stringify({ call_id, output: data }), { headers: { "Content-Type": "application/json" } });
    }

    if (tool === "read_file") {
      const r = await gh(`https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.path}`);
      const data = await r.json();
      return new Response(JSON.stringify({ call_id, output: data }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown tool" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method Not Allowed", { status: 405 });
}
