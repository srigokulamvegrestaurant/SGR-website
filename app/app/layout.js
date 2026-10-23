import "./globals.css";
import ClientProviders from "./components/ClientProviders";
import JsonLd from "./components/JsonLd";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://srigokulam.com";

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Sri Gokulam Veg Restaurant | Karaikudi Chettinad Heritage",
    template: "%s | Sri Gokulam Veg Restaurant",
  },
  description:
    "Authentic Chettinad Sattvic Pure Vegetarian Dining in Karaikudi. Savor crispy ghee roast dosas, 14-item Raja plantain leaf meals, Chettinad kuzhi paniyaram & authentic Kumbakonam degree filter coffee.",
  keywords: [
    "Sri Gokulam Veg Restaurant",
    "Karaikudi veg restaurant",
    "Chettinad vegetarian meals",
    "pure veg restaurant in Karaikudi",
    "best veg restaurant Karaikudi",
    "Karaikudi Subramaniapuram restaurant",
    "Raja Chettinad full meals",
    "Ghee roast dosa Karaikudi",
    "Chettinad kuzhi paniyaram",
    "Kumbakonam degree filter coffee",
    "pure veg dining Sivaganga",
    "Tamil Nadu vegetarian heritage",
    "Sattvic dining Karaikudi",
    "Sri Gokulam Pure Veg",
    "South Indian restaurant Karaikudi",
    "Karaikudi tiffin and meals",
  ],
  authors: [{ name: "Sri Gokulam Veg Restaurant", url: APP_URL }],
  creator: "Sri Gokulam Veg Restaurant",
  publisher: "Sri Gokulam Veg Restaurant",
  category: "Restaurant & Dining",
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Sri Gokulam Veg Restaurant | Karaikudi Chettinad Heritage",
    description:
      "Handcrafted with pure cow ghee, freshly stone-ground Karaikudi spices & timeless heritage recipes. 100% Pure Vegetarian dining in Subramaniapuram, Karaikudi.",
    url: "/",
    siteName: "Sri Gokulam Veg Restaurant",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/restaurant_logo.jpg",
        width: 800,
        height: 800,
        alt: "Sri Gokulam Veg Restaurant Logo",
      },
      {
        url: "/chettinad_cinematic_bg.jpg",
        width: 1920,
        height: 1080,
        alt: "Sri Gokulam Traditional Chettinad Heritage Feast",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sri Gokulam Veg Restaurant | Karaikudi Chettinad Heritage",
    description:
      "Experience royal Chettinad pure vegetarian meals, crisp ghee roast dosas, and authentic filter coffee in Karaikudi.",
    images: ["/chettinad_cinematic_bg.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/restaurant_logo.jpg",
    apple: "/restaurant_logo.jpg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#451a03",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ta-IN">
      <head>
        {/* GEO-Targeting & Local SEO Tags (Karaikudi, Tamil Nadu) */}
        <meta name="geo.region" content="IN-TN" />
        <meta name="geo.placename" content="Karaikudi" />
        <meta name="geo.position" content="10.0735;78.7845" />
        <meta name="ICBM" content="10.0735, 78.7845" />

        {/* Fonts Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Mukta+Malar:wght@600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Structured Data (Schema.org Restaurant + FAQPage for SEO/GEO/AEO) */}
        <JsonLd />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
