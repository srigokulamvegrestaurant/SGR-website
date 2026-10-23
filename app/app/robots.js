// app/robots.js - SEO & AI Crawler Robots Configuration for Sri Gokulam Veg Restaurant
export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://srigokulam.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/menu',
          '/choose-us',
          '/about',
          '/reservation',
          '/contact',
          '/catering',
          '/account',
        ],
        disallow: [
          '/admin',
          '/admin/*',
          '/waiter',
          '/waiter/*',
          '/api',
          '/api/*',
        ],
      },
      // Explicit rules for AI Answer Engines (Perplexity, ChatGPT, Claude, Gemini, Apple Intelligence)
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'Google-Extended',
          'Applebot-Extended',
          'cohere-ai',
        ],
        allow: [
          '/',
          '/menu',
          '/choose-us',
          '/about',
          '/reservation',
          '/contact',
          '/catering',
          '/account',
          '/llms.txt',
        ],
        disallow: [
          '/admin',
          '/admin/*',
          '/waiter',
          '/waiter/*',
          '/api',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
