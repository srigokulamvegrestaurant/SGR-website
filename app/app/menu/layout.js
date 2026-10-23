// app/menu/layout.js - Dedicated SEO Metadata for Full Menu Page
export const metadata = {
  title: "Chettinad Pure Vegetarian Menu & Prices | Sri Gokulam Karaikudi",
  description:
    "Explore Sri Gokulam's full Chettinad pure vegetarian menu: Crispy Ghee Roast Dosas, Raja Plantain Leaf Meals, Kuzhi Paniyaram, authentic Chettinad gravies & Kumbakonam Degree Filter Coffee.",
  keywords: [
    "Sri Gokulam menu",
    "Karaikudi veg menu with price",
    "Chettinad meals price",
    "Ghee roast dosa Karaikudi",
    "Kuzhi paniyaram Karaikudi",
    "vegetarian dishes Karaikudi",
    "Kumbakonam degree filter coffee price",
  ],
  alternates: {
    canonical: "/menu",
  },
  openGraph: {
    title: "Chettinad Pure Vegetarian Menu | Sri Gokulam Karaikudi",
    description:
      "Handcrafted with pure cow ghee & stone-ground spices. Browse our full menu of breakfast tiffins, Raja meals, sweets, and beverages.",
    url: "/menu",
    images: [
      {
        url: "/restaurant_logo.jpg",
        width: 800,
        height: 800,
        alt: "Sri Gokulam Menu",
      },
    ],
  },
};

export default function MenuLayout({ children }) {
  return children;
}
