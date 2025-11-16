import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { areAvailable, assignSeats } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext";
import { getTicketsForUserFromDB } from "../../firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";



export default function Checkout() {
  const { currentUser } = useAuth?.();
  const ownerUid = currentUser?.uid || null;
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState([]);

  const pending = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("pendingOrder") || "null"); }
    catch { return null; }
  }, []);

  // Move hooks above conditional returns
  const [orderId, setOrderId] = useState(null);
  // Use 0 if pending is null to avoid error
  const total = pending ? pending.subtotal * 0.8 : 0; // apply 20% demo student discount

  useEffect(() => {
    if (!pending) navigate("/events");
  }, [pending, navigate]);

  if (!pending) return null;

  const confirm = async () => {
     if (!currentUser?.uid) {
       alert("Please log in before purchasing tickets.");
       navigate("/login");
       return;
     }
  // 1) check for conflicts (already owned seats)
  const conflicts = await areAvailable(pending.eventId, pending.seats);
    
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
    await assignSeats(
      pending.eventId, 
      pending.seats, 
      ownerUid, 
      ticketIdBySeat, 
      pending.eventTitle, 
      pending.startTime, 
      pending.endTime || null,
      currentUser?.email || null,
      currentUser?.displayName || currentUser?.email || null
    );
    localStorage.removeItem("pendingOrder");
  setOrderId(newOrderId);
    setSaved(true);
    
    // Load the newly created tickets from Firestore
    const tickets = await getTicketsForUserFromDB(ownerUid);
    const newTickets = tickets.filter(t => t.orderId === newOrderId);
    setPurchasedTickets(newTickets);
  } catch (e) {
    console.error('Error assigning seats:', e);
    alert("One or more seats just got taken. Please reselect.");
    return;
  }
};


  return (
    <div className="max-w-3xl mx-auto p-6 mt-12 space-y-6" style={{position:'relative'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'#fff',borderRadius:'1.5rem',zIndex:0,boxShadow:'0 4px 24px rgba(0,0,0,0.10)'}}></div>
      <div style={{position:'relative',zIndex:1}}>
  <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="border rounded-xl p-4">
        <div className="font-medium mb-2">{pending.eventTitle}</div>
  <div className="text-gray-600 mb-4">{new Date(pending.startTime).toLocaleString()} {pending.endTime ? `- ${new Date(pending.endTime).toLocaleString()}` : ''}</div>
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
          {orderId && (
            <div className="text-xs text-gray-500">Order ID: {orderId}</div>
          )}
          <div className="text-sm text-gray-600">Your QR codes (one per seat):</div>
          <div className="grid grid-cols-2 gap-3">
            {purchasedTickets.map(t => (
                <div key={t.id} className="border rounded-xl p-3">
                  <div className="text-sm font-medium mb-2">{t.eventTitle} — {t.seatId}</div>
                  <div className="flex items-center justify-center">
                    <QRCodeCanvas value={t.qrPayload || ''} size={180} includeMargin={true} />
                  </div>
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
    </div>
  );
}
