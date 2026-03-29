import { addMinutes, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { CalendarEvent, AvailabilitySlot, SlotStatus } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TZ = "America/Toronto";

const LAILS_PRE_SHIFT_BUFFER_MINUTES = 30;  // block before drop-off
const LAILS_RETURN_HOME_MINUTES = 60;        // time to return home after drop-off/pick-up

const WORK_START_HOUR = 9;   // 9am Toronto
const WORK_END_HOUR = 15;    // 3pm Toronto

const BOOKING_START_HOUR = 7;   // 7am Toronto
const BOOKING_END_HOUR = 24;    // midnight Toronto (slots start up to 11pm)

const SLOT_DURATION_MINUTES = 60;

// ─── Work noise events (don't block personal availability) ───────────────────

const NOISE_PATTERNS = [
  /^focus time/i,
  /^no[- ]meeting/i,
  /^office hours/i,
  /^focus block/i,
  /^focus day/i,
  /^deep work/i,
];

// Work calendar events that indicate Hasan has the day off
const OFF_DAY_PATTERNS = [
  /long weekend/i,
  /extended long weekend/i,
  /\bday off\b/i,
  /\bvacation\b/i,
  /\bpto\b/i,
  /time off/i,
  /\bholiday\b/i,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNoiseEvent(event: CalendarEvent): boolean {
  if (event.source !== "hasan_work") return false;
  return NOISE_PATTERNS.some((p) => p.test(event.title));
}

function isOffDayEvent(event: CalendarEvent): boolean {
  if (event.source !== "hasan_work") return false;
  // Company-wide off-day events are often informational — treat as day off
  // unless explicitly declined.
  if (event.rsvpStatus === "declined") return false;
  return OFF_DAY_PATTERNS.some((p) => p.test(event.title));
}

function isVirtualShift(event: CalendarEvent): boolean {
  return (
    /virtual/i.test(event.title) ||
    /virtual/i.test(event.description ?? "") ||
    /virtual/i.test(event.location ?? "")
  );
}

function intervalsOverlap(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Convert a local-time Date (with Toronto hours set) to a real UTC timestamp */
function torontoHourToUTC(dateInToronto: Date, hour: number): Date {
  const d = new Date(dateInToronto);
  d.setHours(hour, 0, 0, 0);
  return fromZonedTime(d, TZ);
}

// ─── Main exports ─────────────────────────────────────────────────────────────

interface BusyBlock {
  start: Date;
  end: Date;
  type: SlotStatus;
}

export function computeBusyBlocks(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): BusyBlock[] {
  const blocks: BusyBlock[] = [];

  // 1. Collect accepted off-days from the work calendar (in Toronto dates)
  const offDays = new Set<string>(); // "yyyy-MM-dd" in Toronto time
  for (const event of events) {
    if (!isOffDayEvent(event)) continue;
    const startLocal = toZonedTime(event.start, TZ);
    const endLocal = toZonedTime(event.end, TZ);
    startLocal.setHours(0, 0, 0, 0);
    endLocal.setHours(0, 0, 0, 0);
    const cursor = new Date(startLocal);
    while (cursor <= endLocal) {
      offDays.add(format(cursor, "yyyy-MM-dd"));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // 2. Add default 9am–3pm work blocks for weekdays that aren't off days.
  //    All comparisons done in Toronto local time.
  const rangeStartLocal = toZonedTime(rangeStart, TZ);
  rangeStartLocal.setHours(0, 0, 0, 0);
  const dayCursor = new Date(rangeStartLocal);

  while (fromZonedTime(dayCursor, TZ) < rangeEnd) {
    const dow = dayCursor.getDay(); // 0=Sun, 6=Sat — in Toronto time
    const dateKey = format(dayCursor, "yyyy-MM-dd");

    if (dow !== 0 && dow !== 6 && !offDays.has(dateKey)) {
      blocks.push({
        start: torontoHourToUTC(dayCursor, WORK_START_HOUR),
        end: torontoHourToUTC(dayCursor, WORK_END_HOUR),
        type: "busy",
      });
    }
    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  // 3. Process individual calendar events
  for (const event of events) {
    if (event.isAllDay) continue;
    if (isNoiseEvent(event)) continue;

    if (
      (event.source === "hasan_work" || event.source === "hasan_personal") &&
      (event.rsvpStatus === "declined" || event.rsvpStatus === "needsAction")
    ) {
      continue;
    }

    // ── Lails' Sunnybrook shifts ────────────────────────────────────────────
    if (event.source === "lails_sunnybrook") {
      if (isVirtualShift(event)) continue;

      // Drop-off window: (shift_start - 30min) → (shift_start + 60min)
      blocks.push({
        start: addMinutes(event.start, -LAILS_PRE_SHIFT_BUFFER_MINUTES),
        end: addMinutes(event.start, LAILS_RETURN_HOME_MINUTES),
        type: "driver_duty",
      });

      // Pick-up window: (shift_end - 30min) → (shift_end + 60min)
      blocks.push({
        start: addMinutes(event.end, -LAILS_PRE_SHIFT_BUFFER_MINUTES),
        end: addMinutes(event.end, LAILS_RETURN_HOME_MINUTES),
        type: "driver_duty",
      });

      continue;
    }

    // ── Lails' personal events ──────────────────────────────────────────────
    if (event.source === "lails_personal") continue;

    // ── Hasan's own events ──────────────────────────────────────────────────
    blocks.push({ start: event.start, end: event.end, type: "busy" });
  }

  return blocks;
}

export function generateAvailabilitySlots(
  events: CalendarEvent[],
  bookings: Array<{ start: Date; end: Date }>,
  rangeStart: Date,
  rangeEnd: Date,
): AvailabilitySlot[] {
  const busyBlocks = computeBusyBlocks(events, rangeStart, rangeEnd);

  const slots: AvailabilitySlot[] = [];
  const cursor = new Date(rangeStart);
  cursor.setMinutes(0, 0, 0);

  while (cursor < rangeEnd) {
    const slotEnd = addMinutes(cursor, SLOT_DURATION_MINUTES);

    // Check hour in Toronto local time (not UTC)
    const cursorLocal = toZonedTime(cursor, TZ);
    const hour = cursorLocal.getHours();

    if (hour >= BOOKING_START_HOUR && hour < BOOKING_END_HOUR) {
      const overlappingBlocks = busyBlocks.filter((b) =>
        intervalsOverlap(cursor, slotEnd, b.start, b.end)
      );

      const bookingCount = bookings.filter((b) =>
        intervalsOverlap(cursor, slotEnd, b.start, b.end)
      ).length;

      let status: SlotStatus = "free";
      if (overlappingBlocks.length > 0) {
        status = overlappingBlocks.some((b) => b.type === "driver_duty")
          ? "driver_duty"
          : "busy";
      }

      slots.push({
        start: new Date(cursor),
        end: new Date(slotEnd),
        status,
        isBookable: status === "free",
        bookingCount,
      });
    }

    cursor.setTime(cursor.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
  }

  return slots;
}
