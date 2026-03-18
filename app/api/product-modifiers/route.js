import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id') || searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const sql = `
      SELECT 
        mg.id,
        mg.name,
        mg.min_selection,
        mg.max_selection,
        (
          SELECT json_agg(
            jsonb_build_object(
              'id', mo.id,
              'name', mo.name,
              'price', mo.price,
              'is_available', mo.is_available
            )
          )
          FROM modifier_options mo
          WHERE mo.group_id = mg.id
        ) as "modifier_options"
      FROM modifier_groups mg
      JOIN product_modifiers pm ON mg.id = pm.group_id
      WHERE pm.product_id = $1
    `;

    const { rows } = await query(sql, [productId]);
    
    return NextResponse.json(serializeJSON(rows));
  } catch (error) {
    return handleError(error);
  }
}
