"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function CancelPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleCancel() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/bookings?token=${token}`, {
        method: "DELETE",
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full text-center">
        {status === "done" ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-white mb-2">Booking cancelled</h1>
            <p className="text-zinc-400 text-sm">
              Your booking has been removed. Hope to see you another time!
            </p>
          </>
        ) : status === "error" ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
            <p className="text-zinc-400 text-sm">
              The booking could not be found or was already cancelled.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-white mb-2">Cancel booking</h1>
            <p className="text-zinc-400 text-sm mb-6">
              Are you sure you want to cancel this booking?
            </p>
            <button
              onClick={handleCancel}
              disabled={status === "loading"}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {status === "loading" ? "Cancelling..." : "Yes, cancel"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
