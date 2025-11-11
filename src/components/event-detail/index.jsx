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

  // Section-based seat generation rules
  const LARGE_SECTIONS = new Set([110,111,112,113,114,115,101,102,103,104,105,106,107,109]);
  const SMALL_SECTIONS = new Set([210,211,213,214,215,216,201,202,203,204,205,206,207,208,209]);

  const letters = (from, to) => {
    const start = from.charCodeAt(0);
    const end = to.charCodeAt(0);
    const arr = [];
    for (let c = start; c <= end; c++) arr.push(String.fromCharCode(c));
    return arr;
  };

  const generateSectionSeats = (section) => {
    const secStr = String(section);
    const upper = secStr.toUpperCase();
    // President suite (labelled SUITE on chart)
    if (upper.includes("SUITE")) {
      const rows = letters('A','C');
      const perRow = 10;
      return rows.flatMap(r => Array.from({length: perRow}, (_,i) => ({
        seatId: `${secStr}-${r}${i+1}`,
        label: `${r}${i+1}`,
        isAda: false,
      })));
    }
    const num = Number(secStr);
    const isLarge = LARGE_SECTIONS.has(num);
    const isSmall = SMALL_SECTIONS.has(num);
    const rows = isLarge ? letters('A','L') : letters('A','E');
    const perRow = 18;
    return rows.flatMap(r => Array.from({length: perRow}, (_,i) => ({
      seatId: `${secStr}-${r}${i+1}`,
      label: `${r}${i+1}`,
      isAda: false,
    })));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const events = await getEvents();
        const event = events.find((e) => e.id === eventId);
        setEv(event || null);
        if (event) {
          let eventSeats = [];
          if (sectionNumber) {
            eventSeats = generateSectionSeats(sectionNumber);
          } else {
            eventSeats = await seatsForEvent(eventId);
            if (isAdmin) {
              const allSeats = await getSeatsForEvent(eventId);
              setAdminSeats(allSeats);
            }
          }
          setSeats(eventSeats);
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
                          await assignSeats(eventId, [seatId], ownerUid, {}, ev.title, ev.startTime, ev.endTime || null);
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
                            endTime: ev.endTime || null,
                            section: sectionNumber || null,
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
                        <div className="max-w-6xl mx-auto p-6 mt-12" style={{ position: "relative" }}>
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
                              boxShadow: "none",
                              border: "1px solid rgba(0,0,0,0.08)"
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
                                {new Date(ev.startTime).toLocaleString()} - {ev.endTime ? new Date(ev.endTime).toLocaleString() : 'TBD'} {ev.venueId && `• ${ev.venueId}`}
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

                            {/* Seats grid (bleacher-style: Row A at bottom, all visible) */}
                            <div className="mb-10">
                              <div className="inline-block bg-white rounded-lg p-4 shadow-sm">
                                <div className="flex flex-col-reverse gap-2">
                                  {Object.entries(
                                    seats.reduce((acc, seat) => {
                                      const row = seat.label.match(/^[A-Z]+/)[0];
                                      acc[row] = acc[row] || [];
                                      acc[row].push(seat);
                                      return acc;
                                    }, {})
                                  ).sort(([rowA],[rowB]) => rowA.localeCompare(rowB))
                                  .map(([row, rowSeats]) => (
                                    <div key={row} className="flex items-center gap-2">
                                      <div className="text-xs font-bold text-gray-700 w-8 text-right flex-shrink-0">
                                        {row}
                                      </div>
                                      <div className="flex gap-1 flex-nowrap">
                                        {rowSeats.sort((a,b)=>{
                                          const na = Number(a.label.replace(/^[A-Z]+/,''));
                                          const nb = Number(b.label.replace(/^[A-Z]+/,''));
                                          return na-nb;
                                        }).map(seat => {
                                          const isTaken = taken.has(seat.seatId);
                                          const isSelected = selected.includes(seat.seatId);
                                          return (
                                            <button
                                              key={seat.seatId}
                                              disabled={isTaken}
                                              onClick={() => toggleSeat(seat.seatId)}
                                              className={[
                                                "px-2 py-1.5 rounded text-xs font-medium transition-all border",
                                                isTaken
                                                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                  : "bg-white hover:bg-red-100",
                                                isSelected ? "ring-2 ring-red-700 bg-yellow-100 font-bold" : "",
                                                seat.isAda ? "bg-red-50" : "",
                                              ].join(" ")}
                                              style={{ minWidth: '2rem' }}
                                              aria-label={`Seat ${seat.label}${seat.isAda ? " (ADA)" : ""}${
                                                isTaken ? " (Taken)" : ""
                                              }`}
                                              title={seat.label}
                                            >
                                              {seat.label.replace(/^[A-Z]+/,'')}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {isAdmin && !sectionNumber && (
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
