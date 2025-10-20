import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { areAvailable, assignSeats } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext"; // to get currentUser?.uid


// simple base64 QR fallback (no deps) — encodes a text payload and displays it
function FakeQR({ value }) {
  // display the payload in a styled box as a stand-in for a QR image for the demo
  return (
    <div className="border rounded-xl p-3 bg-gray-50 text-xs break-all">
      {value}
    </div>
  );
}

export default function Checkout() {
  const { currentUser } = useAuth?.();
  const ownerUid = currentUser?.uid || null;
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  

  const pending = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("pendingOrder") || "null"); }
    catch { return null; }
  }, []);

  useEffect(() => {
    if (!pending) navigate("/events");
  }, [pending, navigate]);

  if (!pending) return null;

  const [orderId, setOrderId] = useState(null);
  const total = pending.subtotal * 0.8; // apply 20% demo student discount

  const confirm = () => {
     if (!currentUser?.uid) {
       alert("Please log in before purchasing tickets.");
       navigate("/login");
       return;
     }
  // 1) check for conflicts (already owned seats)
  const conflicts = areAvailable(pending.eventId, pending.seats);
    
  if (conflicts.length > 0) {
    alert(`Sorry, these seats are currently owned: ${conflicts.join(", ")}.\nPlease go back and pick different seats.`);
    return;
  }

  // 2) consistent IDs per seat
  const newOrderId = `ord_${Math.random().toString(36).slice(2,10)}`;
  const ticketIdBySeat = {};
  pending.seats.forEach(seatId => {
    ticketIdBySeat[seatId] = `t_${Math.random().toString(36).slice(2,10)}`;
  });

  // 3) assign seats to this user
  try {
    assignSeats(pending.eventId, pending.seats, ownerUid, ticketIdBySeat);
  } catch (e) {
    alert("One or more seats just got taken. Please reselect.");
    return;
  }

  // 4) create tickets for this user (local demo)
  const existing = JSON.parse(localStorage.getItem("tickets") || "[]");
  const newTickets = pending.seats.map(seatId => ({
    id: ticketIdBySeat[seatId],
    orderId: newOrderId,
    ownerUid,
    eventId: pending.eventId,
    eventTitle: pending.eventTitle,
    startTime: pending.startTime,
    seatId,
    qrPayload: `ticket:${newOrderId}:${seatId}:${pending.eventId}`,
    status: "Issued",
    createdAt: Date.now()
  }));
  const all = [...existing, ...newTickets];
  localStorage.setItem("tickets", JSON.stringify(all));
  localStorage.removeItem("pendingOrder");
  setOrderId(newOrderId);
  setSaved(true);
};


  return (
    <div className="max-w-3xl mx-auto p-6 mt-12 space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="border rounded-xl p-4">
        <div className="font-medium mb-2">{pending.eventTitle}</div>
        <div className="text-gray-600 mb-4">{new Date(pending.startTime).toLocaleString()}</div>
        <div className="text-sm text-gray-500 mb-2">Seats: {pending.seats.join(", ")}</div>
        <div className="text-sm">Total (demo w/discount): <span className="font-semibold">${total.toFixed(2)}</span></div>
      </div>

      {!saved ? (
        <button onClick={confirm} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
          Confirm Purchase
        </button>
      ) : (
        <div className="space-y-4">
          <div className="text-emerald-700 font-medium">Purchase complete — tickets issued.</div>
          <div className="text-sm text-gray-600">Example QR payload (one per seat):</div>
          <div className="grid grid-cols-2 gap-3">
            {JSON.parse(localStorage.getItem("tickets") || "[]")
              .filter(t => t.orderId === orderId)
              .map(t => (
                <div key={t.id} className="border rounded-xl p-3">
                  <div className="text-sm font-medium mb-2">{t.eventTitle} — {t.seatId}</div>
                  <FakeQR value={t.qrPayload} />
                </div>
              ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/my-tickets")} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
              Go to My Tickets
            </button>
            <button onClick={() => navigate("/events")} className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300">
              Back to Events
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
