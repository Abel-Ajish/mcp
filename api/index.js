import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("Missing GITHUB_TOKEN");

app.get("/", (req, res) => {
  res.json({
    tools: [
      { id: "list_repos", name: "List Repos", description: "List GitHub repos", inputs: { owner: { type: "string" } } },
      { id: "read_file", name: "Read File", description: "Read a file from repo", inputs: { owner: { type: "string" }, repo: { type: "string" }, path: { type: "string" } } }
    ]
  });
});

app.post("/", async (req, res) => {
  const { tool, input, call_id } = req.body;
  if (!tool || !input) return res.status(400).json({ error: "Missing tool or input" });

  const gh = async url => fetch(url, { headers: { Authorization: `token ${token}`, "User-Agent": "mcp-render-github" } });

  if (tool === "list_repos") {
    const r = await gh(`https://api.github.com/users/${input.owner}/repos`);
    return res.json({ call_id, output: await r.json() });
  }

  if (tool === "read_file") {
    const r = await gh(`https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.path}`);
    return res.json({ call_id, output: await r.json() });
  }

  return res.status(400).json({ error: "Unknown tool" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`MCP server running on port ${port}`));
