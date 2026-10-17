import { json } from "@/server/http";
import { sessionCookie } from "@/server/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return json({ success: true }, 200, { "Set-Cookie": sessionCookie(req, "", 0) });
}
