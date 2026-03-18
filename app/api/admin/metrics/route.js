import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and End dates are required' }, { status: 400 });
    }

    // Consulta consolidada de pedidos e items para las métricas
    // Filtramos los cancelados por defecto para ingresos reales
    const sql = `
      SELECT 
        o.id, 
        o.total, 
        o.delivery_method, 
        o.payment_method, 
        o.created_at, 
        o.customer_name, 
        o.status,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'product_name', oi.product_name, 
              'quantity', oi.quantity
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status != 'cancelled'
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;

    const result = await query(sql, [start, end]);

    return NextResponse.json(result.rows);
  } catch (error) {
    return handleError(error);
  }
}
