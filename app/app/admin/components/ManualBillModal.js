'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './ManualBillModal.module.css';

export default function ManualBillModal(props) {
  if (!props.isOpen) return null;
  return <ManualBillDialog {...props} />;
}

function ManualBillDialog({
  isOpen,
  onClose,
  menuItems = [],
  crmCustomers = [],
  activeTables = [],
  currentUser = { name: 'Rajan (POS 01)', role: 'CASHIER' },
  settings = {},
  onBillCreated, // callback(bill, thermalSlip, openEditBeforePrint)
  onEditBeforePrint, // callback to directly open EditBillBeforePrintModal
}) {

  // Order Type & Table
  const [orderType, setOrderType] = useState('DINE_IN');
  const [tableNumber, setTableNumber] = useState('01');

  // Customer Information
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCrmDropdown, setShowCrmDropdown] = useState(false);
  const [customer, setCustomer] = useState({
    name: 'Walk-in Guest',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    tag: 'Walk-in',
  });

  // Items in Manual Bill
  const [cartItems, setCartItems] = useState([
    // Seed with 1 initial dish if available for instant usability
  ]);

  // Menu Search & Category Filter
  const [menuSearch, setMenuSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Custom Item Drawer/Form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customItem, setCustomItem] = useState({
    title: '',
    tamilTitle: '',
    price: '',
    quantity: 1,
    station: 'TIFFIN',
    specialNotes: '',
  });

  // Adjustments & Taxes
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountFlat, setDiscountFlat] = useState('');
  const [discountReason, setDiscountReason] = useState('Manual Counter Billing');
  const [packagingCharge, setPackagingCharge] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [taxExempt, setTaxExempt] = useState(false);

  // Payment Settlement
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Default CGST / SGST rates
  const cgstRate = taxExempt ? 0 : (settings?.billing_payments?.taxRateCgst ?? settings?.taxRateCgst ?? 2.5);
  const sgstRate = taxExempt ? 0 : (settings?.billing_payments?.taxRateSgst ?? settings?.taxRateSgst ?? 2.5);

  // CRM suggestions filter
  const crmMatches = useMemo(() => {
    if (!customerSearch || customerSearch.trim().length < 2) return [];
    const q = customerSearch.toLowerCase().trim();
    return (crmCustomers || []).filter(
      c => (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q))
    ).slice(0, 6);
  }, [customerSearch, crmCustomers]);

  // Menu Items Filter
  const filteredMenu = useMemo(() => {
    return (menuItems || []).filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch =
        !menuSearch ||
        (item.title && item.title.toLowerCase().includes(menuSearch.toLowerCase())) ||
        (item.tamilTitle && item.tamilTitle.includes(menuSearch));
      return matchCat && matchSearch;
    });
  }, [menuItems, activeCategory, menuSearch]);

  // Unique Categories from Menu
  const categories = useMemo(() => {
    const set = new Set(['Tiffin', 'Meals', 'Chettinad', 'Beverages', 'Dessert']);
    (menuItems || []).forEach(m => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [menuItems]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (it.quantity || 1), 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (Number(discountFlat) > 0) {
      return Math.min(subtotal, Number(discountFlat));
    }
    if (Number(discountPercent) > 0) {
      return Math.min(subtotal, (subtotal * Number(discountPercent)) / 100);
    }
    return 0;
  }, [subtotal, discountFlat, discountPercent]);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const scAmount = serviceChargeEnabled ? (discountedSubtotal * 5) / 100 : 0;
  const packAmount = Math.max(0, Number(packagingCharge) || 0);
  const delAmount = Math.max(0, Number(deliveryCharge) || 0);

  const taxableAmount = discountedSubtotal + scAmount;
  const cgst = (taxableAmount * cgstRate) / 100;
  const sgst = (taxableAmount * sgstRate) / 100;

  const rawTotal = taxableAmount + cgst + sgst + packAmount + delAmount;
  const grandTotal = Math.round(rawTotal);
  const roundOff = Number((grandTotal - rawTotal).toFixed(2));

  // Change due calculator
  const changeDue = useMemo(() => {
    if (paymentMode !== 'CASH' || !cashTendered || isNaN(cashTendered)) return 0;
    return Math.max(0, Number(cashTendered) - grandTotal);
  }, [paymentMode, cashTendered, grandTotal]);

  // Add dish from catalog
  const handleAddDish = (dish) => {
    setCartItems(prev => {
      const existingIdx = prev.findIndex(i => i.id === dish.id && !i.isCustom && !i.variant);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].quantity += 1;
        return next;
      }
      return [
        ...prev,
        {
          id: dish.id,
          title: dish.title,
          tamilTitle: dish.tamilTitle || '',
          price: Number(dish.price) || 0,
          quantity: 1,
          variant: null,
          addOns: [],
          specialNotes: '',
          isCustom: false,
        },
      ];
    });
  };

  // Add custom item
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItem.title.trim() || isNaN(customItem.price) || Number(customItem.price) <= 0) {
      setErrorMsg('Please enter valid item title and price');
      return;
    }
    setErrorMsg('');
    setCartItems(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: customItem.title.trim(),
        tamilTitle: customItem.tamilTitle.trim(),
        price: Number(customItem.price),
        quantity: Math.max(1, Number(customItem.quantity) || 1),
        station: customItem.station || 'TIFFIN',
        specialNotes: customItem.specialNotes.trim(),
        isCustom: true,
      },
    ]);
    setCustomItem({
      title: '',
      tamilTitle: '',
      price: '',
      quantity: 1,
      station: 'TIFFIN',
      specialNotes: '',
    });
    setShowCustomForm(false);
  };

  // Update line item
  const handleUpdateQty = (idx, delta) => {
    setCartItems(prev => {
      const next = [...prev];
      const newQty = (next[idx].quantity || 1) + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== idx);
      }
      next[idx].quantity = newQty;
      return next;
    });
  };

  const handleUpdateRate = (idx, newRate) => {
    setCartItems(prev => {
      const next = [...prev];
      next[idx].price = Math.max(0, parseFloat(newRate) || 0);
      return next;
    });
  };

  const handleDeleteItem = (idx) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit manual bill
  const handleSaveBill = async (actionType = 'SETTLE_AND_PRINT') => {
    if (cartItems.length === 0) {
      setErrorMsg('Please add at least one item to generate bill');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_MANUAL_BILL',
          customer,
          orderType,
          tableNumber: orderType === 'TAKEAWAY' ? 'TK' : orderType === 'DELIVERY' ? 'DEL' : tableNumber,
          items: cartItems,
          discountPercent: Number(discountPercent) || 0,
          discountFlat: Number(discountFlat) || 0,
          discountReason,
          packagingCharge: Number(packagingCharge) || 0,
          deliveryCharge: Number(deliveryCharge) || 0,
          serviceChargeEnabled,
          taxRateCgst: cgstRate,
          taxRateSgst: sgstRate,
          paymentMode,
          transactionRef,
          cashierName: currentUser.name,
          customNotes,
        }),
      });

      const data = await res.json();
      if (data.success && data.bill) {
        if (actionType === 'EDIT_BEFORE_PRINT') {
          // Open edit modal directly with this fresh bill!
          if (onEditBeforePrint) {
            onEditBeforePrint(data.bill, data.thermalReceipt);
          }
          onClose();
        } else {
          if (onBillCreated) {
            onBillCreated(data.bill, data.thermalReceipt, actionType === 'SETTLE_AND_PRINT');
          }
          onClose();
        }
      } else {
        setErrorMsg(data.error || 'Failed to create manual bill');
      }
    } catch (err) {
      setErrorMsg('Network error creating manual bill');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>
              🧾 Create Manual Customer Bill
            </h2>
            <div className={styles.headerSub}>
              Direct counter sale, custom quote, takeaway parcel, or offline guest invoice
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Top Config: Order Type & Table Selection */}
          <div className={styles.topConfigBar}>
            <div className={styles.orderTypeGroup}>
              <span className={styles.label}>Order Type:</span>
              <button
                type="button"
                className={`${styles.orderTypeBtn} ${orderType === 'DINE_IN' ? styles.orderTypeBtnActive : ''}`}
                onClick={() => setOrderType('DINE_IN')}
              >
                🍽️ Dine-In
              </button>
              <button
                type="button"
                className={`${styles.orderTypeBtn} ${orderType === 'TAKEAWAY' ? styles.orderTypeBtnActive : ''}`}
                onClick={() => setOrderType('TAKEAWAY')}
              >
                🥡 Takeaway / Parcel
              </button>
              <button
                type="button"
                className={`${styles.orderTypeBtn} ${orderType === 'DELIVERY' ? styles.orderTypeBtnActive : ''}`}
                onClick={() => setOrderType('DELIVERY')}
              >
                🛵 Delivery
              </button>
            </div>

            {orderType === 'DINE_IN' && (
              <div className={styles.tableInputWrap}>
                <span className={styles.label}>Table #:</span>
                <input
                  type="text"
                  className={styles.inputSmall}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="01"
                />
              </div>
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Operator: <strong style={{ color: '#38bdf8' }}>{currentUser.name}</strong>
            </div>
          </div>

          {/* Customer Details Section */}
          <div className={styles.customerSection}>
            <div className={styles.sectionHeading}>
              <span>👤 Customer Information &amp; GST Details</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Optional • Type phone to auto-lookup CRM profile
              </span>
            </div>

            <div className={styles.customerGrid}>
              <div className={styles.inputGroup} style={{ position: 'relative' }}>
                <label className={styles.label}>Customer Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Ramesh Kumar / Walk-in Guest"
                  value={customer.name}
                  onChange={(e) => {
                    setCustomer(prev => ({ ...prev, name: e.target.value }));
                    setCustomerSearch(e.target.value);
                    setShowCrmDropdown(true);
                  }}
                  onFocus={() => setShowCrmDropdown(true)}
                />

                {/* CRM Autocomplete suggestions */}
                {showCrmDropdown && crmMatches.length > 0 && (
                  <div className={styles.crmSuggestions}>
                    {crmMatches.map(c => (
                      <div
                        key={c.id || c.phone}
                        className={styles.crmItem}
                        onClick={() => {
                          setCustomer({
                            name: c.name || '',
                            phone: c.phone || '',
                            email: c.email || '',
                            address: c.address || '',
                            gstin: c.gstin || '',
                            tag: c.tag || 'Regular',
                          });
                          setShowCrmDropdown(false);
                        }}
                      >
                        <div>
                          <strong>{c.name}</strong> • {c.phone}
                        </div>
                        <span style={{ color: '#10b981', fontSize: '0.72rem' }}>
                          ⭐ {c.loyaltyPoints || 0} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Phone Number</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="+91 98765 43210"
                  value={customer.phone}
                  onChange={(e) => {
                    setCustomer(prev => ({ ...prev, phone: e.target.value }));
                    setCustomerSearch(e.target.value);
                    setShowCrmDropdown(true);
                  }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Customer GSTIN (B2B)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="33XXXXX0000X0Z0"
                  value={customer.gstin}
                  onChange={(e) => setCustomer(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Customer Tag / Segment</label>
                <select
                  className={styles.input}
                  value={customer.tag}
                  onChange={(e) => setCustomer(prev => ({ ...prev, tag: e.target.value }))}
                >
                  <option value="Walk-in">Walk-in Guest</option>
                  <option value="Regular">Regular Patron</option>
                  <option value="VIP">VIP Guest</option>
                  <option value="Corporate">Corporate / B2B</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main 2-Column Split: Left Menu & Custom Item, Right Cart & Bill */}
          <div className={styles.mainSplit}>
            {/* Column 1: Food Menu Catalog + Custom Item Creator */}
            <div className={styles.catalogBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.88rem', color: '#10b981' }}>
                  🍽️ Add Menu Dishes
                </strong>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => setShowCustomForm(!showCustomForm)}
                >
                  {showCustomForm ? '✕ Close Custom Item' : '✨ + Add Custom Item'}
                </button>
              </div>

              {/* Custom Item Drawer Form */}
              {showCustomForm ? (
                <form className={styles.customItemForm} onSubmit={handleAddCustomItem}>
                  <strong style={{ fontSize: '0.82rem', color: '#38bdf8' }}>
                    ✨ Add Custom / Off-Menu Dish
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Item Title (English) *"
                      required
                      value={customItem.title}
                      onChange={e => setCustomItem(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Item Title (Tamil)"
                      value={customItem.tamilTitle}
                      onChange={e => setCustomItem(prev => ({ ...prev, tamilTitle: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="Price (₹) *"
                      required
                      min="0"
                      step="any"
                      value={customItem.price}
                      onChange={e => setCustomItem(prev => ({ ...prev, price: e.target.value }))}
                    />
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="Quantity"
                      min="1"
                      value={customItem.quantity}
                      onChange={e => setCustomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                    <select
                      className={styles.input}
                      value={customItem.station}
                      onChange={e => setCustomItem(prev => ({ ...prev, station: e.target.value }))}
                    >
                      <option value="TIFFIN">Tiffin</option>
                      <option value="MEALS">Meals</option>
                      <option value="BEVERAGES">Beverages</option>
                      <option value="SNACKS">Snacks / Sweets</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Special Notes (e.g. 500g sweet box / Less spicy / Extra ghee)"
                    value={customItem.specialNotes}
                    onChange={e => setCustomItem(prev => ({ ...prev, specialNotes: e.target.value }))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className={styles.btnCancel}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => setShowCustomForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.btnSettlePrint}
                      style={{ padding: '0.35rem 0.9rem', fontSize: '0.78rem' }}
                    >
                      + Add to Cart
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Search Input */}
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="🔍 Search dishes (Dosa, Coffee, Meals, Idli)..."
                    value={menuSearch}
                    onChange={e => setMenuSearch(e.target.value)}
                  />

                  {/* Category Pills */}
                  <div className={styles.catPills}>
                    <button
                      type="button"
                      className={`${styles.catPill} ${activeCategory === 'all' ? styles.catPillActive : ''}`}
                      onClick={() => setActiveCategory('all')}
                    >
                      All
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`${styles.catPill} ${activeCategory === cat ? styles.catPillActive : ''}`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Dish List */}
                  <div className={styles.dishList}>
                    {filteredMenu.slice(0, 20).map(d => (
                      <div key={d.id} className={styles.dishCard} onClick={() => handleAddDish(d)}>
                        <div>
                          <div className={styles.dishTitle}>{d.title}</div>
                          {d.tamilTitle && <div className={styles.dishTamil}>{d.tamilTitle}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={styles.dishPrice}>₹{d.price}</span>
                          <span style={{ fontSize: '0.75rem', background: '#059669', color: '#fff', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 'bold' }}>
                            + Add
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={styles.addCustomBtn}
                    onClick={() => setShowCustomForm(true)}
                  >
                    ✨ + Add Custom / Off-Menu Special Item
                  </button>
                </>
              )}
            </div>

            {/* Column 2: Live Bill Items Cart & Calculation Breakdown */}
            <div className={styles.cartBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.88rem', color: '#38bdf8' }}>
                  🛒 Bill Items ({cartItems.length})
                </strong>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                    onClick={() => setCartItems([])}
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Items Table */}
              <div className={styles.cartTableWrap}>
                {cartItems.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    🛒 Cart is empty. Select items from the menu or add a custom item.
                  </div>
                ) : (
                  <table className={styles.cartTable}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ width: '85px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '70px', textAlign: 'right' }}>Rate (₹)</th>
                        <th style={{ width: '65px', textAlign: 'right' }}>Total (₹)</th>
                        <th style={{ width: '25px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td>
                            <strong style={{ color: '#fff' }}>{it.title}</strong>
                            {it.isCustom && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.1rem 0.3rem', borderRadius: '3px', marginLeft: '0.3rem' }}>
                                Custom
                              </span>
                            )}
                            {it.tamilTitle && (
                              <div style={{ fontSize: '0.7rem', color: '#10b981' }}>{it.tamilTitle}</div>
                            )}
                            {it.specialNotes && (
                              <div style={{ fontSize: '0.7rem', color: '#eab308' }}>* {it.specialNotes}</div>
                            )}
                          </td>
                          <td>
                            <div className={styles.qtyControl}>
                              <button type="button" className={styles.qtyBtn} onClick={() => handleUpdateQty(idx, -1)}>-</button>
                              <input
                                type="text"
                                className={styles.qtyInput}
                                value={it.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleUpdateQty(idx, (isNaN(val) ? 1 : val) - it.quantity);
                                }}
                              />
                              <button type="button" className={styles.qtyBtn} onClick={() => handleUpdateQty(idx, 1)}>+</button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              className={styles.rateInput}
                              value={it.price}
                              onChange={(e) => handleUpdateRate(idx, e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#38bdf8' }}>
                            ₹{Math.round((it.price || 0) * (it.quantity || 1))}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.deleteItemBtn}
                              onClick={() => handleDeleteItem(idx)}
                              title="Delete Item"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Adjustments: Discounts, Packaging, Delivery, Taxes */}
              <div className={styles.adjustmentsGrid}>
                <div>
                  <label className={styles.label}>Discount (%)</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 10"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={e => {
                      setDiscountPercent(e.target.value);
                      if (e.target.value) setDiscountFlat('');
                    }}
                  />
                </div>
                <div>
                  <label className={styles.label}>Discount Flat (₹)</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 50"
                    min="0"
                    value={discountFlat}
                    onChange={e => {
                      setDiscountFlat(e.target.value);
                      if (e.target.value) setDiscountPercent('');
                    }}
                  />
                </div>
                <div>
                  <label className={styles.label}>Parcel Fee (₹)</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="0"
                    min="0"
                    value={packagingCharge}
                    onChange={e => setPackagingCharge(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.label}>Delivery Fee (₹)</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="0"
                    min="0"
                    value={deliveryCharge}
                    onChange={e => setDeliveryCharge(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick Tax & Service Charge Toggles */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.78rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={serviceChargeEnabled}
                    onChange={e => setServiceChargeEnabled(e.target.checked)}
                  />
                  <span>Add 5% Service Charge</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={taxExempt}
                    onChange={e => setTaxExempt(e.target.checked)}
                  />
                  <span>Tax Exempt (0% GST)</span>
                </label>
              </div>

              {/* Totals Summary */}
              <div>
                <div className={styles.totalsRow}>
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className={styles.totalsRow} style={{ color: '#ef4444' }}>
                    <span>Discount ({discountPercent ? `${discountPercent}%` : 'Flat'}):</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {packAmount > 0 && (
                  <div className={styles.totalsRow}>
                    <span>Parcel / Packaging Fee:</span>
                    <span>+₹{packAmount.toFixed(2)}</span>
                  </div>
                )}
                {delAmount > 0 && (
                  <div className={styles.totalsRow}>
                    <span>Delivery Fee:</span>
                    <span>+₹{delAmount.toFixed(2)}</span>
                  </div>
                )}
                {!taxExempt && (
                  <div className={styles.totalsRow}>
                    <span>Taxes (CGST {cgstRate}% + SGST {sgstRate}%):</span>
                    <span>+₹{(cgst + sgst).toFixed(2)}</span>
                  </div>
                )}
                {roundOff !== 0 && (
                  <div className={styles.totalsRow}>
                    <span>Round-Off:</span>
                    <span>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                  </div>
                )}

                {/* Big Grand Total */}
                <div className={styles.grandTotalRow}>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    GRAND TOTAL:
                  </strong>
                  <span className={styles.grandTotalAmount}>
                    ₹{grandTotal}
                  </span>
                </div>
              </div>

              {/* Payment Settlement Modes */}
              <div>
                <label className={styles.label} style={{ marginBottom: '0.35rem', display: 'block' }}>
                  Payment Method:
                </label>
                <div className={styles.paymentModes}>
                  {[
                    { id: 'CASH', label: '💵 Cash' },
                    { id: 'ONLINE_UPI', label: '📱 UPI (GPay/PhonePe)' },
                    { id: 'CARD', label: '💳 Card EDC' },
                    { id: 'CREDIT_DUE', label: '📋 Credit / Due' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.payModeBtn} ${paymentMode === m.id ? styles.payModeBtnActive : ''}`}
                      onClick={() => setPaymentMode(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Tendered Calculator */}
              {paymentMode === 'CASH' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                  <div>
                    <label className={styles.label}>Cash Received (₹)</label>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder={`e.g. ${grandTotal}`}
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                    />
                  </div>
                  {Number(cashTendered) > grandTotal && (
                    <div className={styles.changeDueBanner}>
                      <span>Change to Return:</span>
                      <strong style={{ fontSize: '1rem', color: '#10b981' }}>₹{changeDue}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Ref / Note */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Txn Ref / UTR / Auth Code (Optional)"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Bill Remarks / Special Instructions"
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={submitting}>
            Cancel
          </button>

          <div className={styles.actionButtonGroup}>
            <button
              type="button"
              className={styles.btnEditBeforePrint}
              disabled={submitting || cartItems.length === 0}
              onClick={() => handleSaveBill('EDIT_BEFORE_PRINT')}
              title="Save manual bill and open comprehensive preview & slip editor before printing"
            >
              ✏️ Settle &amp; Edit Before Print
            </button>

            <button
              type="button"
              className={styles.btnSettlePrint}
              disabled={submitting || cartItems.length === 0}
              onClick={() => handleSaveBill('SETTLE_AND_PRINT')}
              title="Save manual bill and immediately print 80mm thermal slip"
            >
              {submitting ? 'Settling...' : `🖨️ Settle & Direct Print (₹${grandTotal})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
