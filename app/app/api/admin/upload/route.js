// app/api/admin/upload/route.js - High performance image upload & persistence handler
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { image } = body;
      if (!image) {
        return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        url: image,
        sizeBytes: image.length,
      });
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in form data' }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mime = file.type || 'image/webp';
      const base64Url = `data:${mime};base64,${buffer.toString('base64')}`;
      return NextResponse.json({
        success: true,
        url: base64Url,
        sizeBytes: buffer.length,
      });
    }

    return NextResponse.json({ success: false, error: 'Unable to process image data' }, { status: 400 });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
