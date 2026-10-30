// app/api/cms/route.js - Public endpoint providing published CMS content to customer website
import { NextResponse } from 'next/server';
import { getDb, getDbAsync, getWebsiteCms } from '@/lib/db';
import { DEFAULT_WEBSITE_CMS } from '@/lib/cms_defaults';
import { getEvaluatedMealSections, DEFAULT_MEAL_SECTIONS } from '@/lib/meal_sections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = await getDbAsync();
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
        if (b.key === 'contactUs' || b.action === 'tel') {
          b.target = 'tel:+917358325113';
        }
        if (b.key === 'btn_whatsapp' || b.action === 'whatsapp') {
          b.target = 'https://wa.me/917358325113';
        }
      });
    }

    // Guarantee official contact, address, phone and social info
    if (published) {
      if (published.header) {
        published.header.announcementPhone = '+91 73583 25113';
      }
      if (published.footer) {
        published.footer.locationTitle = 'Sri Gokulam Veg Restaurant';
        published.footer.addressLine1 = 'Mudiyarasan Rd, near Bharat Petroleum Bunk and Thevar Silai';
        published.footer.addressLine2 = 'Sekkalai, Karaikudi, Tamil Nadu 630003';
        published.footer.phonePrimary = '+91 73583 25113';
        published.footer.phoneSecondary = '+91 73583 25113';
        published.footer.email = 'srigokulamvegrestaurant@gmail.com';
        published.footer.googleMapsUrl = 'https://maps.app.goo.gl/AhGsiW8B385tBdxx7';
        if (!published.footer.socialLinks) published.footer.socialLinks = {};
        published.footer.socialLinks.instagram = 'https://www.instagram.com/srigokulamvegrestaurant/';
        published.footer.socialLinks.whatsapp = 'https://wa.me/917358325113';
        published.footer.socialLinks.googleMaps = 'https://maps.app.goo.gl/AhGsiW8B385tBdxx7';
      }
      if (published.content) {
        published.content.announcementPhone = '+91 73583 25113';
        published.content.primaryPhone = '+91 73583 25113';
        published.content.secondaryPhone = '+91 73583 25113';
        published.content.email = 'srigokulamvegrestaurant@gmail.com';
        published.content.address = 'Mudiyarasan Rd, near Bharat Petroleum Bunk and Thevar Silai, Sekkalai, Karaikudi, Tamil Nadu 630003';
        published.content.googleMapsLink = 'https://maps.app.goo.gl/AhGsiW8B385tBdxx7';
        published.content.instagramLink = 'https://www.instagram.com/srigokulamvegrestaurant/';
      }
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
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=45',
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
