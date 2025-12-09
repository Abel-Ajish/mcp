import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

// GET / -> MCP tools metadata (JSON)
app.get("/", (req, res) => {
  res.json({
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
        inputs: {
          owner: { type: "string" },
          repo: { type: "string" },
          path: { type: "string" }
        }
      }
    ]
  });
});

// POST / -> Execute MCP tools and return JSON
app.post("/", async (req, res) => {
  const { tool, input, call_id } = req.body;
  if (!tool || !input || !call_id) {
    return res.status(400).json({ error: "Missing tool, input, or call_id" });
  }

  try {
    let output;
    if (tool === "list_repos") {
      const r = await fetch(`https://api.github.com/users/${input.owner}/repos`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "mcp-json-github" }
      });
      output = await r.json();
    } else if (tool === "read_file") {
      const r = await fetch(`https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.path}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "mcp-json-github" }
      });
      output = await r.json();
    } else {
      return res.status(400).json({ call_id, error: "Unknown tool" });
    }

    // Return JSON immediately
    res.json({ call_id, output });
  } catch (err) {
    res.status(500).json({ call_id, error: err.message || "Server error" });
  }
});

app.listen(PORT, () => console.log(`MCP JSON server running on port ${PORT}`));
