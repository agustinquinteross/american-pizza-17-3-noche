import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM banners ORDER BY id DESC');
    return NextResponse.json(serializeJSON(rows));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { title, image_url, is_active } = data;

    if (!image_url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO banners (title, image_url, is_active) VALUES ($1, $2, $3) RETURNING *',
      [title || '', image_url, is_active ?? true]
    );

    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
