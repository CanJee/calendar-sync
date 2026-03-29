"use client";

import { useState } from "react";
import { format, addMinutes } from "date-fns";
import {
  ActivityType,
  ACTIVITY_LABELS,
  AvailabilitySlot,
} from "@/types";

interface Props {
  slot: AvailabilitySlot;
  slots: AvailabilitySlot[]; // full list for duration validation
  onClose: () => void;
  onConfirm: () => void;
}

export default function BookingModal({ slot, slots, onClose, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("social");
  const [durationHours, setDurationHours] = useState<1 | 2>(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const end = addMinutes(slot.start, durationHours * 60);

  // Check if the second hour is also free (for 2hr validation)
  const secondHourSlot = slots.find(
    (s) => s.start.getTime() === addMinutes(slot.start, 60).getTime()
  );
  const twoHourAvailable = secondHourSlot?.isBookable === true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (durationHours === 2 && !twoHourAvailable) {
      setError("The second hour is not available. Please choose 1 hour or a different slot.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${ACTIVITY_LABELS[activityType]} with ${name}`,
          activityType,
          start: slot.start.toISOString(),
          end: end.toISOString(),
          durationHours,
          bookedByName: name,
          bookedByEmail: email || undefined,
          note: note || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-white mb-2">Request sent!</h2>
          <p className="text-zinc-400 text-sm mb-1">
            <span className="font-medium text-white">{ACTIVITY_LABELS[activityType]}</span>
          </p>
          <p className="text-zinc-400 text-sm mb-4">
            {format(slot.start, "EEEE, MMMM d")} · {format(slot.start, "h:mm a")} – {format(end, "h:mm a")}
          </p>
          <p className="text-zinc-500 text-xs mb-6">
            Your request is pending approval. {email ? "You'll get an email once it's confirmed." : "Check back to see if it's confirmed."}
          </p>
          <button
            onClick={onConfirm}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Request a slot</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              {format(slot.start, "EEEE, MMMM d")} · {format(slot.start, "h:mm a")}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity type */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">
              What are we doing?
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(ACTIVITY_LABELS) as [ActivityType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivityType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activityType === type
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              {([1, 2] as const).map((h) => {
                const unavailable = h === 2 && !twoHourAvailable;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={unavailable}
                    onClick={() => !unavailable && setDurationHours(h)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      durationHours === h
                        ? "bg-white text-black"
                        : unavailable
                        ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                    title={unavailable ? "Next hour is not available" : undefined}
                  >
                    {h}hr {unavailable && <span className="text-xs">✕</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">
              Ends at {format(end, "h:mm a")}
            </p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1.5">
              Your name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1.5">
              Email (optional — for confirmation)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-sm"
            />
          </div>

          {/* Note */}
          <div>
            <label htmlFor="note" className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1.5">
              Note (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything to add..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-sm resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending request..." : "Send booking request"}
          </button>
          <p className="text-center text-xs text-zinc-600">Pending approval before confirmed</p>
        </form>
      </div>
    </div>
  );
}
