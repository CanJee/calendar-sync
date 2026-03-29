"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function RejectPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    handleReject();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReject() {
    setStatus("loading");
    try {
      const res = await fetch("/api/bookings/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalToken: token }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full text-center">
        {status === "loading" && (
          <p className="text-zinc-400 text-sm">Processing...</p>
        )}
        {status === "done" && (
          <>
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-xl font-semibold text-white mb-2">Booking rejected</h1>
            <p className="text-zinc-400 text-sm">
              The requester has been notified and can pick another time.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-white mb-2">Already responded</h1>
            <p className="text-zinc-400 text-sm">
              This booking has already been approved or rejected.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
