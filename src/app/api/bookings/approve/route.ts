import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendBookingApproved } from "@/lib/email";
import { ActivityType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { approvalToken } = await request.json();
    if (!approvalToken) {
      return NextResponse.json({ error: "Missing approval token" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "approved", responded_at: new Date().toISOString() })
      .eq("approval_token", approvalToken)
      .eq("status", "pending")
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Booking not found or already responded to" },
        { status: 404 }
      );
    }

    sendBookingApproved({
      id: data.id,
      approvalToken: data.approval_token,
      secretToken: data.secret_token,
      title: data.title,
      activityType: data.activity_type as ActivityType,
      start: new Date(data.start_time),
      end: new Date(data.end_time),
      bookedByName: data.booked_by_name,
      bookedByEmail: data.booked_by_email ?? undefined,
      note: data.note ?? undefined,
    }).catch((err) => console.error("[approve] Email failed:", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[approve] Error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
