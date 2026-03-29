import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendBookingRequest } from "@/lib/email";
import { ActivityType } from "@/types";

const VALID_ACTIVITY_TYPES: ActivityType[] = [
  "food", "tennis", "pickleball", "coffee", "drinks", "social", "other",
];

// POST /api/bookings — create a pending booking request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, activityType, start, end, durationHours, bookedByName, bookedByEmail, note } = body;

    if (!title || !activityType || !start || !end || !bookedByName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!VALID_ACTIVITY_TYPES.includes(activityType)) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        title,
        activity_type: activityType,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration_hours: durationHours ?? 1,
        booked_by_name: bookedByName,
        booked_by_email: bookedByEmail ?? null,
        note: note ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[bookings] Insert error:", error);
      return NextResponse.json({ error: "Failed to save booking" }, { status: 500 });
    }

    // Send email notification (non-blocking — don't fail the booking if email fails)
    sendBookingRequest({
      id: data.id,
      approvalToken: data.approval_token,
      secretToken: data.secret_token,
      title: data.title,
      activityType: data.activity_type,
      start: startDate,
      end: endDate,
      bookedByName: data.booked_by_name,
      bookedByEmail: data.booked_by_email ?? undefined,
      note: data.note ?? undefined,
    }).catch((err) => console.error("[bookings] Email failed:", err));

    return NextResponse.json({
      booking: data,
      managementToken: data.secret_token,
    });
  } catch (err) {
    console.error("[bookings] POST error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// GET /api/bookings — admin only
export async function GET(request: NextRequest) {
  const adminKey = request.headers.get("x-admin-key");
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data });
}

// DELETE /api/bookings?token=SECRET — cancel via secret token
export async function DELETE(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("secret_token", token);

  if (error) return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  return NextResponse.json({ success: true });
}
