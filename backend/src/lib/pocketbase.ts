import PocketBase from "pocketbase";

const PB_URL = process.env.PB_URL || "http://pocketbase:7070";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL!;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD!;

let pb: PocketBase | null = null;
let authExpiry = 0;

export async function getPB(): Promise<PocketBase> {
  const now = Date.now();
  if (!pb || now >= authExpiry) {
    pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    // Re-auth every 50 minutes (tokens last 60 min)
    authExpiry = now + 50 * 60 * 1000;
  }
  return pb;
}
