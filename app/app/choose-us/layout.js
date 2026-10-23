// app/choose-us/layout.js - Dedicated SEO Metadata for Chettinad Heritage Story
export const metadata = {
  title: "Why Choose Sri Gokulam | Chettinad Culinary Heritage & Pure Cow Ghee Tradition",
  description:
    "Discover the sacred vegetarian heritage of Sri Gokulam in Karaikudi. Wood-pressed cold oils, pure nattu pasu cow ghee, bronze and cast-iron cooking, and authentic Chettinad spice mastery.",
  keywords: [
    "Why Choose Sri Gokulam",
    "Chettinad vegetarian history",
    "Karaikudi heritage food",
    "wood pressed oil restaurant Karaikudi",
    "pure cow ghee veg restaurant",
    "authentic Chettinad recipes",
    "Sattvic cooking traditions",
  ],
  alternates: {
    canonical: "/choose-us",
  },
  openGraph: {
    title: "Why Choose Sri Gokulam | Authentic Chettinad Heritage",
    description:
      "Crafted with 100% pure cow ghee, freshly stone-ground Karaikudi spices & timeless Chettinad traditions in Karaikudi, Tamil Nadu.",
    url: "/choose-us",
    images: [
      {
        url: "/chettinad_cinematic_bg.jpg",
        width: 1920,
        height: 1080,
        alt: "Sri Gokulam Chettinad Heritage Kitchen",
      },
    ],
  },
};

export default function ChooseUsLayout({ children }) {
  return children;
}
