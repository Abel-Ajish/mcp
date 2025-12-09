
export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  const stream = new ReadableStream({
    start(controller) {
      function send(event, data) {
        controller.enqueue(
          `event: ${event}\n` +
          `data: ${JSON.stringify(data)}\n\n`
        );
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

      const interval = setInterval(() => {
        send("ping", { t: Date.now() });
      }, 15000);

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
