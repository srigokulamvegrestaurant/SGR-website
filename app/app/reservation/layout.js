// app/reservation/layout.js - Dedicated SEO Metadata for Table Reservation Page
export const metadata = {
  title: "Book a Table | Online Table Reservation at Sri Gokulam Karaikudi",
  description:
    "Reserve your table online at Sri Gokulam Veg Restaurant on Mudiyarasan Salai, Karaikudi. Instant confirmation for family dining, AC Royal Hall, and special celebrations.",
  keywords: [
    "Sri Gokulam table reservation",
    "book table Karaikudi veg restaurant",
    "restaurant table booking Karaikudi",
    "AC dining hall booking Karaikudi",
  ],
  alternates: {
    canonical: "/reservation",
  },
  openGraph: {
    title: "Table Reservation | Sri Gokulam Veg Restaurant Karaikudi",
    description:
      "Instant online table reservation for breakfast, Raja Chettinad leaf lunch, and royal dinner in Karaikudi.",
    url: "/reservation",
  },
};

export default function ReservationLayout({ children }) {
  return children;
}
