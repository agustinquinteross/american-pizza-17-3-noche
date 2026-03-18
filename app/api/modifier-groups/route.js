import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM modifier_groups ORDER BY id ASC');
    return NextResponse.json(serializeJSON(rows));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, min_selection, max_selection, is_active } = data;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO modifier_groups (name, min_selection, max_selection, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, min_selection || 0, max_selection || null, is_active ?? true]
    );

    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
