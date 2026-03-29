import { Resend } from "resend";
import { format } from "date-fns";
import { ACTIVITY_LABELS, ActivityType } from "@/types";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const APP_URL = process.env.APP_URL ?? "";
const OWNER_NAME = process.env.OWNER_NAME ?? "Hasan";
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "";
const PARTNER_EMAIL = process.env.PARTNER_EMAIL ?? "";
const PARTNER_NAME = process.env.PARTNER_NAME ?? "Lails";

interface BookingDetails {
  id: string;
  approvalToken: string;
  secretToken: string;
  title: string;
  activityType: ActivityType;
  start: Date;
  end: Date;
  bookedByName: string;
  bookedByEmail?: string;
  note?: string;
}

function formatSlot(start: Date, end: Date): string {
  return `${format(start, "EEEE, MMMM d")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
}

// ── Email to owner + partner when a new booking request comes in ──────────────
export async function sendBookingRequest(booking: BookingDetails) {
  const approveUrl = `${APP_URL}/approve/${booking.approvalToken}`;
  const rejectUrl = `${APP_URL}/reject/${booking.approvalToken}`;
  const slot = formatSlot(booking.start, booking.end);
  const activity = ACTIVITY_LABELS[booking.activityType];

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="margin-bottom:4px">New booking request</h2>
      <p style="color:#666;margin-top:0">${booking.bookedByName} wants to book time with you</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px 0;color:#666;width:120px">Activity</td><td style="padding:8px 0;font-weight:600">${activity}</td></tr>
        <tr><td style="padding:8px 0;color:#666">When</td><td style="padding:8px 0;font-weight:600">${slot}</td></tr>
        <tr><td style="padding:8px 0;color:#666">From</td><td style="padding:8px 0">${booking.bookedByName}${booking.bookedByEmail ? ` &lt;${booking.bookedByEmail}&gt;` : ""}</td></tr>
        ${booking.note ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Note</td><td style="padding:8px 0;font-style:italic">"${booking.note}"</td></tr>` : ""}
      </table>
      <div style="display:flex;gap:12px;margin-top:24px">
        <a href="${approveUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Approve</a>
        <a href="${rejectUrl}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-left:12px">Reject</a>
      </div>
      <p style="color:#999;font-size:12px;margin-top:32px">
        You can also manage this from the <a href="${APP_URL}/admin" style="color:#999">admin page</a>.
      </p>
    </div>
  `;

  const recipients = [OWNER_EMAIL, PARTNER_EMAIL].filter(Boolean);
  if (recipients.length === 0) return;

  await getResend().emails.send({
    from: `Calendar <bookings@${process.env.RESEND_DOMAIN ?? "resend.dev"}>`,
    to: recipients,
    subject: `📅 Booking request: ${activity} with ${booking.bookedByName}`,
    html,
  });
}

// ── Email to booker when approved ─────────────────────────────────────────────
export async function sendBookingApproved(booking: BookingDetails) {
  if (!booking.bookedByEmail) return;

  const cancelUrl = `${APP_URL}/cancel/${booking.secretToken}`;
  const slot = formatSlot(booking.start, booking.end);
  const activity = ACTIVITY_LABELS[booking.activityType];

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="margin-bottom:4px;color:#16a34a">Booking confirmed!</h2>
      <p style="color:#666;margin-top:0">${OWNER_NAME} (and ${PARTNER_NAME}) have approved your request.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px 0;color:#666;width:120px">Activity</td><td style="padding:8px 0;font-weight:600">${activity}</td></tr>
        <tr><td style="padding:8px 0;color:#666">When</td><td style="padding:8px 0;font-weight:600">${slot}</td></tr>
        <tr><td style="padding:8px 0;color:#666">With</td><td style="padding:8px 0">${OWNER_NAME}</td></tr>
      </table>
      <p style="color:#999;font-size:12px;margin-top:32px">
        Need to cancel? <a href="${cancelUrl}" style="color:#999">Click here</a> — please give as much notice as possible.
      </p>
    </div>
  `;

  await getResend().emails.send({
    from: `${OWNER_NAME} <bookings@${process.env.RESEND_DOMAIN ?? "resend.dev"}>`,
    to: booking.bookedByEmail,
    subject: `✅ Confirmed: ${activity} on ${format(booking.start, "MMM d")}`,
    html,
  });
}

// ── Email to booker when rejected ─────────────────────────────────────────────
export async function sendBookingRejected(booking: BookingDetails) {
  if (!booking.bookedByEmail) return;

  const bookUrl = APP_URL;
  const activity = ACTIVITY_LABELS[booking.activityType];
  const slot = formatSlot(booking.start, booking.end);

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="margin-bottom:4px">Booking not available</h2>
      <p style="color:#666;margin-top:0">Unfortunately ${OWNER_NAME} isn't able to make this one work.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px 0;color:#666;width:120px">Activity</td><td style="padding:8px 0">${activity}</td></tr>
        <tr><td style="padding:8px 0;color:#666">When</td><td style="padding:8px 0">${slot}</td></tr>
      </table>
      <a href="${bookUrl}" style="background:#18181b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-top:8px">Pick another time</a>
    </div>
  `;

  await getResend().emails.send({
    from: `${OWNER_NAME} <bookings@${process.env.RESEND_DOMAIN ?? "resend.dev"}>`,
    to: booking.bookedByEmail,
    subject: `Booking request: ${activity} on ${format(booking.start, "MMM d")}`,
    html,
  });
}
