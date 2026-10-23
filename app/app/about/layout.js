// app/about/layout.js - Dedicated SEO Metadata for About Us Page
export const metadata = {
  title: "About Sri Gokulam | Authentic Chettinad Sattvic Pure Vegetarian Heritage",
  description:
    "Learn about Sri Gokulam Veg Restaurant in Karaikudi. Our sacred culinary philosophy, wood-pressed cold oils, pure cow ghee traditions, and authentic Chettinad spice heritage.",
  keywords: [
    "About Sri Gokulam",
    "Chettinad vegetarian history",
    "Karaikudi restaurant story",
    "pure veg tradition Karaikudi",
  ],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Sri Gokulam | Chettinad Vegetarian Heritage",
    description:
      "Preserving the sacred vegetarian culinary arts of Chettinad and Tamil Nadu on Mudiyarasan Salai, Karaikudi.",
    url: "/about",
  },
};

export default function AboutLayout({ children }) {
  return children;
}
