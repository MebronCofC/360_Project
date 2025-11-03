import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EVENTS, seatsForEvent } from "../../data/events";
import { getAssignedSeats } from "../../data/seatAssignments";

export default function EventDetail() {
  const { eventId, sectionId } = useParams();
  const navigate = useNavigate();

  const ev = useMemo(() => EVENTS.find((e) => e.id === eventId), [eventId]);
  const seats = useMemo(() => {
  const all = seatsForEvent(eventId);
  if (!sectionId) return all;
  // Filter seats that start with the chosen section letter, e.g., "A1", "B3"
  return all.filter(s => s.id.startsWith(sectionId));
  }, [eventId, sectionId]);

  // Seats already taken for this event (Set of seatIds)
  const taken = useMemo(() => getAssignedSeats(eventId), [eventId]);

  // User’s current selections (array of seatIds)
  const [selected, setSelected] = useState([]);

  if (!ev) {
    return <div className="p-6 mt-12">Event not found.</div>;
  }

  const toggleSeat = (seatId) => {
    // Guard: do nothing if seat is already taken
    if (taken.has(seatId)) return;

    setSelected((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  const priceEach = ev.basePrice;
  const studentDiscount = 0.2; // 20% demo discount (applied in checkout)
  const subtotal = selected.length * priceEach;

  const proceed = () => {
    // Save a "pending order" before navigating to checkout
    const pending = {
      eventId: ev.id,
      eventTitle: ev.title,
      startTime: ev.startTime,
      seats: selected,          // array of seatIds
      priceEach,                // base price
      subtotal,                 // before discount; checkout will apply studentDiscount
      createdAt: Date.now(),
    };

    try {
      localStorage.setItem("pendingOrder", JSON.stringify(pending));
    } catch {
      // best effort; if localStorage fails, still attempt navigation
    }

    navigate("/checkout");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-12">
      {sectionId && (
  <div className="mb-4 text-sm">
    <span className="mr-2 text-gray-600">Selected Section:</span>
    <span className="inline-block px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium">{sectionId}</span>
    </div>
      )}
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/events")}
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          ← Back to Events
        </button>
        <h1 className="text-2xl font-semibold mt-2">{ev.title}</h1>
        <div className="text-sm text-gray-500">
          {new Date(ev.startTime).toLocaleString()} • {ev.venueId}
        </div>
      </div>

      {/* Seating legend */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 inline-block rounded border bg-white" /> Available
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 inline-block rounded border bg-gray-200" /> Taken
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 inline-block rounded border bg-yellow-100" /> Selected
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 inline-block rounded border bg-blue-50" /> ADA
        </span>
      </div>

      {/* Seats grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {seats.map((seat) => {
          const isTaken = taken.has(seat.id);
          const isSelected = selected.includes(seat.id);

          return (
            <button
              key={seat.id}
              disabled={isTaken}
              onClick={() => toggleSeat(seat.id)}
              className={[
                "px-3 py-2 rounded-lg border text-sm transition-colors",
                isTaken
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "hover:bg-indigo-50",
                isSelected ? "ring-2 ring-indigo-500 bg-yellow-100" : "",
                seat.isAda ? "bg-blue-50" : "",
              ].join(" ")}
              aria-label={`Seat ${seat.label}${seat.isAda ? " (ADA)" : ""}${
                isTaken ? " (Taken)" : ""
              }`}
            >
              {seat.label}
            </button>
          );
        })}
      </div>

      {/* Summary / actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <div>Price each: ${priceEach.toFixed(2)}</div>
          <div>Seats selected: {selected.length}</div>
          <div>
            Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="text-xs text-gray-500">
            (Student demo discount {Math.round(studentDiscount * 100)}% is applied at
            checkout)
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
            className={`px-4 py-2 rounded-xl border ${
              selected.length === 0
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "hover:bg-gray-50"
            }`}
          >
            Clear
          </button>

          <button
            disabled={selected.length === 0}
            onClick={proceed}
            className={`px-4 py-2 rounded-xl ${
              selected.length
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
