'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import jsQR from 'jsqr';
import styles from './QrModal.module.css';

// Sound effect helper using Web Audio API
function playScanSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {
    // Audio Context blocked or not supported
  }
}

// Table zone names for rich diner feedback
const TABLE_ZONES = {
  '01': 'AC Heritage Hall',
  '02': 'AC Heritage Hall',
  '03': 'AC Heritage Hall',
  '04': 'Chettinad Family Section',
  '05': 'Chettinad Family Section',
  '06': 'Chettinad Family Section',
  '07': 'Heritage Courtyard',
  '08': 'Heritage Courtyard (Adjacent)',
  '09': 'Heritage Courtyard',
  '10': 'Garden Terrace',
  '11': 'Garden Terrace',
  '12': 'Garden Terrace',
};

function getTableZone(tableId) {
  return TABLE_ZONES[tableId] || `Dining Section (Table #${tableId})`;
}

// Extract table number from QR code payload (URL, JSON, key-value, or raw digits)
function extractTableFromQrPayload(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const str = payload.trim();

  // 1. URL pattern: e.g. https://domain.com/?table=07 or http://localhost:3000/?table=7 or /?table=12
  if (str.includes('table=')) {
    const match = str.match(/[?&]table=([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1].padStart(2, '0');
    }
  }

  // 2. JSON pattern: {"table": "07"} or {"tableId": 7}
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      const val = parsed.table || parsed.tableId || parsed.tableNum || parsed.id;
      if (val) return String(val).padStart(2, '0');
    } catch (e) {}
  }

  // 3. String pattern: "table:07", "table #07", "table 07", "table=07"
  const kvMatch = str.match(/table[:#=\s]+([0-9a-zA-Z]+)/i);
  if (kvMatch && kvMatch[1]) {
    return kvMatch[1].padStart(2, '0');
  }

  // 4. Plain table digits e.g. "07", "7"
  if (/^[0-9]{1,3}$/.test(str)) {
    return str.padStart(2, '0');
  }

  return null;
}

export default function QrModal({ isOpen, onClose, initialTables = [], onConfirmTables }) {
  const [mounted, setMounted] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);
  const [mode, setMode] = useState('scanning'); // 'scanning' | 'detected'
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'tables' | 'standee'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameId = useRef(null);
  const isScanningActive = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize initial tables and state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTables(initialTables && initialTables.length > 0 ? initialTables : []);
      setMode('scanning');
      setActiveTab('scanner');
      setCameraError(null);
      setUploadError(null);
    } else {
      stopCamera();
    }
  }, [isOpen, initialTables]);

  // Clean stop of camera tracks and scanning loop
  const stopCamera = useCallback(() => {
    isScanningActive.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  }, []);

  // Frame processing loop with BarcodeDetector and jsQR fallback
  const startScanningLoop = useCallback(() => {
    isScanningActive.current = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let hasBarcodeDetector = false;
    let barcodeDetector = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        hasBarcodeDetector = true;
      } catch (e) {
        hasBarcodeDetector = false;
      }
    }

    let lastScanTime = 0;

    const scanFrame = async (timestamp) => {
      if (!isScanningActive.current || !videoRef.current) return;
      const video = videoRef.current;

      // Throttle scanning to every ~120ms for battery and performance efficiency
      if (
        timestamp - lastScanTime >= 120 &&
        video.readyState >= video.HAVE_CURRENT_DATA &&
        video.videoWidth > 0
      ) {
        lastScanTime = timestamp;
        let detectedPayload = null;

        // Priority 1: Hardware-accelerated BarcodeDetector
        if (hasBarcodeDetector && barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedPayload = barcodes[0].rawValue;
            }
          } catch (e) {}
        }

        // Priority 2: Universal JavaScript jsQR decoder via offscreen canvas
        if (!detectedPayload && video.videoWidth > 0 && video.videoHeight > 0) {
          try {
            canvas.width = Math.min(video.videoWidth, 640);
            canvas.height = Math.min(video.videoHeight, 480);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (qrResult && qrResult.data) {
              detectedPayload = qrResult.data;
            }
          } catch (e) {}
        }

        if (detectedPayload) {
          const tableId = extractTableFromQrPayload(detectedPayload);
          if (tableId) {
            handleDetectTable(tableId);
            return;
          }
        }
      }

      if (isScanningActive.current) {
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameId.current = requestAnimationFrame(scanFrame);
  }, []);

  // Start video stream with safe guards against undefined mediaDevices
  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera API unavailable or context insecure');
      setCameraError(
        'Camera access is unavailable or denied in this browser. You can select your dining table directly from the "Select Table" tab above, upload a photo, or scan using your phone camera.'
      );
      setCameraLoading(false);
      setCameraActive(false);
      return;
    }

    setCameraLoading(true);
    setCameraError(null);

    let stream = null;

    // 1. Try back/environment camera (optimal for table standee on mobile)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err1) {
      // 2. Fallback to any available camera (e.g. laptop webcam or front camera)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2) {
        console.warn('Camera stream unavailable or permission denied:', err2);
        setCameraError(
          'Camera access is unavailable or denied by your browser. You can allow camera permission in browser settings, or simply pick your table from the "Select Table" tab.'
        );
        setCameraLoading(false);
        setCameraActive(false);
        return;
      }
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.onloadedmetadata = () => {
        if (!videoRef.current) return;
        videoRef.current
          .play()
          .then(() => {
            setCameraActive(true);
            setCameraLoading(false);
            startScanningLoop();
          })
          .catch((e) => {
            console.warn('Video playback error:', e);
            setCameraLoading(false);
          });
      };
    }
  }, [startScanningLoop]);

  // Handle active camera lifecycle
  useEffect(() => {
    if (!isOpen || mode !== 'scanning' || activeTab !== 'scanner') {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, activeTab, startCamera, stopCamera]);

  // Handle detection or selection of a valid table
  const handleDetectTable = (tableId) => {
    playScanSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([80, 40, 80]); } catch (e) {}
    }

    setSelectedTables((prev) => {
      if (prev.includes(tableId)) return prev;
      return [...prev, tableId];
    });

    stopCamera();
    setMode('detected');
  };

  // Add another table (Family Feast / Joined Tables)
  const handleAddAnotherTable = () => {
    setMode('scanning');
    setActiveTab('tables');
  };

  // Remove a specific table from joined list
  const handleRemoveTable = (tableId) => {
    if (selectedTables.length <= 1) return;
    setSelectedTables((prev) => prev.filter((id) => id !== tableId));
  };

  // Proceed to Menu & Ordering with confirmed tables
  const handleProceedToMenu = () => {
    stopCamera();
    if (onConfirmTables) {
      onConfirmTables(selectedTables);
    }
    onClose();

    // Smooth scroll to menu section
    const el = document.getElementById('menu');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // File upload for scanning standee QR from gallery or photo
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (qrResult && qrResult.data) {
            const tableId = extractTableFromQrPayload(qrResult.data);
            if (tableId) {
              handleDetectTable(tableId);
              return;
            }
          }
          setUploadError('No valid table QR code found in this photo. Please ensure the table standee QR is clearly visible.');
        } catch (err) {
          console.error('Image decoding error:', err);
          setUploadError('Could not process this image. Please try another photo.');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleWrap}>
            <span className={styles.headerIcon}>📲</span>
            <div>
              <h3 className={styles.headerTitle}>Table QR Dine-In</h3>
              <p className={styles.headerSubtitle}>Sri Gokulam Pure Veg • Contactless Ordering</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close QR Scanner"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation (When choosing or scanning table) */}
        {mode === 'scanning' && (
          <div className={styles.tabNav}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'scanner' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('scanner')}
            >
              <span>📸</span> Camera Scanner
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'tables' ? styles.tabBtnActive : ''}`}
              onClick={() => {
                stopCamera();
                setActiveTab('tables');
              }}
            >
              <span>🍽️</span> Select Table
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'standee' ? styles.tabBtnActive : ''}`}
              onClick={() => {
                stopCamera();
                setActiveTab('standee');
              }}
            >
              <span>📲</span> Standee QR
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className={styles.body}>
          {mode === 'scanning' ? (
            <>
              {/* TAB 1: LIVE CAMERA SCANNER */}
              {activeTab === 'scanner' && (
                <div className={styles.scannerWrapper}>
                  <div className={styles.viewfinderBox}>
                    {/* Real Live Camera Video Stream */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={styles.cameraVideo}
                      style={{ opacity: cameraActive ? 1 : 0 }}
                    />

                    {/* Loading state before camera starts */}
                    {cameraLoading && (
                      <div className={styles.cameraLoadingOverlay}>
                        <div className={styles.spinner}></div>
                        <span>Initializing camera...</span>
                      </div>
                    )}

                    {/* Camera Error or Permission Denied Placeholder */}
                    {cameraError && !cameraLoading && (
                      <div className={styles.cameraErrorOverlay}>
                        <span className={styles.errorIcon}>📷</span>
                        <strong>Camera Not Available</strong>
                        <p>{cameraError}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className={styles.btnRetryCamera}
                            onClick={startCamera}
                          >
                            🔄 Retry Camera
                          </button>
                          <button
                            type="button"
                            className={styles.btnRetryCamera}
                            style={{ background: '#f59e0b', color: '#051B41' }}
                            onClick={() => {
                              stopCamera();
                              setActiveTab('tables');
                            }}
                          >
                            🍽️ Pick Table
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Scanning Elements (Laser & Corner Brackets) */}
                    {cameraActive && (
                      <>
                        <div className={styles.scanningLaser}></div>
                        <div className={`${styles.corner} ${styles.cornerTL}`}></div>
                        <div className={`${styles.corner} ${styles.cornerTR}`}></div>
                        <div className={`${styles.corner} ${styles.cornerBL}`}></div>
                        <div className={`${styles.corner} ${styles.cornerBR}`}></div>

                        {/* Viewfinder Status Overlay */}
                        <div className={styles.viewfinderStatus}>
                          <span className={styles.pulsingDot}></span>
                          {selectedTables.length > 0
                            ? `Joined: Table #${selectedTables.join(', #')} • Align next QR`
                            : 'Align table QR standee inside frame...'}
                        </div>
                      </>
                    )}
                  </div>

                  <p className={styles.scanInstruction}>
                    🎯 Point your camera directly at the QR code on your dining table standee.
                  </p>

                  {/* Upload Standee Photo Option */}
                  <div className={styles.photoUploadRow}>
                    <button
                      type="button"
                      className={styles.btnUploadPhoto}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span>🖼️</span> Scan Standee QR from Photo / Gallery
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </div>

                  {uploadError && (
                    <div className={styles.uploadErrorAlert}>
                      <span>⚠️</span> {uploadError}
                    </div>
                  )}

                  {/* Native Scanner & Google Lens Workflow Guidance */}
                  <div className={styles.externalScanCard}>
                    <div className={styles.externalScanHeader}>
                      <div className={styles.externalIconsBadge}>
                        <span className={styles.lensBadge}>Google Lens</span>
                        <span className={styles.camBadge}>Phone Camera</span>
                      </div>
                      <span className={styles.recommendedPill}>✨ Instant Access</span>
                    </div>
                    <h4 className={styles.externalScanTitle}>Scan Directly with Your Phone</h4>
                    <p className={styles.externalScanDesc}>
                      You don&apos;t need to stay in this browser scanner! Open your native phone camera or Google Lens to scan the table standee directly:
                    </p>

                    <div className={styles.stepsGrid}>
                      <div className={styles.stepItem}>
                        <span className={styles.stepNum}>1</span>
                        <div className={styles.stepContent}>
                          <strong>Open Phone Camera or Google Lens</strong>
                          <small>No app install needed on iOS or Android</small>
                        </div>
                      </div>
                      <div className={styles.stepItem}>
                        <span className={styles.stepNum}>2</span>
                        <div className={styles.stepContent}>
                          <strong>Point at Table Standee</strong>
                          <small>Your camera instantly detects the table link</small>
                        </div>
                      </div>
                      <div className={styles.stepItem}>
                        <span className={styles.stepNum}>3</span>
                        <div className={styles.stepContent}>
                          <strong>Tap the Banner to Dine-In</strong>
                          <small>Sri Gokulam opens with your table connected</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DIRECT TABLE SELECTOR */}
              {activeTab === 'tables' && (
                <div className={styles.quickTableWrapper}>
                  <p className={styles.quickTableIntro}>
                    Sitting at Sri Gokulam? Tap your dining table number below to connect your order directly to the kitchen:
                  </p>
                  <div className={styles.tablesGrid}>
                    {Object.entries(TABLE_ZONES).map(([tblNum, zone]) => (
                      <button
                        key={tblNum}
                        type="button"
                        className={`${styles.tableSelectCard} ${selectedTables.includes(tblNum) ? styles.tableSelectCardActive : ''}`}
                        onClick={() => handleDetectTable(tblNum)}
                      >
                        <span className={styles.tableCardNum}>Table #{tblNum}</span>
                        <span className={styles.tableCardZone}>{zone}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: RESTAURANT STANDEE QR CODE */}
              {activeTab === 'standee' && (
                <div className={styles.standeeQrWrapper}>
                  <div className={styles.standeeQrCard}>
                    <img
                      src="/restaurant_logo.jpg"
                      alt="Sri Gokulam Veg Restaurant Logo"
                      className={styles.standeeLogo}
                    />
                    <h4 className={styles.standeeRestaurantName}>SRI GOKULAM</h4>
                    <span className={styles.standeeSubtitle}>Karaikudi Chettinad Heritage Pure Veg</span>

                    <div className={styles.standeeQrBox}>
                      {/* Crisp Vector QR Code for Table Dine-In */}
                      <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="180" height="180" rx="10" fill="#ffffff"/>
                        {/* Corner Top-Left */}
                        <rect x="15" y="15" width="45" height="45" rx="6" fill="#051B41"/>
                        <rect x="23" y="23" width="29" height="29" rx="3" fill="#ffffff"/>
                        <rect x="30" y="30" width="15" height="15" rx="2" fill="#0059B3"/>
                        {/* Corner Top-Right */}
                        <rect x="120" y="15" width="45" height="45" rx="6" fill="#051B41"/>
                        <rect x="128" y="23" width="29" height="29" rx="3" fill="#ffffff"/>
                        <rect x="135" y="30" width="15" height="15" rx="2" fill="#0059B3"/>
                        {/* Corner Bottom-Left */}
                        <rect x="15" y="120" width="45" height="45" rx="6" fill="#051B41"/>
                        <rect x="23" y="128" width="29" height="29" rx="3" fill="#ffffff"/>
                        <rect x="30" y="135" width="15" height="15" rx="2" fill="#0059B3"/>
                        {/* Data Pattern */}
                        <rect x="70" y="20" width="10" height="20" fill="#051B41"/>
                        <rect x="90" y="15" width="15" height="10" fill="#051B41"/>
                        <rect x="85" y="35" width="20" height="10" fill="#051B41"/>
                        <rect x="20" y="70" width="20" height="10" fill="#051B41"/>
                        <rect x="30" y="90" width="10" height="15" fill="#051B41"/>
                        <rect x="50" y="75" width="15" height="15" fill="#051B41"/>
                        <rect x="75" y="65" width="30" height="10" fill="#051B41"/>
                        <rect x="70" y="85" width="15" height="30" fill="#051B41"/>
                        <rect x="95" y="85" width="20" height="15" fill="#0059B3"/>
                        <rect x="95" y="110" width="15" height="15" fill="#051B41"/>
                        <rect x="120" y="70" width="15" height="15" fill="#051B41"/>
                        <rect x="145" y="75" width="20" height="10" fill="#051B41"/>
                        <rect x="135" y="95" width="15" height="20" fill="#051B41"/>
                        <rect x="70" y="130" width="15" height="15" fill="#051B41"/>
                        <rect x="70" y="150" width="25" height="10" fill="#051B41"/>
                        <rect x="105" y="135" width="20" height="10" fill="#051B41"/>
                        <rect x="135" y="130" width="15" height="15" fill="#051B41"/>
                        <rect x="125" y="150" width="25" height="15" fill="#0059B3"/>
                        {/* Center Brand Accent */}
                        <circle cx="90" cy="90" r="10" fill="#f59e0b"/>
                        <circle cx="90" cy="90" r="6" fill="#051B41"/>
                      </svg>
                    </div>

                    <span className={styles.standeeTableBadge}>Table Standee #07 (Demo)</span>
                  </div>

                  <p className={styles.standeeInstructions}>
                    📱 <strong>Test with your phone:</strong> Open Google Lens or your phone camera and point at this screen, or tap <strong>&ldquo;Select Table&rdquo;</strong> to pick your table directly!
                  </p>

                  <button
                    type="button"
                    className={styles.btnLaunchScanner}
                    style={{
                      background: 'var(--gold-pill, linear-gradient(180deg, #fce59b 0%, #e2a628 50%, #bf8111 100%))',
                      color: 'var(--midnight-blue, #051B41)',
                      fontWeight: '800',
                      padding: '12px 24px',
                      borderRadius: '25px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 15px rgba(220, 162, 37, 0.4)',
                    }}
                    onClick={() => handleDetectTable('07')}
                  >
                    ✨ Connect Table #07 Directly &amp; Continue →
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ==========================================================
               STEP 2: TABLE DETECTED & MULTIPLE TABLES OPTION
               ========================================================== */
            <div className={styles.detectedWrapper}>
              <div className={styles.detectedCard}>
                <div className={styles.greenCheckEmblem}>✅</div>
                <h4 className={styles.detectedTitle}>Table Standee Connected!</h4>
                <p className={styles.detectedSubtitle}>
                  Verified and linked to Sri Gokulam Digital Dine-In System
                </p>

                {/* Active Tables List */}
                <div className={styles.tablesListCard}>
                  <span className={styles.tablesListHeading}>Active Dining Table(s):</span>
                  <div className={styles.tablesPillWrap}>
                    {selectedTables.map((tbl) => (
                      <div key={tbl} className={styles.tablePill}>
                        <div className={styles.tablePillInfo}>
                          <strong>🍽️ Table #{tbl}</strong>
                          <small>{getTableZone(tbl)}</small>
                        </div>
                        {selectedTables.length > 1 && (
                          <button
                            type="button"
                            className={styles.pillRemoveBtn}
                            onClick={() => handleRemoveTable(tbl)}
                            title="Remove Table"
                            aria-label={`Remove Table #${tbl}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedTables.length > 1 && (
                    <div className={styles.multiTableAlert}>
                      🎉 <strong>{selectedTables.length} Tables Joined!</strong> Your family group will be served under a single shared kitchen ticket (KOT).
                    </div>
                  )}
                </div>

                {/* Add Multiple Tables Button */}
                <div className={styles.multiTablePrompt}>
                  <p>Sitting across multiple tables or joined family group?</p>
                  <button
                    type="button"
                    className={styles.btnAddAnotherTable}
                    onClick={handleAddAnotherTable}
                  >
                    <span>➕</span> Scan &amp; Join Another Table Standee
                  </button>
                </div>

                {/* Proceed to Menu Button */}
                <div className={styles.proceedActions}>
                  <button
                    type="button"
                    className={styles.btnProceedMenu}
                    onClick={handleProceedToMenu}
                  >
                    <span>🍽️</span> Confirm Table #{selectedTables.join(' & #')} &amp; View Menu ➔
                  </button>
                  <button
                    type="button"
                    className={styles.btnRescan}
                    onClick={() => {
                      setSelectedTables([]);
                      setMode('scanning');
                      setActiveTab('tables');
                    }}
                  >
                    🔄 Clear &amp; Scan Different Table
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
