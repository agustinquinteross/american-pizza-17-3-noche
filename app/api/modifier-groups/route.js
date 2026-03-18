import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM modifier_groups ORDER BY id ASC');
    return NextResponse.json(rows);
  } catch (error) {
    return handleError(error);
  }
}
