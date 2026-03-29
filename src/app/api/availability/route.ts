import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, addWeeks } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { fetchAllCalendars } from "@/lib/calendar-fetcher";
import { generateAvailabilitySlots } from "@/lib/availability-engine";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weeksAhead = Math.min(parseInt(searchParams.get("weeks") ?? "4"), 8);

    const tz = "America/Toronto";
    // Get Monday 00:00 in Toronto time, expressed as a UTC timestamp
    const nowLocal = toZonedTime(new Date(), tz);
    const weekStartLocal = startOfWeek(nowLocal, { weekStartsOn: 1 });
    weekStartLocal.setHours(0, 0, 0, 0);
    const rangeStart = fromZonedTime(weekStartLocal, tz);
    const rangeEnd = addWeeks(rangeStart, weeksAhead);

    const events = await fetchAllCalendars();

    // Fetch existing bookings for the range
    const { data: bookingRows, error } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .gte("start_time", rangeStart.toISOString())
      .lte("end_time", rangeEnd.toISOString());

    if (error) {
      console.error("[availability] Supabase error:", error);
    }

    const bookings = (bookingRows ?? []).map((b) => ({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
    }));

    const slots = generateAvailabilitySlots(events, bookings, rangeStart, rangeEnd);

    return NextResponse.json({ slots, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[availability] Error:", err);
    return NextResponse.json(
      { error: "Failed to compute availability" },
      { status: 500 }
    );
  }
}
