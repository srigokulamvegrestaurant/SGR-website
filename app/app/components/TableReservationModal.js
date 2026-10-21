'use client';

import { useState, useEffect } from 'react';
import styles from './TableReservationModal.module.css';

const LUNCH_SLOTS = ['12:00 PM', '12:45 PM', '01:30 PM', '02:15 PM'];
const DINNER_SLOTS = ['07:00 PM', '07:45 PM', '08:30 PM', '09:15 PM'];

const SECTIONS = [
  { id: 'AC_MAIN', label: '❄️ AC Main Hall', desc: 'Central cooling & brass decor' },
  { id: 'AC_FAMILY', label: '👨‍👩‍👧‍👦 AC Family Hall', desc: 'Spacious 6-8 seaters' },
  { id: 'COURTYARD', label: '🌿 Open Courtyard', desc: 'Breezy greenery & birds' },
  { id: 'VERANDA', label: '🏛️ Chettinad Verandah', desc: 'Antique pillar seating' },
];

export default function TableReservationModal({ isOpen, onClose, onReservationConfirmed }) {
  if (!isOpen) return null;
  return <TableReservationDialog onClose={onClose} onReservationConfirmed={onReservationConfirmed} />;
}

function TableReservationDialog({ onClose, onReservationConfirmed }) {
  const [guestName, setGuestName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('sgr_customer_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed.name || '';
        }
      } catch (e) {}
    }
    return '';
  });
  const [phone, setPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('sgr_customer_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed.phone || '';
        }
      } catch (e) {}
    }
    return '';
  });
  const [partySize, setPartySize] = useState(2);
  const [customPartySize, setCustomPartySize] = useState('');
  const [section, setSection] = useState('AC_MAIN');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('01:30 PM');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedReservation, setConfirmedReservation] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!guestName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const finalPartySize = customPartySize ? Number(customPartySize) : partySize;
    if (!finalPartySize || finalPartySize < 1) {
      setError('Please select number of guests.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/customer/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: guestName.trim(),
          phone: cleanPhone,
          partySize: finalPartySize,
          date,
          timeSlot,
          section,
          specialRequests: specialRequests.trim(),
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to confirm reservation. Please try again.');
        return;
      }

      setConfirmedReservation(data.reservation);
      if (onReservationConfirmed) {
        onReservationConfirmed(data.reservation);
      }
    } catch (err) {
      setLoading(false);
      setError('Network connection error. Please try again or call us.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
          <div className={styles.headerIcon}>📅</div>
          <h2 className={styles.modalTitle}>Table Reservation</h2>
          <p className={styles.modalSubtitle}>
            மேஜை முன்பதிவு • Chettinad Heritage Dining &amp; Sattvic Banana Leaf Feast
          </p>
        </div>

        {/* Content Body */}
        <div className={styles.modalBody}>
          {confirmedReservation ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>🎉</div>
              <h3 className={styles.successTitle}>Table Reserved Successfully!</h3>
              <p className={styles.successSubtitle}>
                வணக்கம், <strong>{confirmedReservation.guestName}</strong>! Your table is secured at Sri Gokulam.
              </p>

              <div className={styles.ticketBox}>
                <div className={styles.ticketRow}>
                  <span className={styles.ticketLabel}>Booking Reference:</span>
                  <span className={styles.ticketVal}>#{confirmedReservation.id?.slice(-8).toUpperCase()}</span>
                </div>
                <div className={styles.ticketRow}>
                  <span className={styles.ticketLabel}>Assigned Table:</span>
                  <span className={styles.ticketVal} style={{ color: '#d97706', fontSize: '1rem' }}>
                    Table #{confirmedReservation.tableNumber} ({confirmedReservation.section || 'AC Hall'})
                  </span>
                </div>
                <div className={styles.ticketRow}>
                  <span className={styles.ticketLabel}>Date &amp; Time Slot:</span>
                  <span className={styles.ticketVal}>
                    {confirmedReservation.date} • {confirmedReservation.timeSlot}
                  </span>
                </div>
                <div className={styles.ticketRow}>
                  <span className={styles.ticketLabel}>Guests / Party:</span>
                  <span className={styles.ticketVal}>{confirmedReservation.partySize} Guests</span>
                </div>
                <div className={styles.ticketRow}>
                  <span className={styles.ticketLabel}>Mobile:</span>
                  <span className={styles.ticketVal}>+91 {confirmedReservation.phone}</span>
                </div>
                {confirmedReservation.specialRequests && (
                  <div className={styles.ticketRow}>
                    <span className={styles.ticketLabel}>Notes:</span>
                    <span className={styles.ticketVal} style={{ fontSize: '0.85rem' }}>
                      {confirmedReservation.specialRequests}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.callNotice}>
                💡 Please arrive 10 minutes prior to your time slot. Need modifications? Call{' '}
                <strong>+91 98765 43210</strong>.
              </div>

              <button className={styles.submitBtn} onClick={onClose}>
                Done / Back to Dining ➔
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className={styles.errorBox}>{error}</div>}

              {/* Guest Name & Phone */}
              <div className={styles.guestContactRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aswin"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                    className={styles.inputField}
                  />
                </div>
              </div>

              {/* Party Size */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Number of Guests</label>
                <div className={styles.chipsGrid}>
                  {[2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`${styles.chipBtn} ${partySize === num && !customPartySize ? styles.chipBtnActive : ''}`}
                      onClick={() => {
                        setPartySize(num);
                        setCustomPartySize('');
                      }}
                    >
                      {num} Guests
                    </button>
                  ))}
                </div>
              </div>

              {/* Seating Section Preference */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Dining Section Preference</label>
                <div className={styles.sectionGrid}>
                  {SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      className={`${styles.chipBtn} ${section === sec.id ? styles.chipBtnActive : ''}`}
                      style={{ padding: '8px 10px', textAlign: 'left' }}
                      onClick={() => setSection(sec.id)}
                    >
                      <div style={{ fontWeight: 800 }}>{sec.label}</div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{sec.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Slot */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Reservation Date</label>
                <input
                  type="date"
                  min={todayStr}
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={styles.inputField}
                />
              </div>

              {/* Meal Slot Selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Dining Slot</label>
                <div className={styles.timeSlotsWrap}>
                  <div>
                    <div className={styles.timeSlotHeading}>☀️ Lunch Slots (12 PM - 3 PM)</div>
                    <div className={styles.timeChips}>
                      {LUNCH_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`${styles.chipBtn} ${timeSlot === slot ? styles.chipBtnActive : ''}`}
                          onClick={() => setTimeSlot(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className={styles.timeSlotHeading}>🌙 Dinner Slots (7 PM - 10 PM)</div>
                    <div className={styles.timeChips}>
                      {DINNER_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`${styles.chipBtn} ${timeSlot === slot ? styles.chipBtnActive : ''}`}
                          onClick={() => setTimeSlot(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Special Requests / Dietary Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Traditional plantain leaf feast, Sattvic/Jain, High chair"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className={styles.inputField}
                />
              </div>

              {/* Submit CTA */}
              <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading ? 'Securing Your Table...' : 'Confirm Table Reservation ➔'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
