import { handleSubscriptions } from "./routes/subscriptions.ts";
import { handleProcess } from "./routes/process.ts";
import { handleGenerateSummary } from "./routes/generateSummary.ts";
import { handleObsidianSync } from "./routes/obsidian.ts";
import { handleSettings } from "./routes/settings.ts";
import { getPB } from "./lib/pocketbase.ts";
import { bootstrapCollections } from "./lib/bootstrap.ts";

const PORT = parseInt(process.env.PORT || "3333");

// Bootstrap collections on startup (no-op if they already exist)
getPB()
  .then((pb) => bootstrapCollections(pb))
  .catch((err) => console.error("[bootstrap] Error:", err.message));

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function addCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, headers });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    let res: Response;

    try {
      if (path === "/api/subscriptions" || path.startsWith("/api/subscriptions/")) {
        res = await handleSubscriptions(req);
      } else if (path === "/api/process") {
        res = await handleProcess(req);
      } else if (path.startsWith("/api/generate-summary/")) {
        const id = path.split("/api/generate-summary/")[1];
        res = await handleGenerateSummary(req, id);
      } else if (path.startsWith("/api/sync/obsidian/")) {
        const id = path.split("/api/sync/obsidian/")[1];
        res = await handleObsidianSync(req, id);
      } else if (path === "/api/settings") {
        res = await handleSettings(req);
      } else if (path === "/health") {
        res = new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        res = new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("[server] Unhandled error:", err);
      res = new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return addCors(res);
  },
});

console.log(`Backend running on port ${PORT}`);
