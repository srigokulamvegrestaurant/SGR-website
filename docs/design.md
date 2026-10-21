# Sri Gokulam Veg Restaurant (Karaikudi)
# Comprehensive UI/UX Design Specification (`design.md`)

> **Client Reference Model**: Incorporates the official brand logo (Lord Krishna Peacock Feather + Banana Leaf + Fork "G" Emblem) and the Chettinad Royal Heritage visual composition provided in reference materials.  
> **Status**: **Pending Client Approval** (Phase 1 development will commence only after explicit approval of this document).  
> **Prepared for**: Sri Gokulam Veg Restaurant, Karaikudi  
> **Digital Architecture Partner**: [AJ Tech Solutions](https://ajtechsolutions.netlify.app/)

---

## 1. Executive Visual Concept & Reference Alignment

The design harmonizes the spiritual divinity of **Lord Krishna** (*Gokulam*, *Mayil Peeli* - Peacock Feather, *Vennai* - Pure Butter) with the regal architectural grandeur of **Karaikudi and Chettinad** (Athangudi floor tiles, brass oil lamps, carved teakwood pillars, and fresh plantain leaves).

### 1.1 Brand Identity Elements (Direct from User Reference 1)
```
            ╭────────────────────────────────╮
           │   ╭───────╮      .-''''-.       │
          │   /  ____   \   .'   _    '.     │
         │   |  /    \   | /   .' \     \    │   Outer Ring:
        │    | |  🦚  |  |;   /    |     ;   │   Deep Royal Krishna Blue (#0A2D54)
        │    | |      |  ||  /     |     |   │
        │    | |      |  ||  |     |     |   │   Peacock Feather:
        │     \ \____/   / \  \___/     /    │   Turquoise, Royal Blue, Gold Eye
         │     \        /   '.        .'     │
          │     `------'      '-....-'       │   Lower Arc:
           │        🍃  \___/  🍴           │   Fresh Green Banana Leaf + White Fork
            ╰────────────────────────────────╯
```
* **Emblem Structure**: A circular monogram forming the capital letter **"G"** in deep royal Krishna blue (`#0A2D54`).
* **Upper Curve**: Houses a vibrant, hand-drawn **Lord Krishna Peacock Feather** (*Mayil Peeli*) with glowing cyan, emerald, royal blue, and golden eye tones.
* **Lower Curve**: Curves organically into a lush green **Plantain Leaf** (*Vazhai Ilai* - representing 100% pure sattvic vegetarian purity), seamlessly encasing a pristine white **Dining Fork**.
* **Bilingual Brand Wordmark** (as shown in User Reference 2):
  * **Tamil**: `ஸ்ரீ கோகுலம் சைவ உணவகம்` rendered in elegant gold leaf typography with ornamental flourishes.
  * **English**: `SRI GOKULAM VEG RESTAURANT` in bold, clean serif gold lettering.

---

## 2. Master Color Palette & Design Tokens

### 2.1 Color Tokens
```css
:root {
  /* Exact Client-Specified Blue Palette */
  --midnight-blue:             #051B41; /* Primary Deep Midnight Blue Background */
  --royal-blue:                #0E2954; /* Secondary Dark Royal Blue */
  --peacock-blue:              #004080; /* Bright Blue Peacock Accent (Base) */
  --peacock-bright:            #0059B3; /* Bright Blue Peacock Accent (Luminous) */
  --peacock-glow:              #0077e6; /* Active Glow & Hover Highlight */

  /* Dark Navy Gradients */
  --navy-gradient-linear:      linear-gradient(135deg, #051B41 0%, #0E2954 55%, #004080 100%);
  --navy-gradient-vertical:    linear-gradient(180deg, #051B41 0%, #0E2954 100%);
  --navy-gradient-radial:      radial-gradient(circle at center, #0E2954 0%, #051B41 100%);

  /* Traditional Gold & Brass Accents */
  --color-temple-gold-900:     #9a7216; /* Dark antique brass */
  --color-temple-gold-700:     #c59b27; /* Traditional Kuthu Vilakku gold */
  --color-temple-gold-500:     #e2a829; /* Primary CTA button gold */
  --color-butter-gold:         #f6c445; /* Churned butter & ghee droplet */
  --color-gold-gradient:       linear-gradient(135deg, #f7d77a 0%, #d49e24 50%, #b88114 100%);

  /* Fresh Vegetarian & Natural Tones */
  --color-leaf-green-700:      #16a34a; /* Fresh plantain leaf green */
  --color-sky-tint:            #f0f5fa; /* Soft blue tint section background */
  --color-pure-white:          #ffffff; /* Clean card surfaces */

  /* Elevation Shadows & Glow */
  --shadow-krishna-header:     0 4px 20px rgba(5, 27, 65, 0.35);
  --shadow-peacock:            0 6px 20px rgba(0, 89, 179, 0.35);
  --shadow-gold-button:        0 6px 18px rgba(226, 168, 41, 0.35);
  --shadow-modal:              0 25px 50px -12px rgba(5, 27, 65, 0.45);
}
```

### 2.2 Typography System
* **Primary Display / Heading**: `Playfair Display` or `Cinzel Decorative` (gives the authentic regal Chettinad palace feel).
* **Tamil Script Typography**: `Mukta Malar` / `Anek Tamil` (for high-class Tamil signage).
* **Body Text & Menu Items**: `Plus Jakarta Sans` or `Inter` (500/600/700 weight for crisp, legible rendering on mobile screens).
* **Numbers & Pricing**: `Cinzel` / `Plus Jakarta Sans` with bold rupee formatting (`₹140`).

---

## 3. Page-by-Page UI/UX Wireframe & Interaction Specifications

```
+=============================================================================+
| [TOP BAR] Traditional Hanging Brass Lamps & Peacock Feathers                |
| [LOGO] ஸ்ரீ கோகுலம் (Tamil) | (G Emblem) | SRI GOKULAM VEG RESTAURANT      |
| [NAV] Home* | Our Story | Menu | Gallery | Contact  [Order Online] [QR Dine]|
+=============================================================================+
| [HERO BANNER - Moving Parallax]                                             |
|                                         +---------------------------------+ |
|  The Food Tradition                     | [Crispy Golden Ghee Roast]      | |
|  of Chettinad & Tamil Nadu              |                                 | |
|                                         +---------------------------------+ |
|  Experience Authentic Vegetarian        | [Paniyaram] | [Filter Coffee]   | |
|  Flavors in Karaikudi                   | [Raja Meal] | (Frothing Steam)  | |
|                                         +-------------+-------------------+ |
|  [🌿 Explore Menu ->]  [📞 Call to Order]                                   |
|  (Background: Soft blue sketched temple towers & Karaikudi palace mansions) |
+=============================================================================+
| [OUR SPECIALS - Traditional Golden Category Cards]                          |
|  [ Tiffin ]       [ South Indian ]     [ North Indian ]   [ Chettinad Spl ] |
+=============================================================================+
| [SIGNATURE MENU SHOWCASE with Micro-Motions]                                |
|  * Sizzling Ghee Dosa   * Cascading Sambar Idli   * Degree Filter Coffee    |
+=============================================================================+
| [QR TABLE ORDERING DEMO / MODAL - 4-Digit OTP Anti-Misuse Protocol]         |
+=============================================================================+
| [CUSTOMER REVIEWS & GOOGLE 5-STAR RATING BOOSTER]                           |
+=============================================================================+
| [FOOTER - Karaikudi Location, Timings, & Developed by AJ Tech Solutions]   |
+=============================================================================+
```

---

### 3.1 The Signature Preloader: "Vennai Thaazhi" (Pot Butter Falling)
* **Goal**: Provide an enchanting 1.8-second loading experience rooted in Lord Krishna mythology.
* **Component Architecture**:
  1. **Background**: Dark Krishna Blue (`#05182d`) with an animated radial golden halo.
  2. **Earthen Pot (Vennai Panai)**: Handcrafted terracotta pot hanging by woven jute rope at the top center.
  3. **Viscous Butter Droplet (Vennai Thuli)**: 
     - Physics-based SVG path stretching with `cubic-bezier(0.68, -0.55, 0.27, 1.55)`.
     - Golden-cream droplet falls vertically into an antique brass uruli/bowl below.
     - On impact, it creates a golden liquid ripple ring (`scale: 0 -> 2.5`, `opacity: 1 -> 0`).
  4. **Logo Reveal**: From the ripple, the official Sri Gokulam circular monogram scales in smoothly with golden spark particles.
  5. **Progress Bar**: Thin gold line with Tamil subtitle: *ஆனந்தமான பாரம்பரிய விருந்து* (*Blissful Heritage Dining*).

---

### 3.2 Header & Navigation Bar (Exact Match to Reference 2)
* **Background**: Deep Royal Navy (`#05182d` to `#0a2d54` gradient) with top ornate golden filigree border.
* **Left & Right Flanking**: Hanging antique brass temple lamps (*Kuthu Vilakku*) with subtle flickering glow, framed by Lord Krishna peacock feather motifs.
* **Centered Identity Cluster**:
  * Left: `ஸ்ரீ கோகுலம்` (Large Tamil font in gold) with `சைவ உணவகம்` (subtext in white with green leaf accents).
  * Center: Circular **"G"** Logo (80px diameter, elevated with a subtle drop shadow).
  * Right: `SRI GOKULAM` (Large English serif in gold) with `VEG RESTAURANT` (subtext with flanking green leaf vectors).
* **Navigation Links**:
  * `Home` (Highlighted with golden underline).
  * `Our Story`
  * `Menu`
  * `Gallery`
  * `Contact`
* **Action CTAs**:
  * `🛒 Order Online`: Golden gradient button (`#f7d77a` to `#d49e24`) with black bold text, rounded pill shape.
  * `📲 QR Dine-In`: Royal blue button with gold border and QR icon; clicking opens the Table QR simulation.

---

### 3.3 Hero Section: Full-Width Dynamic Moving Hero Banner with Action Buttons
* **Full-Width Hero Experience**:
  * Edge-to-edge 100% full-width banner viewport (`min-height: 520px`) with high-resolution food photography filling the entire background.
  * **Static Dark Navy Gradient Overlay Mask (`.banner-gradient-mask`)**: Stable, elegant gradient (`#051B41` fading to `#0E2954` and soft transparency on the right) with **NO distracting flowing sheen / moving blue wave** over the food photography.
  * Preserves high-contrast readability for the brand headline and buttons while letting the authentic food photography shine clearly.
* **Overlaid Banner Elements**:
  * Tag Pill: `🦚 Lord Krishna Pure Ghee Special` with peacock border.
  * Serif Royal Headline: `The Food Tradition of Chettinad & Tamil Nadu` with gleaming Temple Gold accents.
  * Descriptive copy highlighting Karaikudi culinary heritage.
  * **Dual Overlaid Action Buttons**:
    * `🛒 Order Online Now →`: Temple Butter-Gold gradient pill button with hover depth.
    * `📲 QR Table Order`: Deep royal navy pill button with peacock-blue border.
  * Floating Price Pill: e.g., `Special: ₹120 • Pure Cow Ghee`.
* **Clean & Decluttered Layout**:
  * Removed top status bar, autoplay text, preset promo boxes, and dish buttons from the banner section as requested.
  * Minimalist, elegant circular navigation arrows (`<` and `>`) on the left and right edges.
  * Sleek centered pagination pill dots at the bottom of the full banner.
* **4 Full-Width Sliding Dishes**:
  1. **Slide 1**: Golden Crispy Ghee Roast Dosa (₹120) with trio chutneys and shallot sambar.
  2. **Slide 2**: Chettinad Raja Banana Leaf Feast (Unlimited ₹180) with 14 sattvic items.
  3. **Slide 3**: Kumbakonam Degree Brass Filter Coffee (Fresh Brew ₹40).
  4. **Slide 4**: Karaikudi Tiffin & Hot Sambar Idli Platter (Combo ₹110).
* **Continuous Moving Marquee Banner (Infinite Ticker Strip)**:
  * Sleek Glowing Dark Navy Gradient ribbon (`#051B41` -> `#0E2954` -> `#0059B3`) directly underneath the full banner, continuously scrolling authentic Chettinad messages.

---

### 3.4 "Our Special" Category Showcase (Exact Match to Reference 2)
* **Section Header**: Ornate deep blue pill badge with gold filigree framing and peacock feather wings: `Our Special`.
* **Category Cards Grid (4 Columns)**:
  1. **Tiffin**: Traditional brass tiffin carrier containers with idli, vada, and chutneys on banana leaf.
  2. **South Indian**: Crispy long golden dosa with multiple traditional accompaniments.
  3. **North Indian**: Full North Indian veg thali with rotis, paneer gravy, dal makhani, and pulao.
  4. **Chettinad Special**: Signature Chettinad veg meal with authentic Urulai roast, Ennai Kathirikai, and Vazhaipoo vadai.
* **Card Design**: Clean circular/oval photography plate on banana leaf, underlined by a rich **Golden Gradient Pill Label** with high-contrast bold dark typography.

---

### 3.5 Signature Menu Experience with Micro-Motions
To fulfill the user requirement for live motion:
1. **Interactive Hover / Auto-looping Micro-Animations**:
   * **Ghee Dosa**: Shimmering hot surface with gentle butter melting particle effect.
   * **Thattu Vadai Sambar / Idli**: Subtle cascading stream of thick drumstick sambar pouring continuously over steamed idlis.
   * **Degree Filter Coffee**: Delicate vapor steam rising in 60fps smooth loop.
2. **Filter & Sort Controls**:
   * Category Filter Pills: `All`, `Traditional Tiffin`, `Meals & Biryani`, `Chettinad Curries`, `Snacks`, `Desserts`, `Beverages`.
   * Sort Dropdown: `Popularity / Chef's Pick`, `Price: Low to High`, `Spice Level (Mild / Medium / Karaikudi Fiery)`.
   * Dietary Toggles: `Pure Jain (No Onion/Garlic)`, `High Protein`, `Kid Friendly`.

---

### 3.6 QR Table Ordering & 4-Digit OTP Anti-Misuse Modal UI
When a customer scans a table QR (or clicks `QR Dine-In`):

```
+--------------------------------------------------------------+
|                     TABLE #07 DINE-IN                       |
|           Welcome to Sri Gokulam Veg Restaurant!             |
+--------------------------------------------------------------+
| Guest Name: [ Ramesh                           ]             |
+--------------------------------------------------------------+
| Active Tab:                                                  |
|  * 1x Ghee Podi Roast (Extra Crisp)                ₹120      |
|  * 1x Chettinad Special Raja Meals                 ₹210      |
|  * 1x Kumbakonam Degree Filter Coffee               ₹40      |
|                                            Total:  ₹370      |
+--------------------------------------------------------------+
|                    [ PLACE ORDER NOW ]                       |
+--------------------------------------------------------------+
                     ↓↓ (After Placing Order) ↓↓
+--------------------------------------------------------------+
|              🔒 ORDER VERIFICATION CODE: [ 7 4 1 9 ]         |
|                                                              |
|  🔔 Notification sent to your table waiter.                  |
|  Please share this OTP (7419) with your waiter to authorize  |
|  and send this ticket directly to the kitchen.               |
|                                                              |
|  Status: 🟡 PENDING WAITER OTP VERIFICATION                  |
+--------------------------------------------------------------+
                     ↓↓ (After Waiter Enters OTP) ↓↓
+--------------------------------------------------------------+
|  Status: 🟢 VERIFIED & PREPARING IN KITCHEN (KOT #07-A)      |
|  [ + Add More Items ]          [ 🧾 Request Final Bill ]     |
+--------------------------------------------------------------+
```

* **Continuous Additions**: Clicking `+ Add More Items` appends dishes to the table tab without disrupting previous orders.
* **Bill Settlement**: Once the waiter triggers the bill, an **Online Payment Drawer** slides up directly on the customer's screen with Google Pay / PhonePe / Paytm / UPI QR and Card payment options.
* **Instant Counter Sync**: If the customer pays at the cashier counter, the cashier enters Table 7, marks it paid, and the customer's phone instantly updates to: *"Bill Settled. Thank you for dining with us!"*

---

### 3.7 Customer Feedback & Google Review Booster Card
* Renders smoothly immediately following bill payment:
  * **Food Rating**: 5 Krishna Butter Pots (Click to rate 1-5).
  * **Quick Tag Chips**: `🔥 Super Crispy Dosa`, `🌿 Authentic Chettinad Flavor`, `⚡ Fast Service`, `☕ Filter Coffee Champion`.
  * **Smart 5-Star Booster**: If the user selects 5 stars, an automated celebration burst occurs with a 1-tap link: *"Share your love on Google Maps for Sri Gokulam Karaikudi!"*

---

### 3.8 Website Footer (Exact Brand Compliance)
* **Background**: Deep Royal Navy (`#05182d`) with Athangudi golden corner borders.
* **Columns**:
  * **Col 1 (Identity)**: Sri Gokulam Monogram + Tamil & English name + "Pure Vegetarian Sattvic Tradition".
  * **Col 2 (Timings)**: Breakfast 7:00 AM – 11:00 AM | Lunch 12:00 PM – 3:30 PM | Dinner 6:30 PM – 10:30 PM.
  * **Col 3 (Karaikudi Location)**: Full address in Karaikudi, landmark, phone number, and Google Maps embed button.
  * **Col 4 (Quick Actions)**: Table QR Scan, Catering Bookings, Menu Download.
* **Mandatory Attribution Bar (Bottom)**:
  * Centered, elegant gold/white typography:
  * **`Designed & Developed by ajtechsolutions`**
  * Active hyperlink: [https://ajtechsolutions.netlify.app/](https://ajtechsolutions.netlify.app/)

---

## 4. Mobile-First Responsiveness & Performance Blueprint

| Device Category | Target Viewport | Layout Strategy |
| :--- | :--- | :--- |
| **Mobile Handsets** | 360px – 480px | Single-column fluid layout. Sticky bottom navigation bar (`Menu`, `Order`, `Table QR`, `Bill`). Touch-optimized swipe carousels. |
| **Tablets / Waiter POS** | 768px – 1024px | 2-column split view (Left: Menu categories; Right: Active table KOT ticket & OTP dial-pad). |
| **Desktop / Kiosk** | 1200px – 1920px | Full cinematic experience with high-resolution Chettinad mansion backdrop, parallax food collage, and multi-station KDS view. |

* **Loading Performance Target**:
  * Google Lighthouse Score: **95+** on mobile and desktop.
  * First Contentful Paint (FCP): `< 0.9s`.
  * Image Formats: Next-gen **WebP** and **AVIF** with responsive `srcset` resolutions.

---

## 5. Client Review & Approval Checklist

Please review this design specification. Once you approve, we will immediately commence **Phase 1** implementation:

- [ ] **Aesthetics & Branding**: Does the Lord Krishna Blue + Athangudi Gold theme and the official "G" logo monogram match your vision?
- [ ] **Hero Section & Specials**: Are you satisfied with the layout derived from your reference image (Chettinad palace sketch backdrop, floating food collage, and 4 special category cards)?
- [ ] **"Vennai Thaazhi" Preloader**: Do you approve the clay pot butter-falling animation concept?
- [ ] **Anti-Misuse QR Table Flow**: Does the 4-digit OTP verification protocol between the customer and the waiter meet your operational expectations?
- [ ] **Footer Attribution**: Do you confirm the mandatory credit to [AJ Tech Solutions](https://ajtechsolutions.netlify.app/)?

---

*Awaiting your approval to begin Phase 1.*
