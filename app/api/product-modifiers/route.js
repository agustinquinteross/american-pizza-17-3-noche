import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const { rows } = await query(
      'SELECT group_id FROM product_modifiers WHERE product_id = $1',
      [productId]
    );
    
    return NextResponse.json(rows);
  } catch (error) {
    return handleError(error);
  }
}
