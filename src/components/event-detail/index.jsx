import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getEvents, seatsForEvent, getSeatsForEvent } from "../../data/events";
import { assignSeats, getAssignedSeats, getEventInventory, releaseSeat } from "../../data/seatAssignments";
import { getTicketsForEventFromDB, revokeTicketForSeatInDB } from "../../firebase/firestore";
import { useAuth } from "../../contexts/authContext";
import InteractiveSeatingChart from "../seating-chart";
import Loading from "../common/Loading";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
    const { isAdmin, currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const sectionNumber = searchParams.get("section");

  const [loading, setLoading] = useState(true);
  const [ev, setEv] = useState(null);
  const [seats, setSeats] = useState([]);
  // Removed legacy admin seat list; modern admin view uses aggregated section stats
  const [taken, setTaken] = useState(new Set());
  const [selected, setSelected] = useState([]);
  const [sectionSoldOut, setSectionSoldOut] = useState(false);
  const [sectionUnavailable, setSectionUnavailable] = useState(false);
  const [sectionStats, setSectionStats] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [sectionSeatsForAdmin, setSectionSeatsForAdmin] = useState([]);
  const [pendingStatusBySeat, setPendingStatusBySeat] = useState({});
  const [ticketsBySeatIdMap, setTicketsBySeatIdMap] = useState({});
  const [seatActionInFlight, setSeatActionInFlight] = useState(false);

  // Section-based seat generation rules
  const LARGE_SECTIONS = useMemo(() => new Set([110,111,112,113,114,115,101,102,103,104,105,106,107,109]), []);
  const SMALL_SECTIONS = useMemo(() => new Set([210,211,213,214,215,216,201,202,203,204,205,206,207,208,209]), []);

  const letters = (from, to) => {
    const start = from.charCodeAt(0);
    const end = to.charCodeAt(0);
    const arr = [];
    for (let c = start; c <= end; c++) arr.push(String.fromCharCode(c));
    return arr;
  };

  const generateSectionSeats = useCallback((section) => {
    const secStr = String(section);
    const upper = secStr.toUpperCase();
    if (upper.includes('SUITE')) {
      const rows = letters('A','C');
      const perRow = 10;
      return rows.flatMap(r => Array.from({ length: perRow }, (_, i) => ({
        seatId: `${secStr}-${r}${i+1}`,
        label: `${r}${i+1}`,
        isAda: false,
      })));
    }
    const num = Number(secStr);
    const isLarge = LARGE_SECTIONS.has(num);
    const rows = isLarge ? letters('A','L') : letters('A','E');
    const perRow = 18;
    return rows.flatMap(r => Array.from({ length: perRow }, (_, i) => ({
      seatId: `${secStr}-${r}${i+1}`,
      label: `${r}${i+1}`,
      isAda: false,
    })));
  }, [LARGE_SECTIONS]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const events = await getEvents();
        const event = events.find(e => e.id === eventId);
        setEv(event || null);
        if (event) {
          let eventSeats = [];
          if (sectionNumber) {
            eventSeats = generateSectionSeats(sectionNumber);
          } else {
            eventSeats = await seatsForEvent(eventId);
          }
          setSeats(eventSeats);
          const takenSeats = await getAssignedSeats(eventId);
          setTaken(takenSeats || new Set());
          if (sectionNumber) {
            try {
              const inventory = await getEventInventory(eventId);
              const secInfo = inventory.sections?.[String(sectionNumber)];
              if (secInfo) {
                setSectionSoldOut(secInfo.remaining === 0 && secInfo.unavailable !== secInfo.total);
                setSectionUnavailable(secInfo.unavailable === secInfo.total && secInfo.total > 0);
              } else {
                const total = eventSeats.length;
                const takenCount = [...takenSeats].filter(seatId => seatId.startsWith(sectionNumber + '-')).length;
                setSectionSoldOut(takenCount >= total);
                setSectionUnavailable(false);
              }
            } catch (e) {
              console.error('Inventory check failed for section', sectionNumber, e);
              const total = eventSeats.length;
              const takenCount = [...takenSeats].filter(seatId => seatId.startsWith(sectionNumber + '-')).length;
              setSectionSoldOut(takenCount >= total);
              setSectionUnavailable(false);
            }
          } else if (isAdmin) {
            const inventory = await getEventInventory(eventId);
            const allSections = [
              110,111,112,113,114,115,101,102,103,104,105,106,107,109,
              210,211,213,214,215,216,201,202,203,204,205,206,207,208,209,
              'SUITE'
            ];
            const stats = allSections.map(sec => {
              const secStr = String(sec);
              const info = inventory.sections?.[secStr];
              let total = 0;
              if (secStr === 'SUITE') total = 3 * 10;
              else if (LARGE_SECTIONS.has(Number(sec))) total = 12 * 18;
              else if (SMALL_SECTIONS.has(Number(sec))) total = 5 * 18;
              return {
                section: secStr,
                taken: info?.taken || 0,
                total,
                remaining: info?.remaining ?? total,
                isSoldOut: inventory.soldOutSections?.includes(secStr) || false
              };
            });
            setSectionStats(stats);
          }
        }
      } catch (err) {
        console.error('Error loading event detail', err);
        alert('Failed to load event data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [eventId, isAdmin, sectionNumber, generateSectionSeats, LARGE_SECTIONS, SMALL_SECTIONS]);

    // Refresh taken seats periodically and when user changes to ensure real-time sync
    useEffect(() => {
      const refreshTakenSeats = async () => {
        if (!eventId) return;
        try {
          const takenSeats = await getAssignedSeats(eventId);
          setTaken(takenSeats || new Set());
          // Also refresh section sold-out status if viewing a specific section
          if (sectionNumber && seats.length > 0) {
            const total = seats.length;
            const takenCount = [...takenSeats].filter(seatId => seatId.startsWith(sectionNumber + '-')).length;
            setSectionSoldOut(takenCount >= total);
          }
        } catch (err) {
          console.error("Error refreshing seat availability", err);
        }
      };

      // Initial refresh
      refreshTakenSeats();

      // Set up interval to refresh every 3 seconds for real-time updates
      const interval = setInterval(refreshTakenSeats, 3000);

      return () => clearInterval(interval);
    }, [eventId, sectionNumber, currentUser, seats.length]);

                      // Legacy admin seat CRUD handlers removed (now managed via Section Overview)

                      if (loading) return <Loading message="Loading event" />;
                      if (!ev) return <div className="p-6 mt-12">Event not found.</div>;

                      const toggleSeat = (seatId) => {
                        if (taken.has(seatId)) return; // can't select taken seats
                        setSelected((prev) =>
                          prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
                        );
                      };

                      // Admin helpers: select all seats
                      const selectAllSeatsInSection = () => {
                        if (!isAdmin) return;
                        // Use current section's seats state; exclude taken
                        const availableIds = seats
                          .filter((s) => !taken.has(s.seatId))
                          .map((s) => s.seatId);
                        setSelected(Array.from(new Set(availableIds)));
                      };

                      const selectAllSeatsInRow = (rowLabel, rowSeatObjs) => {
                        if (!isAdmin) return;
                        const ids = rowSeatObjs
                          .filter((s) => !taken.has(s.seatId))
                          .map((s) => s.seatId);
                        // Merge with existing selections (admin may want to add row-by-row)
                        setSelected((prev) => Array.from(new Set([...prev, ...ids])));
                      };

                      // Admin section management
                      const toggleSectionExpanded = async (section) => {
                        if (expandedSection === section) {
                          setExpandedSection(null);
                          setSectionSeatsForAdmin([]);
                        } else {
                          setExpandedSection(section);
                          // Generate all seats for this section
                          const sectionSeats = generateSectionSeats(section);
                          // Get all tickets for this event to get user information
                          const allTickets = await getTicketsForEventFromDB(eventId);
                          const ticketsBySeatId = {};
                          allTickets.forEach(ticket => {
                            if (ticket.seatId) {
                              ticketsBySeatId[ticket.seatId] = ticket;
                            }
                          });
                          setTicketsBySeatIdMap(ticketsBySeatId);
                          // Get ticket status for each seat
                          const takenSeats = await getAssignedSeats(eventId);
                          const seatsWithStatus = sectionSeats.map(seat => {
                            const ticket = ticketsBySeatId[seat.seatId];
                            let status = 'available';
                            if (takenSeats.has(seat.seatId)) {
                              const owner = String(ticket?.ownerUid || '').toUpperCase();
                              status = owner === 'ADMIN_UNAVAILABLE' ? 'unavailable' : 'reserved';
                            }
                            return {
                              ...seat,
                              status,
                              ownerUid: ticket?.ownerUid || null,
                              ownerName: ticket?.ownerName || null,
                              ownerEmail: ticket?.ownerEmail || null
                            };
                          });
                          setSectionSeatsForAdmin(seatsWithStatus);
                        }
                      };

                      const updateSeatStatus = async (seatId, newStatus) => {
                        try {
                          if (newStatus === 'reserved') {
                            // Mark as reserved by assigning to system
                            await assignSeats(eventId, [seatId], 'ADMIN_RESERVED', {}, ev.title, ev.startTime, ev.endTime || null, 'admin-reserved', 'Admin Reserved');
                          } else if (newStatus === 'unavailable') {
                            // Mark as unavailable by assigning to system
                            await assignSeats(eventId, [seatId], 'ADMIN_UNAVAILABLE', {}, ev.title, ev.startTime, ev.endTime || null, 'admin-unavailable', 'Admin Unavailable');
                          } else if (newStatus === 'available') {
                            // Release the seat if it was admin-reserved
                            const allSeats = await getSeatsForEvent(eventId);
                            const seat = allSeats.find(s => s.seatId === seatId);
                            if (seat) {
                              // We need to delete the ticket for this seat if it exists
                              // This requires a new firestore function or we can just reassign
                              // For now, we'll keep it simple and just update the display
                            }
                          }
                          // Refresh the section seats
                          await toggleSectionExpanded(expandedSection);
                          // Refresh taken seats
                          const takenSeats = await getAssignedSeats(eventId);
                          setTaken(takenSeats || new Set());
                        } catch (err) {
                          console.error("Failed to update seat status", err);
                          alert("Failed to update seat status");
                        }
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

                            {/* Legend - only show when viewing specific section */}
                            {sectionNumber && (
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
                            )}

                            {/* Seats grid or Sold Out notice */}
                            <>
                              {isAdmin && sectionNumber && !sectionSoldOut && (
                                <div className="mb-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={selectAllSeatsInSection}
                                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-800 text-white hover:bg-gray-900"
                                  >
                                    Select all seats
                                  </button>
                                </div>
                              )}
                              <div className="mb-10">
                              {!sectionNumber ? (
                                // Show interactive seating chart when no section selected
                                <InteractiveSeatingChart eventId={eventId} />
                              ) : (sectionSoldOut || sectionUnavailable) ? (
                                <div className="p-8 bg-red-50 border border-red-300 rounded-xl text-center">
                                  <h2 className="text-2xl font-bold text-red-700 mb-2">No more seats available</h2>
                                  <p className="text-red-600">This section is not available. Please choose another section.</p>
                                  <button
                                    onClick={() => navigate(`/events/${eventId}`)}
                                    className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                                  >
                                    Back to Section Map
                                  </button>
                                </div>
                              ) : (
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
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => selectAllSeatsInRow(row, rowSeats)}
                                          className="ml-1 px-2 py-1 rounded border text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-800"
                                          title="Select all seats in this row"
                                        >
                                          Select all seat rows
                                        </button>
                                      )}
                                      <div className="flex gap-1 flex-nowrap">
                                        {rowSeats.sort((a,b)=>{
                                          const na = Number(a.label.replace(/^[A-Z]+/,''));
                                          const nb = Number(b.label.replace(/^[A-Z]+/,''));
                                          return na-nb;
                                        }).map(seat => {
                                          const isTaken = taken.has(seat.seatId);
                                          // seat unavailable if there's a ticket with ADMIN_UNAVAILABLE ownerUid for that seat
                                          // We approximate by checking taken + sectionUnavailable context; more granular could query ticket metadata if needed.
                                          const isUnavailable = sectionUnavailable && isTaken;
                                          const isSelected = selected.includes(seat.seatId);
                                          return (
                                            <div key={seat.seatId} className="flex flex-col items-center">
                                              <img 
                                                src="/seaticon.png" 
                                                alt="Seat" 
                                                className="w-8 h-auto mb-0.5"
                                                style={{ minWidth: '2rem' }}
                                              />
                                              <button
                                                disabled={isTaken}
                                                onClick={() => toggleSeat(seat.seatId)}
                                                className={[
                                                  "px-2 py-1.5 rounded text-xs font-medium transition-all border",
                                                  isUnavailable
                                                    ? "bg-gray-500 text-white cursor-not-allowed"
                                                    : isTaken
                                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                    : "bg-white hover:bg-red-100",
                                                  isSelected ? "ring-2 ring-red-700 bg-yellow-100 font-bold" : "",
                                                  seat.isAda ? "bg-red-50" : "",
                                                ].join(" ")}
                                                style={{ minWidth: '2rem' }}
                                                aria-label={`Seat ${seat.label}${seat.isAda ? " (ADA)" : ""}${
                                                  isUnavailable ? " (Unavailable)" : isTaken ? " (Taken)" : ""
                                                }`}
                                                title={seat.label}
                                              >
                                                {seat.label.replace(/^[A-Z]+/,'')}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                </div>
                              )}
                              </div>
                            </>

                            {isAdmin && !sectionNumber && (
                              <div className="admin-card">
                                <h3 className="text-xl font-bold mb-4">Admin: Section Overview & Management</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                  Click on a section row to expand and manage individual seat statuses.
                                </p>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-5 gap-4 font-semibold text-sm border-b pb-2">
                                    <div>Section</div>
                                    <div>Total Seats</div>
                                    <div>Sold</div>
                                    <div>Available</div>
                                    <div>Actions</div>
                                  </div>
                                  {sectionStats.map((stat) => (
                                    <div key={stat.section} className="space-y-2">
                                      <div
                                        className={`grid grid-cols-5 gap-4 border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                                          stat.isSoldOut ? 'bg-red-100 border-red-300' : 'bg-white border-gray-300'
                                        } ${expandedSection === stat.section ? 'border-indigo-500 border-2' : ''}`}
                                        onClick={() => toggleSectionExpanded(stat.section)}
                                      >
                                        <div className="font-medium text-black">
                                          Section {stat.section}
                                          {stat.isSoldOut && <span className="ml-2 text-xs text-red-600 font-bold">SOLD OUT</span>}
                                        </div>
                                        <div className="text-gray-700">{stat.total}</div>
                                        <div className="text-gray-700">{stat.taken}</div>
                                        <div className={`font-semibold ${stat.remaining === 0 ? 'text-red-600' : stat.remaining < stat.total * 0.35 ? 'text-orange-600' : 'text-green-600'}`}>
                                          {stat.remaining}
                                        </div>
                                        <div className="text-indigo-600 text-sm font-medium">
                                          {expandedSection === stat.section ? '▼ Collapse' : '▶ Expand'}
                                        </div>
                                      </div>
                                      
                                      {/* Expanded seat management */}
                                      {expandedSection === stat.section && (
                                        <div className="ml-8 p-4 bg-gray-50 border border-gray-300 rounded">
                                          <h4 className="font-semibold mb-3 text-sm">Manage Seats for Section {stat.section}</h4>
                                          <div className="max-h-96 overflow-y-auto space-y-1">
                                            {sectionSeatsForAdmin.map((seat) => (
                                              <div key={seat.seatId} className="flex items-center justify-between p-2 bg-white border rounded hover:bg-gray-50">
                                                <div className="flex items-center gap-4 flex-1">
                                                  <span className="text-sm font-medium text-gray-700 w-24">
                                                    {seat.label}
                                                  </span>
                                                  {seat.ownerUid && seat.ownerUid !== 'ADMIN_RESERVED' && seat.ownerUid !== 'ADMIN_UNAVAILABLE' && (
                                                    <div className="flex-1 text-xs text-gray-600">
                                                      <div className="font-semibold">UID: {seat.ownerUid}</div>
                                                      {seat.ownerName && <div>Name: {seat.ownerName}</div>}
                                                      {seat.ownerEmail && <div>Email: {seat.ownerEmail}</div>}
                                                    </div>
                                                  )}
                                                  {seat.ownerUid === 'ADMIN_RESERVED' && (
                                                    <div className="flex-1 text-xs text-yellow-700 font-medium">
                                                      Admin Reserved
                                                    </div>
                                                  )}
                                                  {seat.ownerUid === 'ADMIN_UNAVAILABLE' && (
                                                    <div className="flex-1 text-xs text-red-700 font-medium">
                                                      Admin Unavailable
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <select
                                                    value={pendingStatusBySeat[seat.seatId] || seat.status}
                                                    onChange={(e) => {
                                                      const val = e.target.value;
                                                      setPendingStatusBySeat((prev)=>({ ...prev, [seat.seatId]: val }));
                                                    }}
                                                    className="text-sm border rounded px-2 py-1 bg-white text-black"
                                                  >
                                                    <option value="available">Available</option>
                                                    <option value="reserved">Reserved</option>
                                                    <option value="unavailable">Unavailable</option>
                                                    {seat.status !== 'available' && <option value="revoke">Revoke (invalidate ticket)</option>}
                                                  </select>
                                                  {(pendingStatusBySeat[seat.seatId] && pendingStatusBySeat[seat.seatId] !== seat.status) && (
                                                    <button
                                                      disabled={seatActionInFlight}
                                                      className={`ml-2 text-xs px-3 py-1 rounded text-white ${seatActionInFlight ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                      onClick={async () => {
                                                        if (seatActionInFlight) return;
                                                        setSeatActionInFlight(true);
                                                        const newStatus = pendingStatusBySeat[seat.seatId];
                                                        try {
                                                          if (newStatus === 'reserved') {
                                                            await assignSeats(eventId, [seat.seatId], 'ADMIN_RESERVED', {}, ev.title, ev.startTime, ev.endTime || null, 'admin-reserved', 'Admin Reserved');
                                                          } else if (newStatus === 'unavailable') {
                                                            await assignSeats(eventId, [seat.seatId], 'ADMIN_UNAVAILABLE', {}, ev.title, ev.startTime, ev.endTime || null, 'admin-unavailable', 'Admin Unavailable');
                                                          } else if (newStatus === 'available') {
                                                            const t = ticketsBySeatIdMap[seat.seatId];
                                                            if (t) {
                                                              const owner = String(t.ownerUid || '').toUpperCase();
                                                              if (owner === 'ADMIN_RESERVED' || owner === 'ADMIN_UNAVAILABLE') {
                                                                await releaseSeat(eventId, seat.seatId, owner);
                                                              } else {
                                                                await revokeTicketForSeatInDB(eventId, seat.seatId);
                                                              }
                                                            }
                                                          } else if (newStatus === 'revoke') {
                                                            await revokeTicketForSeatInDB(eventId, seat.seatId);
                                                          }
                                                          setPendingStatusBySeat((prev)=>{ const n={...prev}; delete n[seat.seatId]; return n; });
                                                          await toggleSectionExpanded(expandedSection);
                                                          const takenSeats = await getAssignedSeats(eventId);
                                                          setTaken(takenSeats || new Set());
                                                          window.location.reload();
                                                        } catch (err) {
                                                          console.error('Failed to apply change', err);
                                                          alert(err.code === 'SEAT_TAKEN' ? 'Seat was claimed simultaneously by another action.' : 'Failed to apply change');
                                                        } finally {
                                                          setSeatActionInFlight(false);
                                                        }
                                                      }}
                                                    >
                                                      {seatActionInFlight ? 'Working...' : 'Confirm'}
                                                    </button>
                                                  )}
                                                  <span className={`text-xs px-2 py-1 rounded ${
                                                    seat.status === 'available' ? 'bg-green-100 text-green-700' :
                                                    seat.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                  }`}>
                                                    {seat.status}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Summary / actions - only show when viewing specific section */}
                            {sectionNumber && (
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
                            )}
                          </div>
                        </div>
                      );
}
