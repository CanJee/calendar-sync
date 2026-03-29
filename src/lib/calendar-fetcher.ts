import ical from "node-ical";
import { CalendarEvent, CalendarSource, RsvpStatus } from "@/types";

// In-memory cache: avoids hammering iCal feeds on every request
const cache = new Map<string, { data: CalendarEvent[]; expires: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function webcalToHttps(url: string): string {
  return url.replace(/^webcal:\/\//i, "https://");
}

function parseRsvpStatus(partstat?: string): RsvpStatus {
  switch (partstat?.toUpperCase()) {
    case "ACCEPTED":
      return "accepted";
    case "DECLINED":
      return "declined";
    case "TENTATIVE":
      return "tentative";
    case "NEEDS-ACTION":
      return "needsAction";
    default:
      return "unknown";
  }
}

function extractRsvpForEmail(
  event: ical.VEvent,
  selfEmail: string
): RsvpStatus {
  if (!event.attendee) {
    // No attendee list = personal event, always accepted
    return "accepted";
  }

  const attendees = Array.isArray(event.attendee)
    ? event.attendee
    : [event.attendee];

  const self = attendees.find((a) => {
    const val = typeof a === "string" ? a : (a as any).val ?? "";
    const cn: string = (a as any).params?.CN ?? "";
    return (
      val.toLowerCase().includes(selfEmail.toLowerCase()) ||
      cn.toLowerCase() === selfEmail.toLowerCase()
    );
  });

  if (!self) return "accepted"; // not in attendee list = organizer or personal
  return parseRsvpStatus((self as any).params?.PARTSTAT);
}

export async function fetchCalendar(
  url: string,
  source: CalendarSource,
  selfEmail?: string
): Promise<CalendarEvent[]> {
  const cacheKey = `${source}:${url}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const httpsUrl = webcalToHttps(url);

  let rawEvents: ical.CalendarResponse;
  try {
    // Fetch text first so we can pass custom headers, then parse
    const res = await fetch(httpsUrl, {
      headers: { "User-Agent": "CalendarSync/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const icsText = await res.text();
    rawEvents = await ical.async.parseICS(icsText);
  } catch (err) {
    console.error(`[calendar-fetcher] Failed to fetch ${source}:`, err);
    return cache.get(cacheKey)?.data ?? []; // return stale cache on error
  }

  const events: CalendarEvent[] = [];

  for (const [, raw] of Object.entries(rawEvents)) {
    if (!raw || raw.type !== "VEVENT") continue;
    const v = raw as ical.VEvent;
    if (!v.start || !v.end) continue;

    const rsvpStatus = selfEmail
      ? extractRsvpForEmail(v, selfEmail)
      : "accepted";

    events.push({
      id: v.uid ?? `${source}-${v.start.toISOString()}`,
      title: (typeof v.summary === "string" ? v.summary : (v.summary as any)?.val) ?? "(No title)",
      start: new Date(v.start),
      end: new Date(v.end),
      source,
      owner: source.startsWith("lails") ? "lails" : "hasan",
      rsvpStatus,
      isAllDay: (v.start as any).dateOnly === true,
      location: typeof v.location === "string" ? v.location : (v.location as any)?.val,
      description: typeof v.description === "string" ? v.description : (v.description as any)?.val,
    });
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  cache.set(cacheKey, { data: events, expires: Date.now() + CACHE_TTL_MS });
  return events;
}

export async function fetchAllCalendars(): Promise<CalendarEvent[]> {
  const sources: Array<{
    url: string | undefined;
    source: CalendarSource;
    selfEmail?: string;
  }> = [
    {
      url: process.env.GOOGLE_CALENDAR_WORK_ICAL_URL,
      source: "hasan_work",
      selfEmail: "hasan.kanjee@flipp.com",
    },
    {
      url: process.env.GOOGLE_CALENDAR_PERSONAL_ICAL_URL,
      source: "hasan_personal",
      selfEmail: "hasan@kanjee.net",
    },
    {
      url: process.env.LAILS_SUNNYBROOK_ICAL_URL,
      source: "lails_sunnybrook",
    },
    {
      url: process.env.LAILS_PERSONAL_ICAL_URL,
      source: "lails_personal",
    },
  ];

  const results = await Promise.allSettled(
    sources
      .filter((s) => !!s.url)
      .map((s) => fetchCalendar(s.url!, s.source, s.selfEmail))
  );

  const allEvents: CalendarEvent[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allEvents.push(...result.value);
    } else {
      console.error("[calendar-fetcher] Calendar failed:", result.reason);
    }
  }

  return allEvents;
}
