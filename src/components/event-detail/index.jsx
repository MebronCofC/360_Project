import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getEvents, seatsForEvent, getSeatsForEvent, addSeatToEvent, removeSeatFromEvent, updateSeatForEvent } from "../../data/events";
import { assignSeats, getAssignedSeats } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const sectionNumber = searchParams.get("section");

  const [loading, setLoading] = useState(true);
  const [ev, setEv] = useState(null);
  const [seats, setSeats] = useState([]);
  const [adminSeats, setAdminSeats] = useState([]);
  const [taken, setTaken] = useState(new Set());
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const events = await getEvents();
        const event = events.find((e) => e.id === eventId);
        setEv(event || null);
        if (event) {
          const eventSeats = await seatsForEvent(eventId);
          setSeats(eventSeats);
          if (isAdmin) {
            const allSeats = await getSeatsForEvent(eventId);
            setAdminSeats(allSeats);
          }
          const takenSeats = await getAssignedSeats(eventId);
          setTaken(takenSeats || new Set());
        }
      } catch (err) {
        console.error("Error loading event detail", err);
        alert("Failed to load event data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [eventId, isAdmin]);

                      const refreshSeats = async () => {
                        try {
                          const allSeats = await getSeatsForEvent(eventId);
                          setAdminSeats(allSeats);
                          const eventSeats = await seatsForEvent(eventId);
                          setSeats(eventSeats);
                        } catch (err) {
                          console.error("Error refreshing seats", err);
                        }
                      };

                      const onAddSeat = async (e) => {
                        e.preventDefault();
                        const form = e.target;
                        const seatId = form.seatId.value.trim();
                        const label = form.label.value.trim() || seatId;
                        const isAda = !!form.isAda.checked;
                        if (!seatId) return;
                        try {
                          await addSeatToEvent(eventId, { seatId, label, isAda });
                          form.reset();
                          await refreshSeats();
                        } catch (err) {
                          console.error("Add seat failed", err);
                          alert("Failed to add seat");
                        }
                      };

                      // eslint-disable-next-line no-restricted-globals
                      const onRemoveSeat = async (seatId) => {
                        if (!window.confirm("Remove seat " + seatId + "?")) return;
                        try {
                          await removeSeatFromEvent(eventId, seatId);
                          await refreshSeats();
                        } catch (err) {
                          console.error("Remove seat failed", err);
                          alert("Failed to remove seat");
                        }
                      };

                      const onToggleAda = async (seatId) => {
                        try {
                          const allSeats = await getSeatsForEvent(eventId);
                          const seat = allSeats.find((s) => s.seatId === seatId);
                          if (!seat) return;
                          await updateSeatForEvent(eventId, seatId, { isAda: !seat.isAda });
                          await refreshSeats();
                        } catch (err) {
                          console.error("Toggle ADA failed", err);
                          alert("Failed to update seat");
                        }
                      };

                      const onRegisterSeat = async (seatId) => {
                        const ownerUid = prompt("Enter owner UID to register this seat for:");
                        if (!ownerUid) return;
                        try {
                          await assignSeats(eventId, [seatId], ownerUid, {}, ev.title, ev.startTime);
                          alert("Seat registered");
                          const takenSeats = await getAssignedSeats(eventId);
                          setTaken(takenSeats || new Set());
                        } catch (err) {
                          alert("Failed to register seat: " + err.message);
                        }
                      };

                      if (loading) return <div className="p-6 mt-12">Loading event...</div>;
                      if (!ev) return <div className="p-6 mt-12">Event not found.</div>;

                      const toggleSeat = (seatId) => {
                        if (taken.has(seatId)) return; // can't select taken seats
                        setSelected((prev) =>
                          prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
                        );
                      };

                      const priceEach = Number(ev.basePrice) || 0;
                      const subtotal = selected.length * priceEach;

                      const proceed = () => {
                        if (!selected.length) return;
                        const pending = {
                          eventId: ev.id,
                          eventTitle: ev.title,
                          startTime: ev.startTime,
                          seats: selected,
                          priceEach,
                          subtotal,
                          createdAt: Date.now(),
                        };
                        try {
                          localStorage.setItem("pendingOrder", JSON.stringify(pending));
                        } catch {}
                        navigate("/checkout");
                      };

                      return (
                        <div className="max-w-3xl mx-auto p-6 mt-12" style={{ position: "relative" }}>
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: "#fff",
                              borderRadius: "1.5rem",
                              zIndex: 0,
                              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                            }}
                          />
                          <div style={{ position: "relative", zIndex: 1 }}>
                            {/* Header */}
                            <div className="mb-6">
                              <button
                                onClick={() => navigate("/events")}
                                className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                              >
                                ← Back to Events
                              </button>
                              <h1 className="text-2xl font-semibold mt-2">{ev.title}</h1>
                              {ev.description && (
                                <div className="text-sm text-gray-600 mt-2 italic">{ev.description}</div>
                              )}
                              <div className="text-sm text-gray-500 mt-2">
                                {new Date(ev.startTime).toLocaleString()} {ev.venueId && `• ${ev.venueId}`}
                              </div>
                              {sectionNumber && (
                                <div className="mt-3 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold">
                                  Seat Selection for Section {sectionNumber}
                                </div>
                              )}
                            </div>

                            {/* Legend */}
                            <div className="mb-4 flex items-center gap-4 text-sm">
                              <span className="inline-flex items-center gap-2">
                                <span className="w-3 h-3 inline-block rounded border bg-white" /> Available
                              </span>
                              <span className="inline-flex items-center gap-2">
                                <span className="w-3 h-3 inline-block rounded border bg-gray-200" /> Taken
                              </span>
                              <span className="inline-flex items-center gap-2">
                                <span className="w-3 h-3 inline-block rounded border ring-2 ring-red-700 bg-yellow-100" /> Selected
                              </span>
                              <span className="inline-flex items-center gap-2">
                                <span className="w-3 h-3 inline-block rounded border bg-red-50" /> ADA
                              </span>
                            </div>

                            {/* Seats grid */}
                            <div className="mb-10" style={{ position: "relative" }}>
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: "#fff",
                                  borderRadius: "1rem",
                                  zIndex: 0,
                                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                                }}
                              />
                              <div className="grid grid-cols-4 gap-4" style={{ position: "relative", zIndex: 1 }}>
                                {seats.map((seat) => {
                                  const isTaken = taken.has(seat.seatId);
                                  const isSelected = selected.includes(seat.seatId);
                                  return (
                                    <button
                                      key={seat.seatId}
                                      disabled={isTaken}
                                      onClick={() => toggleSeat(seat.seatId)}
                                      className={[
                                        "px-4 py-3 rounded-lg border text-base transition-colors mb-2",
                                        isTaken
                                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                          : "hover:bg-red-100",
                                        isSelected ? "ring-2 ring-red-700 bg-yellow-100" : "",
                                        seat.isAda ? "bg-red-50" : "",
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
                            </div>

                            {isAdmin && (
                              <div className="admin-card">
                                <h3 className="text-xl font-bold mb-4">Admin: Manage Seats</h3>
                                <form onSubmit={onAddSeat} className="flex gap-4 mb-6">
                                  <input
                                    name="seatId"
                                    placeholder="Seat ID (e.g. D1)"
                                    className="px-3 py-2 rounded text-black bg-white"
                                  />
                                  <input
                                    name="label"
                                    placeholder="Label (optional)"
                                    className="px-3 py-2 rounded text-black bg-white"
                                  />
                                  <label className="flex items-center gap-2">
                                    <input type="checkbox" name="isAda" /> ADA
                                  </label>
                                  <button className="admin-btn">Add seat</button>
                                </form>
                                <div className="space-y-3">
                                  {adminSeats.map((s) => (
                                    <div
                                      key={s.seatId}
                                      className="flex items-center justify-between border rounded p-3 mb-2 bg-red-50"
                                    >
                                      <div>
                                        <div className="font-medium text-lg text-black">
                                          {s.label} ({s.seatId}) {s.isAda ? "• ADA" : ""}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => onToggleAda(s.seatId)}
                                          className="admin-btn"
                                          style={{ backgroundColor: "#991b1b" }}
                                        >
                                          Toggle ADA
                                        </button>
                                        <button
                                          onClick={() => onRegisterSeat(s.seatId)}
                                          className="admin-btn"
                                          style={{ backgroundColor: "#991b1b" }}
                                        >
                                          Register
                                        </button>
                                        <button
                                          onClick={() => onRemoveSeat(s.seatId)}
                                          className="admin-btn"
                                          style={{ backgroundColor: "#991b1b" }}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Summary / actions */}
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-600">
                                <div>Price each: ${priceEach.toFixed(2)}</div>
                                <div>Seats selected: {selected.length}</div>
                                <div>
                                  Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span>
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
                        </div>
                      );
}
