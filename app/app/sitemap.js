// app/sitemap.js - Dynamic XML Sitemap for Sri Gokulam Veg Restaurant
export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://srigokulam.com';
  const currentDate = new Date().toISOString();

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/choose-us`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/account`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
