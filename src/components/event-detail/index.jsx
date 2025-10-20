import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EVENTS, seatsForEvent } from "../../data/events";
import { EVENTS, seatsForEvent } from "../../data/events";


export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const ev = useMemo(() => EVENTS.find(e => e.id === eventId), [eventId]);
  const [selected, setSelected] = useState([]);
  const taken = useMemo(() => getAssignedSeats(eventId), [eventId]);


  if (!ev) {
    return <div className="p-6 mt-12">Event not found.</div>;
  }

  const seats = seatsForEvent(eventId);
  const toggleSeat = (seatId) =>
    setSelected(prev => prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]);

  const studentDiscount = 0.2; // 20% demo discount
  const priceEach = ev.basePrice;
  const subtotal = selected.length * priceEach;

  const proceed = () => {
    // Save a "pending order" before navigating to checkout
    const pending = {
      eventId: ev.id,
      eventTitle: ev.title,
      startTime: ev.startTime,
      seats: selected,
      priceEach,
      subtotal,
      createdAt: Date.now()
    };
    localStorage.setItem("pendingOrder", JSON.stringify(pending));
    navigate("/checkout");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-12 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ev.title}</h1>
        <div className="text-gray-600">{new Date(ev.startTime).toLocaleString()}</div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Select seats</h2>
        <div className="grid grid-cols-6 gap-3">
          {seats.map(seat => {
            const isSelected = selected.includes(seat.id);
            // ...existing code...
            return (
              <button
                // ...existing props...
              >
                {seat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border rounded-xl p-4 flex items-center justify-between">
        <div className="text-sm">
          <div>Price per seat: ${priceEach.toFixed(2)}</div>
          <div className="text-gray-500">Student discount (demo): {Math.round(studentDiscount * 100)}% (applied at checkout)</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">Subtotal: ${subtotal.toFixed(2)}</div>
          <button
            disabled={selected.length === 0}
            onClick={proceed}
            className={`px-4 py-2 rounded-xl ${selected.length ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
