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
