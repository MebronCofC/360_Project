import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { areAvailable, assignSeats } from "../../data/seatAssignments";
import { useAuth } from "../../contexts/authContext";
import { getTicketsForUserFromDB } from "../../firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import { validateAndNormalizePhone, formatPhoneForDisplay } from "../../utils/phoneUtils";
import { sendTicketSMS } from "../../services/smsService";



export default function Checkout() {
  const { currentUser } = useAuth?.();
  const ownerUid = currentUser?.uid || null;
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState([]);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneError, setPhoneError] = useState('');
      const [smsStatus, setSmsStatus] = useState('');

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
  const processingRef = useRef(false);
  const [processing, setProcessing] = useState(false);

  if (!pending) return null;

  const confirm = async () => {
     if (processingRef.current) return; // prevent double click race
     processingRef.current = true;
     setProcessing(true);
     if (!currentUser?.uid) {
       alert("Please log in before purchasing tickets.");
       navigate("/login");
       return;
     }
  
    // Validate phone number
    const phoneValidation = validateAndNormalizePhone(phoneNumber);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      processingRef.current = false;
      setProcessing(false);
      return;
    }
    setPhoneError('');
    const normalizedPhone = phoneValidation.normalized;
  
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
    
      // Send SMS with tickets
      setSmsStatus('Sending tickets to your phone...');
      const smsResult = await sendTicketSMS(
        normalizedPhone,
        newTickets,
        pending.eventTitle,
        newOrderId
      );
    
      if (smsResult.success) {
        setSmsStatus(`✅ Tickets sent to ${formatPhoneForDisplay(normalizedPhone)}`);
      } else {
        setSmsStatus(`⚠️ ${smsResult.message}`);
      }
  } catch (e) {
    console.error('Error assigning seats:', e);
    if (e.code === 'SEAT_TAKEN') {
      alert(`Sorry, these seats were just taken: ${e.takenSeats.join(', ')}. Please reselect.`);
    } else if (String(e.message || '').startsWith('FAILED_TAKEN:')) {
      const seats = e.message.split(':')[1].split(',');
      alert(`Sorry, these seats were just taken: ${seats.join(', ')}. Please reselect.`);
    } else {
      alert("One or more seats just got taken or an error occurred. Please reselect.");
    }
  } finally {
    processingRef.current = false;
    setProcessing(false);
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
          <>
            <div className="border rounded-xl p-4 bg-blue-50">
              <label className="block mb-2 font-medium text-gray-700">
                📱 Phone Number <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Required to receive your tickets via text message with QR codes
              </p>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError('');
                }}
                placeholder="(843) 555-5555"
                className={`w-full px-4 py-2 rounded-lg border ${
                  phoneError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              />
              {phoneError && (
                <p className="text-red-600 text-sm mt-2">⚠️ {phoneError}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Accepted formats: (843) 555-5555, 843-555-5555, or 8435555555
              </p>
            </div>
          
        <button onClick={confirm} disabled={processing} className={`px-4 py-2 rounded-xl text-white ${processing ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} transition-colors`}>
          {processing ? 'Processing...' : 'Confirm Purchase'}
        </button>
          </>
      ) : (
        <div className="space-y-4">
          <div className="text-emerald-700 font-medium">Purchase complete — tickets issued.</div>
            {smsStatus && (
              <div className={`text-sm p-3 rounded-lg ${
                smsStatus.includes('✅') ? 'bg-green-50 text-green-800' : 
                smsStatus.includes('⚠️') ? 'bg-yellow-50 text-yellow-800' : 
                'bg-blue-50 text-blue-800'
              }`}>
                {smsStatus}
              </div>
            )}
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
