export default async function handler(req) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing GITHUB_TOKEN" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    if (req.method === "GET") {
      // Return tools immediately as JSON
      return new Response(JSON.stringify({
        tools: [
          { id: "list_repos", name: "List Repos", description: "List GitHub repos", inputs: { owner: { type: "string" } } },
          { id: "read_file", name: "Read File", description: "Read a file from repo", inputs: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" } } }
        ]
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { tool, input, call_id } = body;

      if (!tool || !input) {
        return new Response(JSON.stringify({ error: "Missing tool or input" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }

      // Use native fetch
      const ghFetch = async (url) => fetch(url, {
        headers: { Authorization: `token ${token}`, "User-Agent": "mcp-vercel-github" }
      });

      if (tool === "list_repos") {
        const res = await ghFetch(`https://api.github.com/users/${input.owner}/repos`);
        const data = await res.json();
        return new Response(JSON.stringify({ call_id, output: data }), { headers: { "Content-Type": "application/json" } });
      }

      if (tool === "read_file") {
        const res = await ghFetch(`https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.path}`);
        const data = await res.json();
        return new Response(JSON.stringify({ call_id, output: data }), { headers: { "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "Unknown tool" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Server Error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
