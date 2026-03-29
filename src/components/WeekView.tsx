"use client";

import { format, isSameDay, addWeeks, startOfWeek, eachDayOfInterval, addDays } from "date-fns";
import { AvailabilitySlot } from "@/types";

interface Props {
  slots: AvailabilitySlot[];
  weekOffset: number;
  onSlotClick: (slot: AvailabilitySlot) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am–11pm

export default function WeekView({ slots, weekOffset, onSlotClick }: Props) {
  const weekStart = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    weekOffset
  );
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  function getSlot(day: Date, hour: number): AvailabilitySlot | undefined {
    return slots.find((s) => {
      return isSameDay(s.start, day) && s.start.getHours() === hour;
    });
  }

  function slotBg(slot: AvailabilitySlot | undefined): string {
    if (!slot) return "bg-zinc-900";
    if (slot.status === "free" && slot.bookingCount === 0) return "bg-green-900/50 hover:bg-green-900/80 cursor-pointer";
    if (slot.status === "free" && slot.bookingCount > 0) return "bg-blue-900/50 hover:bg-blue-900/80 cursor-pointer";
    if (slot.status === "driver_duty") return "bg-amber-900/40";
    return "bg-red-900/40";
  }

  function slotLabel(slot: AvailabilitySlot | undefined): string {
    if (!slot) return "";
    if (slot.status === "driver_duty") return "Driving";
    if (slot.status === "busy") return "Busy";
    if (slot.bookingCount > 0) return `${slot.bookingCount} booked`;
    return "Free";
  }

  function slotDot(slot: AvailabilitySlot | undefined): string {
    if (!slot) return "";
    if (slot.status === "free") return "●";
    return "";
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid grid-cols-8 gap-1 mb-1">
          <div /> {/* time column */}
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {format(day, "EEE")}
              </div>
              <div
                className={`text-sm font-semibold mt-0.5 ${
                  isSameDay(day, new Date())
                    ? "text-white bg-zinc-700 rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                    : "text-zinc-300"
                }`}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="space-y-0.5">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-1 items-center">
              {/* Hour label */}
              <div className="text-right pr-2 text-xs text-zinc-600">
                {format(new Date().setHours(hour, 0), "ha")}
              </div>

              {/* Day cells */}
              {days.map((day) => {
                const slot = getSlot(day, hour);
                return (
                  <div
                    key={day.toISOString()}
                    className={`h-10 rounded-md text-xs flex items-center justify-center font-medium transition-colors ${slotBg(slot)}`}
                    onClick={() => slot?.isBookable && onSlotClick(slot)}
                    title={
                      slot
                        ? `${format(slot.start, "h:mm a")} — ${slotLabel(slot)}`
                        : undefined
                    }
                  >
                    {slot && (
                      <span
                        className={`text-[10px] ${
                          slot.status === "free"
                            ? slot.bookingCount > 0
                              ? "text-blue-300"
                              : "text-green-400"
                            : slot.status === "driver_duty"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {slotLabel(slot)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-900/50" /> Free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-900/50" /> Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-900/40" /> Driving
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-900/40" /> Busy
          </span>
        </div>
      </div>
    </div>
  );
}
