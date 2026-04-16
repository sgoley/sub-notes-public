/**
 * Creates PocketBase collections on first run via the Admin REST API.
 * Safe to call on every startup — skips collections that already exist.
 */
import PocketBase from "pocketbase";

const AUTODATE_FIELD = { name: "created_at", type: "autodate", onCreate: true, onUpdate: false };

const COLLECTIONS = [
  {
    name: "subscriptions",
    type: "base",
    fields: [
      AUTODATE_FIELD,
      { name: "source_type", type: "text", required: true },
      { name: "source_id", type: "text", required: true },
      { name: "source_title", type: "text", required: true },
      { name: "source_url", type: "url" },
      { name: "thumbnail_url", type: "url" },
      { name: "enabled", type: "bool" },
      { name: "last_checked_at", type: "date" },
      { name: "metadata", type: "json" },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  },
  {
    name: "content_summaries",
    type: "base",
    // Note: subscription_id relation is added after subscriptions is created
    fields: [
      AUTODATE_FIELD,
      { name: "subscription_id", type: "text" }, // stored as text ref, resolved in queries
      { name: "content_type", type: "text", required: true },
      { name: "content_id", type: "text", required: true },
      { name: "content_title", type: "text", required: true },
      { name: "content_url", type: "url" },
      { name: "author", type: "text" },
      { name: "thumbnail_url", type: "url" },
      { name: "transcript", type: "text", max: 10000000 },
      { name: "summary_markdown", type: "text", max: 10000000 },
      { name: "highlights", type: "json" },
      {
        name: "status",
        type: "select",
        required: true,
        values: ["pending", "processing", "completed", "failed"],
        maxSelect: 1,
      },
      { name: "error_message", type: "text", max: 10000000 },
      { name: "summary_style", type: "text" },
      { name: "content_duration_seconds", type: "number" },
      { name: "sync_status", type: "json" },
      { name: "metadata", type: "json" },
      { name: "published_at", type: "date" },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  },
  {
    name: "tags",
    type: "base",
    fields: [
      AUTODATE_FIELD,
      { name: "name", type: "text", required: true },
      { name: "slug", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "color", type: "text" },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  },
  {
    name: "content_summary_tags",
    type: "base",
    fields: [
      AUTODATE_FIELD,
      { name: "content_summary_id", type: "text", required: true },
      { name: "tag_id", type: "text", required: true },
      { name: "confidence", type: "number" },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  },
  {
    name: "settings",
    type: "base",
    fields: [
      AUTODATE_FIELD,
      { name: "key", type: "text", required: true },
      { name: "value", type: "json" },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  },
];

// The JS SDK ignores 'max' on text fields during collection creation, so we
// patch long-text fields directly via the REST API after creation.
const LONG_TEXT_FIELDS: Record<string, string[]> = {
  content_summaries: ["transcript", "summary_markdown", "error_message"],
};
const LONG_TEXT_MAX = 10_000_000;

async function patchCollection(pb: PocketBase, collectionName: string): Promise<void> {
  const col = await pb.collections.getOne(collectionName);
  const existingFields = col.fields as Record<string, unknown>[];

  // Fix long-text field limits
  const longTextNames = LONG_TEXT_FIELDS[collectionName] ?? [];
  let updated = existingFields.map((f: Record<string, unknown>) =>
    longTextNames.includes(f.name as string) ? { ...f, max: LONG_TEXT_MAX } : f
  );

  // Add created_at autodate if missing
  const hasCreatedAt = updated.some((f) => f.name === "created_at");
  if (!hasCreatedAt) {
    updated = [AUTODATE_FIELD, ...updated];
    console.log(`[bootstrap] Adding created_at to ${collectionName}`);
  }

  await pb.collections.update(col.id, { fields: updated });
  if (longTextNames.length > 0) {
    console.log(`[bootstrap] Patched long-text fields in ${collectionName}`);
  }
}

export async function bootstrapCollections(pb: PocketBase): Promise<void> {
  // Fetch existing collections
  const existing = await pb.collections.getFullList();
  const existingNames = new Set(existing.map((c) => c.name));

  let created = 0;
  for (const schema of COLLECTIONS) {
    if (existingNames.has(schema.name)) continue;

    try {
      await pb.collections.create(schema);
      console.log(`[bootstrap] Created collection: ${schema.name}`);
      created++;

      // Patch text field limits and add created_at (SDK ignores these during creation)
      await patchCollection(pb, schema.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "already exists" is fine — another instance may have beaten us
      if (!msg.includes("already exists")) {
        console.error(`[bootstrap] Failed to create ${schema.name}:`, msg);
      }
    }
  }

  // Always patch all existing collections (fixes limits + adds created_at if missing)
  for (const schema of COLLECTIONS) {
    if (existingNames.has(schema.name)) {
      try {
        await patchCollection(pb, schema.name);
      } catch {
        // ignore — collection may not need patching
      }
    }
  }

  if (created === 0) {
    console.log("[bootstrap] All collections already exist — skipping.");
  } else {
    console.log(`[bootstrap] Created ${created} collection(s).`);
  }
}
