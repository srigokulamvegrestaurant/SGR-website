// app/catering/layout.js - Dedicated SEO Metadata for Catering & Bulk Orders
export const metadata = {
  title: "Vegetarian Wedding & Event Catering in Karaikudi | Sri Gokulam Feasts",
  description:
    "Authentic Chettinad pure vegetarian catering services in Karaikudi and Sivaganga District. Traditional banana leaf wedding feasts, housewarming functions, and corporate events cooked with pure cow ghee.",
  keywords: [
    "Karaikudi vegetarian catering",
    "wedding catering Karaikudi",
    "Chettinad leaf feast catering",
    "pure veg catering Sivaganga",
    "Sri Gokulam catering services",
  ],
  alternates: {
    canonical: "/catering",
  },
  openGraph: {
    title: "Vegetarian Event Catering | Sri Gokulam Karaikudi",
    description:
      "Traditional banana leaf wedding feasts and celebration catering with authentic Chettinad pure vegetarian delicacies.",
    url: "/catering",
  },
};

export default function CateringLayout({ children }) {
  return children;
}
