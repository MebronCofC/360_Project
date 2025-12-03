import React, { useEffect, useMemo, useState, useRef } from "react";
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

  // Payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (!pending) navigate("/events");
  }, [pending, navigate]);
  const processingRef = useRef(false);
  const [processing, setProcessing] = useState(false);

  

  if (!pending) return null;

  const validatePayment = () => {
    setPaymentError('');
    
    // Card number: must be 16 digits
    const cleanedCard = cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleanedCard)) {
      setPaymentError('Card number must be 16 digits');
      return false;
    }
    
    // Name on card: must not be empty
    if (!nameOnCard.trim()) {
      setPaymentError('Name on card is required');
      return false;
    }
    
    // Expiration date: MM/YY format
    if (!/^\d{2}\/\d{2}$/.test(expirationDate)) {
      setPaymentError('Expiration date must be in MM/YY format');
      return false;
    }
    
    // Security code: 3 or 4 digits
    if (!/^\d{3,4}$/.test(securityCode)) {
      setPaymentError('Security code must be 3 or 4 digits');
      return false;
    }
    
    return true;
  };

  const confirm = async () => {
     if (processingRef.current) return; // prevent double click race
     
     // Validate payment before processing
     if (!validatePayment()) {
       return;
     }
     
     processingRef.current = true;
     setProcessing(true);
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
            {/* Payment Section */}
            <div className="border rounded-xl p-6 space-y-4 bg-white">
              <h2 className="text-lg font-semibold mb-4">Payment</h2>
              <p className="text-sm text-gray-600 mb-4">All transactions are secure and encrypted.</p>
              
              <div className="space-y-4">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, '');
                      const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                      setCardNumber(formatted);
                    }}
                    maxLength="19"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Name on Card */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name on card
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Expiration Date and Security Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiration date (MM/YY)
                    </label>
                    <input
                      type="text"
                      placeholder="12/25"
                      value={expirationDate}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          value = value.slice(0, 2) + '/' + value.slice(2, 4);
                        }
                        setExpirationDate(value);
                      }}
                      maxLength="5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Security code
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={securityCode}
                      onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))}
                      maxLength="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="text-red-600 text-sm mt-2">{paymentError}</div>
              )}
            </div>
            
          
        <button onClick={confirm} disabled={processing} className={`px-4 py-2 rounded-xl text-white ${processing ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} transition-colors`}>
          {processing ? 'Processing...' : 'Confirm Purchase'}
        </button>
          </>
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
