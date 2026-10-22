'use client';

import { useState, useEffect } from 'react';
import styles from './OrderDrawer.module.css';

export default function OrderDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onClearCart,
  selectedTables = [],
  onOrderPlaced,
}) {
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'details'
  
  // Guest Details State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [cookingNotes, setCookingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate customer details if already logged in
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const savedData = localStorage.getItem('sgr_customer_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.name && !guestName) setGuestName(parsed.name);
          if (parsed.phone && !guestPhone) setGuestPhone(parsed.phone);
          if (parsed.email && !guestEmail) setGuestEmail(parsed.email);
        } catch (e) { /* ignore */ }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cgst = Math.round(subtotal * 0.025 * 100) / 100; // 2.5% CGST
  const sgst = Math.round(subtotal * 0.025 * 100) / 100; // 2.5% SGST
  const totalAmount = Math.round((subtotal + cgst + sgst) * 100) / 100;

  // Switch to Guest Details checkout form
  const handleProceedToDetails = () => {
    if (cart.length === 0) return;
    setCheckoutStep('details');
  };

  // Back to cart from details form
  const handleBackToCart = () => {
    setCheckoutStep('cart');
  };

  // Final Order Submission via Real API
  const handleConfirmOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!guestName.trim()) {
      alert('Please enter your full name for the table KOT.');
      return;
    }
    if (!guestPhone.trim()) {
      alert('Please enter your mobile number for the OTP.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: selectedTables,
          orderType: selectedTables && selectedTables.length > 0 ? 'DINE_IN' : 'TAKEAWAY',
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim(),
          guestCount: parseInt(guestCount, 10) || 2,
          cookingNotes: cookingNotes.trim() || 'Standard Karaikudi Authentic Sattvic Prep',
          items: cart,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order');
      }

      if (data.customer && typeof window !== 'undefined') {
        localStorage.setItem('sgr_customer_data', JSON.stringify(data.customer));
      }

      setSubmitting(false);
      setCheckoutStep('cart');
      if (onOrderPlaced) {
        onOrderPlaced(data.order);
      }
      onClearCart();
      onClose();
    } catch (err) {
      console.error('Order placement error:', err);
      alert(`Order Error: ${err.message}`);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.headerTitleWrap}>
            <span className={styles.headerIcon}>
              {checkoutStep === 'cart' ? '🛒' : '📝'}
            </span>
            <div>
              <h3 className={styles.title}>
                {checkoutStep === 'cart' ? 'Your Dining Tab' : 'Guest & Dine-In Details'}
              </h3>
              <span className={styles.subtitle}>
                {selectedTables && selectedTables.length > 0
                  ? `Table #${selectedTables.join(' & #')}`
                  : 'Direct Online / Takeaway'} • Sri Gokulam Pure Veg
              </span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close Tab">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {checkoutStep === 'cart' ? (
            /* ==========================================================
               STEP 1: CART ITEMS VIEW
               ========================================================== */
            <>
              {cart.length === 0 ? (
                <div className={styles.emptyBox}>
                  <div className={styles.emptyIcon}>🍽️</div>
                  <h4>Your Tab is Empty</h4>
                  <p>Explore our menu and add authentic pure ghee dishes to your tab.</p>
                </div>
              ) : (
                <>
                  {/* Active Table Standee Banner */}
                  <div className={styles.tableActiveBanner}>
                    <span className={styles.tableDot}>🟢</span>
                    <div>
                      <strong>Table #{selectedTables.join(' & #')} Standee Active</strong>
                      <small>Dishes will be delivered directly to this table</small>
                    </div>
                  </div>

                  <div className={styles.itemsList}>
                    {cart.map((item) => (
                      <div key={item.title} className={styles.cartItem}>
                        <div className={styles.itemInfo}>
                          <span className={styles.itemTitle}>{item.title}</span>
                          <span className={styles.itemPrice}>₹{item.price} each</span>
                        </div>

                        <div className={styles.qtyControl}>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => onUpdateQuantity(item.title, -1)}
                          >
                            -
                          </button>
                          <span className={styles.qtyNum}>{item.quantity}</span>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => onUpdateQuantity(item.title, 1)}
                          >
                            +
                          </button>
                        </div>

                        <span className={styles.itemSubtotal}>
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            /* ==========================================================
               STEP 2: GUEST DETAILS & COOKING INSTRUCTIONS
               ========================================================== */
            <form id="guestDetailsForm" onSubmit={handleConfirmOrder} className={styles.detailsForm}>
              <div className={styles.formPrompt}>
                Please enter your details to generate your digital KOT ticket and 4-digit confirmation OTP:
              </div>

              {/* Guest Name */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sundar Rajan"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className={styles.textInput}
                />
              </div>

              {/* Phone Number */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 98401 23456"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className={styles.textInput}
                />
                <span className={styles.inputHelper}>
                  📱 OTP &amp; digital bill status will be confirmed for this number
                </span>
              </div>

              {/* Email Address */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email Address (Optional — for e-Receipt &amp; OTP Login)</label>
                <input
                  type="email"
                  placeholder="e.g. sundar@gmail.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className={styles.textInput}
                />
                <span className={styles.inputHelper}>
                  ✉️ Automatically links your digital bill slips &amp; creates your customer account
                </span>
              </div>

              {/* Total Members Dining */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Total Members Dining at Table *</label>
                <div className={styles.guestSelectorPills}>
                  {['1', '2', '3', '4', '6', '8+'].map((cnt) => (
                    <button
                      type="button"
                      key={cnt}
                      className={`${styles.guestPill} ${guestCount === cnt ? styles.guestPillActive : ''}`}
                      onClick={() => setGuestCount(cnt)}
                    >
                      {cnt} {cnt === '1' ? 'Diner' : 'Diners'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cooking Instructions */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Cooking Notes / Special Requests</label>
                <div className={styles.quickChipsWrap}>
                  {['Extra Crispy Dosa', 'Less Spicy Sambar', 'Filter Coffee Served Last', 'Extra Plantain Leaf'].map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      className={styles.quickChip}
                      onClick={() =>
                        setCookingNotes((prev) => (prev ? `${prev}, ${chip}` : chip))
                      }
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Any allergies or spice preferences..."
                  value={cookingNotes}
                  onChange={(e) => setCookingNotes(e.target.value)}
                  className={styles.textareaInput}
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {cart.length > 0 && (
          <div className={styles.drawerFooter}>
            <div className={styles.breakdownBox}>
              <div className={styles.subtotalRow}>
                <span>Items Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>
              <div className={styles.taxRow}>
                <span>GST (CGST 2.5% + SGST 2.5%):</span>
                <span>₹{(cgst + sgst).toFixed(2)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Total Payable (GST Incl.):</span>
                <span className={styles.totalPrice}>₹{totalAmount}</span>
              </div>
            </div>

            {checkoutStep === 'cart' ? (
              <button
                className={styles.btnProceedBuy}
                onClick={handleProceedToDetails}
              >
                <span>🛍️</span> Buy / Proceed to Checkout (₹{totalAmount}) ➔
              </button>
            ) : (
              <div className={styles.detailsActions}>
                <button
                  type="button"
                  className={styles.btnBack}
                  onClick={handleBackToCart}
                  disabled={submitting}
                >
                  ← Back to Cart
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  className={styles.btnConfirmOrder}
                  disabled={submitting}
                >
                  {submitting ? '⏳ Generating KOT...' : `🔥 Place Order & Get OTP (₹${totalAmount})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
