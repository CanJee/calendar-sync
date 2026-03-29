"use client";

import { useState, useEffect } from "react";
import { addWeeks, startOfWeek, format } from "date-fns";
import WeekView from "@/components/WeekView";
import BookingModal from "@/components/BookingModal";
import { AvailabilitySlot } from "@/types";

export default function HomePage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/availability?weeks=4");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSlots(
        data.slots.map((s: any) => ({
          ...s,
          start: new Date(s.start),
          end: new Date(s.end),
        }))
      );
    } catch {
      setError("Could not load availability. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  const weekStart = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    weekOffset
  );
  const weekEnd = addWeeks(weekStart, 1);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Book time with Hasan</h1>
          <p className="text-zinc-400 mt-2 text-sm">
            Click any <span className="text-green-400 font-medium">green</span> slot to book — or{" "}
            <span className="text-blue-400 font-medium">blue</span> if you want to stack with existing plans.
          </p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition"
          >
            ← Prev
          </button>
          <span className="text-sm font-medium text-zinc-200">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </span>
          <button
            onClick={() => setWeekOffset((w) => Math.min(3, w + 1))}
            disabled={weekOffset === 3}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition"
          >
            Next →
          </button>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
            Loading availability...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 mb-3">{error}</p>
              <button
                onClick={fetchAvailability}
                className="text-sm text-zinc-400 underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <WeekView
            slots={slots}
            weekOffset={weekOffset}
            onSlotClick={setSelectedSlot}
          />
        )}

        {/* Booking modal */}
        {selectedSlot && (
          <BookingModal
            slot={selectedSlot}
            slots={slots}
            onClose={() => setSelectedSlot(null)}
            onConfirm={() => {
              setSelectedSlot(null);
              fetchAvailability();
            }}
          />
        )}
      </div>
    </main>
  );
}
