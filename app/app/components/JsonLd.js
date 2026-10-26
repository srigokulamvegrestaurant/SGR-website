// app/components/JsonLd.js - Structured Data Schema for Search Engines & AI Answer Engines
export default function JsonLd() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.srigokulamvegrestaurant.com').replace(/\/$/, '');

  // 1. Local Business & Vegetarian Restaurant Schema (SEO + GEO)
  const restaurantSchema = {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'VegetarianRestaurant'],
    '@id': `${baseUrl}/#restaurant`,
    name: 'Sri Gokulam Veg Restaurant',
    alternateName: 'ஸ்ரீ கோகுலம் சைவ உணவகம்',
    url: baseUrl,
    logo: `${baseUrl}/restaurant_logo.jpg`,
    image: [
      `${baseUrl}/restaurant_logo.jpg`,
      `${baseUrl}/chettinad_cinematic_bg.jpg`,
    ],
    description:
      'Authentic Chettinad Sattvic Pure Vegetarian Restaurant in Karaikudi. Specializing in Raja Chettinad Plantain Leaf Meals, Crispy Ghee Roast Dosas, Kuzhi Paniyaram, and Kumbakonam Filter Coffee.',
    telephone: '+91 73583 25113',
    email: 'srigokulamvegrestaurant@gmail.com',
    priceRange: '₹₹ (₹60 - ₹350)',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Credit Card, Debit Card, PhonePe, Google Pay',
    servesCuisine: [
      'Chettinad',
      'South Indian',
      'Pure Vegetarian',
      'Tamil Nadu Traditional',
      'Sattvic',
      'Tiffin',
      'Thali Meals',
    ],
    acceptsReservations: 'True',
    menu: `${baseUrl}/#menu`,
    hasMap: 'https://maps.app.goo.gl/AhGsiW8B385tBdxx7',
    sameAs: [
      'https://www.instagram.com/srigokulamvegrestaurant/',
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Mudiyarasan Rd, near Bharat Petroleum Bunk and Thevar Silai, Sekkalai',
      addressLocality: 'Karaikudi',
      addressRegion: 'Tamil Nadu',
      postalCode: '630003',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 10.0682,
      longitude: 78.7808,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '06:30',
        closes: '23:00',
      },
    ],
    areaServed: [
      {
        '@type': 'AdministrativeArea',
        name: 'Karaikudi',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Chettinad Heritage Region',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Sivaganga District',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Tamil Nadu',
      },
    ],
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/#reservation`,
        inLanguage: 'en-US',
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      result: {
        '@type': 'FoodEstablishmentReservation',
        name: 'Table Reservation at Sri Gokulam Veg Restaurant',
      },
    },
  };

  // 2. FAQPage Schema for AI Answer Engines (AEO: ChatGPT, Perplexity, Gemini, Google SGE)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What makes Sri Gokulam Veg Restaurant in Karaikudi special?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sri Gokulam Veg Restaurant brings the sacred vegetarian culinary traditions of Chettinad and Tamil Nadu. Every dish is handcrafted using wood-pressed oils, pure cow ghee (nattu pasu ghee), and freshly stone-ground Karaikudi spices without artificial additives.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where is Sri Gokulam Veg Restaurant located in Karaikudi?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sri Gokulam Veg Restaurant is located at Sri Gokulam Veg Restaurant, Mudiyarasan Rd, near Bharat Petroleum Bunk and Thevar Silai, Sekkalai, Karaikudi, Tamil Nadu 630003.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the dining hours for Sri Gokulam Veg Restaurant?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We are open every day from 6:30 AM to 11:00 PM. Breakfast is served from 6:30 AM – 11:30 AM, Raja Chettinad Plantain Leaf Meals from 12:00 PM – 3:45 PM, Evening Tiffin from 4:30 PM – 6:45 PM, and Royal Dinner from 7:00 PM – 10:45 PM.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is Sri Gokulam 100% pure vegetarian and suitable for Jain diets?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Sri Gokulam is a 100% pure vegetarian restaurant. We strictly observe Sattvic hygiene standards and offer Jain-friendly meals (prepared without onion or garlic) upon request.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the must-try signature dishes at Sri Gokulam?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Top recommendations include the 14-item Raja Chettinad Plantain Leaf Meals, Crispy Ghee Roast Dosa, Chettinad Kuzhi Paniyaram with Kara Chutney, Vazhaipoo Vadai, Ennai Kathirikai Kuzhambu, and traditional Kumbakonam Degree Filter Coffee.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I book a table in advance or order via QR code?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! You can reserve a table online directly through our website. For guests dining at the restaurant, each table features an instant QR code to browse our live digital menu, customize orders, and summon your waiter without delays.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is parking available at the restaurant?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, convenient two-wheeler and four-wheeler parking spaces are available for dining guests along Mudiyarasan Salai near Bharat Petroleum Bunk.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
