import { NextRequest, NextResponse } from "next/server";
import { fetchAllCalendars } from "@/lib/calendar-fetcher";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/events — admin only: full event details for admin view
export async function GET(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await fetchAllCalendars();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .order("start_time", { ascending: true });

  return NextResponse.json({ events, bookings: bookings ?? [] });
}
