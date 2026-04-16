const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3333";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? "GET";
  console.log(`[api] ${method} ${path}`);
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
  } catch (err) {
    console.error(`[api] ${method} ${path} → connection failed (backend unreachable or CORS):`, err);
    throw new Error(`Connection error: backend unreachable at ${BACKEND_URL}${path}`);
  }
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error || `Request failed: ${res.status}`;
    console.error(`[api] ${method} ${path} → ${res.status} ERROR:`, msg);
    throw new Error(msg);
  }
  console.log(`[api] ${method} ${path} → ${res.status}`, data);
  return data as T;
}

export async function addSubscription(sourceUrl: string, sourceType: "youtube" | "substack" = "youtube") {
  return request("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify({ sourceUrl, sourceType }),
  });
}

export async function deleteSubscription(id: string) {
  return request(`/api/subscriptions/${id}`, { method: "DELETE" });
}

export async function updateSubscription(id: string, data: Record<string, unknown>) {
  return request(`/api/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function processContent(contentUrl: string, summaryStyle = "balanced") {
  return request("/api/process", {
    method: "POST",
    body: JSON.stringify({ contentUrl, summaryStyle }),
  });
}

export async function syncObsidian(summaryId: string) {
  return request(`/api/sync/obsidian/${summaryId}`, { method: "POST" });
}

export async function getSettings(): Promise<Record<string, unknown>> {
  return request("/api/settings");
}

export async function updateSettings(settings: Record<string, unknown>) {
  return request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
