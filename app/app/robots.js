// app/robots.js - SEO & AI Crawler Robots Configuration for Sri Gokulam Veg Restaurant
export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://srigokulam.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/choose-us', '/account'],
        disallow: ['/admin', '/admin/*', '/api', '/api/*', '/waiter', '/waiter/*'],
      },
      // Explicit rules for AI Answer Engines (Perplexity, ChatGPT, Claude, Gemini)
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'Google-Extended',
          'Applebot-Extended',
          'cohere-ai'
        ],
        allow: ['/', '/choose-us', '/llms.txt'],
        disallow: ['/admin', '/admin/*', '/api', '/api/*', '/waiter', '/waiter/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
