// app/api/cms/route.js - Public endpoint providing published CMS content to customer website
import { NextResponse } from 'next/server';
import { getDb, getWebsiteCms } from '@/lib/db';
import { DEFAULT_WEBSITE_CMS } from '@/lib/cms_defaults';
import { getEvaluatedMealSections, DEFAULT_MEAL_SECTIONS } from '@/lib/meal_sections';


export async function GET() {
  try {
    const db = getDb();
    const cms = getWebsiteCms();
    // Prefer published; if empty or null, fallback to draft, then defaults
    const published = cms?.published || cms?.draft || DEFAULT_WEBSITE_CMS.published;

    if (published && Array.isArray(published.heroSlides)) {
      published.heroSlides.forEach((s) => {
        if (s.primaryBtn && s.primaryBtn.text && s.primaryBtn.text.toLowerCase().includes('order online')) {
          s.primaryBtn.text = 'Table Reservation →';
          s.primaryBtn.icon = '📅';
          s.primaryBtn.action = 'reservation';
        }
        if (s.secondaryBtn && s.secondaryBtn.text && s.secondaryBtn.text.toLowerCase().includes('order online')) {
          s.secondaryBtn.text = 'Table Reservation';
          s.secondaryBtn.icon = '📅';
          s.secondaryBtn.action = 'reservation';
        }
      });
    }

    if (published && Array.isArray(published.buttons)) {
      published.buttons.forEach((b) => {
        if (b.key === 'orderNow' || (b.text && b.text.toLowerCase().includes('order online'))) {
          b.key = 'tableReservation';
          b.text = 'Table Reservation';
          b.tamilText = 'மேஜை முன்பதிவு';
          b.icon = '📅';
          b.action = 'reservation';
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        cms: published,
        menu: db.menu || [],
        categories: db.categories || [],
        mealSections: getEvaluatedMealSections(db.meal_sections || DEFAULT_MEAL_SECTIONS),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching public CMS data:', error);
    return NextResponse.json({
      success: true,
      cms: DEFAULT_WEBSITE_CMS.published,
      menu: [],
      categories: [],
    });
  }
}
