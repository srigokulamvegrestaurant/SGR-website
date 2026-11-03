// app/api/admin/upload/route.js - High performance image upload & GitHub CDN persistence handler
import { NextResponse } from 'next/server';
import { uploadToGitHubCdn } from '@/lib/githubStorage';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const {
        image,
        dishTitle = '',
        category = '',
        mealSection = '',
        repo = '',
        filename = '',
        folder = 'dishes',
      } = body;

      if (!image) {
        return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 });
      }

      // If already a remote CDN URL or direct URL, return it directly
      if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
        return NextResponse.json({
          success: true,
          url: image,
          cdnUrl: image,
          provider: 'external_url',
        });
      }

      const result = await uploadToGitHubCdn({
        base64Data: image,
        dishTitle,
        category,
        mealSection,
        repoOverride: repo,
        filename,
        folder,
        mimeType: image.startsWith('data:image/png') ? 'image/png' : 'image/webp',
      });

      return NextResponse.json(result);
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const dishTitle = formData.get('dishTitle') || '';
      const category = formData.get('category') || '';
      const mealSection = formData.get('mealSection') || '';
      const repo = formData.get('repo') || '';
      const folder = formData.get('folder') || 'dishes';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in form data' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mime = file.type || 'image/webp';

      const result = await uploadToGitHubCdn({
        buffer,
        filename: file.name || 'photo.webp',
        dishTitle: String(dishTitle),
        category: String(category),
        mealSection: String(mealSection),
        repoOverride: String(repo),
        folder: String(folder),
        mimeType: mime,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unable to process image data: unsupported content type' }, { status: 400 });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
