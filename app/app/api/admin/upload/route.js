// app/api/admin/upload/route.js - High performance image upload & persistence handler
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let filename = `dish_${Date.now()}.webp`;
    let buffer = null;
    let dataUrlFallback = '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { image, name } = body;
      if (!image) {
        return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 });
      }
      dataUrlFallback = image;
      const cleanName = (name || 'dish').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      filename = `${cleanName}_${Date.now()}.webp`;

      if (typeof image === 'string' && image.startsWith('data:image/')) {
        const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches && matches[2]) {
          buffer = Buffer.from(matches[2], 'base64');
          let ext = matches[1].toLowerCase();
          if (ext === 'jpeg') ext = 'jpg';
          filename = `${cleanName}_${Date.now()}.${ext}`;
        }
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in form data' }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      filename = `${Date.now()}_${safeName}`;
    }

    if (buffer) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'dishes');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, buffer);
        return NextResponse.json({
          success: true,
          url: `/uploads/dishes/${filename}`,
          sizeBytes: buffer.length,
          savedToDisk: true,
        });
      } catch (fsErr) {
        // Read-only filesystem fallback (e.g. Vercel serverless environment)
        if (dataUrlFallback) {
          return NextResponse.json({
            success: true,
            url: dataUrlFallback,
            sizeBytes: buffer.length,
            savedToDisk: false,
          });
        }
        const mime = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/webp';
        const base64Url = `data:${mime};base64,${buffer.toString('base64')}`;
        return NextResponse.json({
          success: true,
          url: base64Url,
          sizeBytes: buffer.length,
          savedToDisk: false,
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Unable to process image data' }, { status: 400 });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
