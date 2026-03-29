"use client";

import { useState, useEffect, useCallback } from "react";
import { format, isSameDay, addWeeks, startOfWeek, addDays, eachDayOfInterval } from "date-fns";
import { CalendarEvent, ActivityType, ACTIVITY_LABELS } from "@/types";

const SOURCE_COLORS: Record<string, string> = {
  hasan_work: "bg-blue-900/60 border-blue-700",
  hasan_personal: "bg-purple-900/60 border-purple-700",
  lails_sunnybrook: "bg-rose-900/60 border-rose-700",
  lails_personal: "bg-orange-900/60 border-orange-700",
  booking: "bg-green-900/60 border-green-700",
};

const SOURCE_LABELS: Record<string, string> = {
  hasan_work: "Work",
  hasan_personal: "Personal",
  lails_sunnybrook: "Lails (Sunnybrook)",
  lails_personal: "Lails (Personal)",
  booking: "Booking",
};

interface BookingRow {
  id: string;
  title: string;
  activity_type: ActivityType;
  start_time: string;
  end_time: string;
  booked_by_name: string;
  booked_by_email: string | null;
  note: string | null;
  secret_token: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterSource, setFilterSource] = useState<string>("all");

  const loadData = useCallback(
    async (key: string) => {
      setLoading(true);
      setError("");
      try {
        const [eventsRes, bookingsRes] = await Promise.all([
          fetch("/api/events", { headers: { "x-admin-key": key } }),
          fetch("/api/bookings", { headers: { "x-admin-key": key } }),
        ]);

        if (eventsRes.status === 401) {
          setError("Invalid admin key.");
          setAuthenticated(false);
          return;
        }

        const eventsData = await eventsRes.json();
        const bookingsData = await bookingsRes.json();

        setEvents(
          eventsData.events.map((e: any) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          }))
        );
        setBookings(bookingsData.bookings ?? []);
        setAuthenticated(true);
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    loadData(adminKey);
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-white mb-6">Admin view</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin secret key"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-sm"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-white text-black font-semibold py-2.5 rounded-xl hover:bg-zinc-200 transition"
            >
              Enter
            </button>
          </form>
        </div>
      </main>
    );
  }

  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const allSources = [...new Set(events.map((e) => e.source))];

  const filteredEvents =
    filterSource === "all"
      ? events
      : events.filter((e) => e.source === filterSource);

  function eventsForDay(day: Date): CalendarEvent[] {
    return filteredEvents
      .filter((e) => isSameDay(e.start, day))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  function bookingsForDay(day: Date): BookingRow[] {
    return bookings
      .filter((b) => isSameDay(new Date(b.start_time), day))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Calendar admin</h1>
            <p className="text-zinc-500 text-sm mt-1">Full event view — private</p>
          </div>
          <button
            onClick={() => loadData(adminKey)}
            className="text-xs text-zinc-400 underline"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterSource("all")}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              filterSource === "all"
                ? "bg-white text-black font-semibold"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            All calendars
          </button>
          {allSources.map((src) => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                filterSource === src
                  ? "bg-white text-black font-semibold"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {SOURCE_LABELS[src] ?? src}
            </button>
          ))}
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm"
          >
            ← Prev
          </button>
          <span className="text-sm font-medium">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm"
          >
            Next →
          </button>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading...</p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const dayEvents = eventsForDay(day);
              const dayBookings = bookingsForDay(day);
              return (
                <div key={day.toISOString()} className="min-h-[200px]">
                  <div
                    className={`text-center pb-2 mb-2 border-b border-zinc-800 ${
                      isSameDay(day, new Date()) ? "text-white font-bold" : "text-zinc-400"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wider">
                      {format(day, "EEE")}
                    </div>
                    <div className="text-sm">{format(day, "d")}</div>
                  </div>

                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`rounded-md px-2 py-1 border text-[11px] ${
                          SOURCE_COLORS[event.source] ?? "bg-zinc-800 border-zinc-600"
                        }`}
                        title={`${event.title}\n${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}\nRSVP: ${event.rsvpStatus}`}
                      >
                        <div className="font-medium text-white truncate">
                          {event.title}
                        </div>
                        <div className="text-zinc-400">
                          {event.isAllDay
                            ? "All day"
                            : `${format(event.start, "h:mm")}–${format(event.end, "h:mma")}`}
                        </div>
                      </div>
                    ))}

                    {dayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-md px-2 py-1 border bg-green-900/60 border-green-700 text-[11px]"
                      >
                        <div className="font-medium text-white truncate">
                          {ACTIVITY_LABELS[booking.activity_type as ActivityType]}
                        </div>
                        <div className="text-green-300 truncate">
                          {booking.booked_by_name}
                        </div>
                        <div className="text-zinc-400">
                          {format(new Date(booking.start_time), "h:mm")}–
                          {format(new Date(booking.end_time), "h:mma")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bookings list */}
        {bookings.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-4">All bookings</h2>
            <div className="space-y-2">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="font-medium text-white">{b.title}</div>
                    <div className="text-sm text-zinc-400 mt-0.5">
                      {format(new Date(b.start_time), "EEE MMM d, h:mm a")} –{" "}
                      {format(new Date(b.end_time), "h:mm a")}
                    </div>
                    {b.note && (
                      <div className="text-xs text-zinc-500 mt-1 italic">
                        "{b.note}"
                      </div>
                    )}
                    {b.booked_by_email && (
                      <div className="text-xs text-zinc-500 mt-1">
                        {b.booked_by_email}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-zinc-600 font-mono shrink-0">
                    {b.secret_token.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
