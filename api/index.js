import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

// GET / -> Return MCP tools metadata immediately
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

// POST / -> Handle MCP calls with SSE streaming
app.post("/", async (req, res) => {
  const { tool, input, call_id } = req.body;
  if (!tool || !input || !call_id) {
    return res.status(400).json({ error: "Missing tool, input, or call_id" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Helper to send SSE data
  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (tool === "list_repos") {
      const r = await fetch(`https://api.github.com/users/${input.owner}/repos`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "mcp-render-github" }
      });
      const data = await r.json();
      sendSSE({ call_id, output: data });
      res.end(); // Close the SSE stream
    } else if (tool === "read_file") {
      const r = await fetch(`https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.path}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "mcp-render-github" }
      });
      const data = await r.json();
      sendSSE({ call_id, output: data });
      res.end(); // Close the SSE stream
    } else {
      sendSSE({ call_id, error: "Unknown tool" });
      res.end();
    }
  } catch (err) {
    sendSSE({ call_id, error: err.message || "Server Error" });
    res.end();
  }
});

app.listen(PORT, () => console.log(`MCP server running on port ${PORT}`));
