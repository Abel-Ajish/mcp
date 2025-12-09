
import fetch from "node-fetch";

export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  const { tool, input, call_id } = await req.json();

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing GITHUB_TOKEN" }),
      { status: 500 }
    );
  }

  async function gh(url) {
    return fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "mcp-vercel-github"
      }
    });
  }

  if (tool === "list_repos") {
    const owner = input.owner;
    const r = await gh(`https://api.github.com/users/${owner}/repos`);
    const data = await r.json();
    return json({ call_id, output: data });
  }

  if (tool === "read_file") {
    const { owner, repo, path } = input;
    const r = await gh(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    const j = await r.json();
    return json({ call_id, output: j });
  }

  return json({ error: "Unknown tool" }, 400);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
