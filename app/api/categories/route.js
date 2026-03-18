import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

// GET all categories
export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    return NextResponse.json(serializeJSON(rows));
  } catch (error) {
    return handleError(error);
  }
}

// POST a new category
export async function POST(request) {
  try {
    const { name, sort_order } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO categories (name, sort_order) VALUES ($1, $2) RETURNING *',
      [name, sort_order || 0]
    );
    
    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
