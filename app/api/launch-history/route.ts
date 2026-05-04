import { NextResponse } from "next/server";
import { MOCK_LAUNCH_HISTORY } from "@/lib/mock";

// GET /api/launch-history
// ─────────────────────────────────────────────────────────────────────────────
// MVP: returns the static mock history from /lib/mock.ts.
//
// REAL INTEGRATION (later):
//   • Authenticated request → SELECT * FROM launches WHERE owner_id = auth.uid()
//   • RLS in Supabase ensures the user only sees their own launches.
//   • Pagination via cursor (created_at, id).
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    ok: true,
    mock: true,
    launches: MOCK_LAUNCH_HISTORY,
  });
}
