import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    let sql = 'SELECT * FROM special_offers ';
    if (activeOnly) {
      sql += 'WHERE is_active = true ';
    }
    sql += 'ORDER BY id DESC';

    const { rows } = await query(sql);
    return NextResponse.json(rows);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { title, description, discount_type, discount_value, valid_from, valid_until, is_active } = data;

    if (!title || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: 'Title, type and value are required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO special_offers (title, description, discount_type, discount_value, valid_from, valid_until, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description || null, discount_type, discount_value || 0, valid_from || null, valid_until || null, is_active ?? true]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
