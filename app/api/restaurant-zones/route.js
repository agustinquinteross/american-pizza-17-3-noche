import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM restaurant_zones ORDER BY id ASC');
    return NextResponse.json(serializeJSON(rows));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name } = data;

    if (!name) {
      return NextResponse.json({ error: 'Zone name is required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO restaurant_zones (name) VALUES ($1) RETURNING *',
      [name]
    );

    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
