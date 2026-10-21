import "./globals.css";
import ClientProviders from "./components/ClientProviders";

export const metadata = {
  title: "Sri Gokulam Veg Restaurant | Karaikudi Chettinad Heritage",
  description: "Authentic Chettinad Pure Vegetarian Dining, Ghee Roast Dosas, Raja Meals, Traditional Sweets & Kumbakonam Filter Coffee in Karaikudi.",
  icons: {
    icon: "/restaurant_logo.jpg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ta-IN">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Mukta+Malar:wght@600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* ClientProviders mounts CursorGlow (ssr:false) + Lenis SmoothScroll.
            Kept in a 'use client' component so next/dynamic ssr:false is allowed. */}
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
