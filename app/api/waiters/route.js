import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM waiters ORDER BY name');
    return NextResponse.json(serializeJSON(rows));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, pin_code } = data;

    if (!name || !pin_code) {
      return NextResponse.json({ error: 'Name and pin_code are required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO waiters (name, pin_code) VALUES ($1, $2) RETURNING *',
      [name || null, pin_code || null]
    );

    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
