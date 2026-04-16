import { getPB } from "../lib/pocketbase.ts";

export async function handleSettings(req: Request): Promise<Response> {
  const pb = await getPB();

  if (req.method === "GET") {
    const records = await pb.collection("settings").getFullList();
    const settings: Record<string, unknown> = {};
    for (const rec of records) {
      settings[rec.key as string] = rec.value;
    }
    return json(settings);
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      try {
        const existing = await pb
          .collection("settings")
          .getFirstListItem(`key = "${key}"`);
        await pb.collection("settings").update(existing.id, { value });
      } catch {
        await pb.collection("settings").create({ key, value });
      }
    }
    return json({ success: true });
  }

  return error("Method not allowed", 405);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function error(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
