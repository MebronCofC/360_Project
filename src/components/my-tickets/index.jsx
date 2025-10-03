import React, { useMemo } from "react";

export default function MyTickets() {
  const tickets = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("tickets") || "[]"); }
    catch { return []; }
  }, []);

  if (!tickets.length) {
    return <div className="max-w-3xl mx-auto p-6">No tickets yet.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-4">My Tickets</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {tickets.map(t => (
          <div key={t.id} className="border rounded-xl p-4">
            <div className="font-medium">{t.eventTitle}</div>
            <div className="text-gray-600 text-sm mb-2">{new Date(t.startTime).toLocaleString()}</div>
            <div className="text-sm">Seat: <span className="font-medium">{t.seatId}</span></div>
            <div className="text-xs text-gray-500 break-all mt-2">QR payload: {t.qrPayload}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
