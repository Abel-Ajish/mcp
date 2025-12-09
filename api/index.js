import fetch from "node-fetch";

export default async function handler(req) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing GITHUB_TOKEN" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // GET: return tools immediately as JSON
    if (req.method === "GET") {
      return new Response(JSON.stringify({
        tools: [
          { id: "list_repos", name: "List Repos", description: "List GitHub repos", inputs: { owner: { type: "string" } } },
          { id: "read_file", name: "Read File", description: "Read a file from repo", inputs: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" } } }
        ]
      }), { headers: { "Content-Type": "application/json" } });
    }

    // POST: handle MCP tool calls
    if (req.method === "POST") {
      let body;
      try { body = await req.json(); } 
      catch { 
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); 
      }

      const { tool, input, call_id } = body;
      if (!tool || !input) {
        return new Response(JSON.stringify({ error: "Missing tool or input" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }

      const gh = async url => fetch(url, { headers: { Authorization: `token ${token}`, "User-Agent": "mcp-vercel-github" } });

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

    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    // Catch all errors and return immediately
    return new Response(JSON.stringify({ error: err.message || "Server Error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
