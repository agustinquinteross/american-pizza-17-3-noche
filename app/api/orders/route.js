import { NextResponse } from 'next/server';
import { query, handleError, pool, serializeJSON } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id'); // Opcional
    const sessionId = searchParams.get('session_id'); // 🚀 Filtro de sesión para salón
    
    let sql = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'order_id', oi.order_id,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'options', oi.options,
              'note', oi.note
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    const params = [];
    const conditions = [];

    if (userId) {
      // sql += ' WHERE user_id = $1';
      // params.push(userId);
    }

    if (sessionId) {
      conditions.push(`o.session_id = $${params.length + 1}`);
      params.push(sessionId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    sql += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    const { rows } = await query(sql, params);
    return NextResponse.json(serializeJSON(rows));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      customer_name,
      customer_phone,
      customer_address,
      total,
      delivery_method,
      payment_method,
      coupon_code,
      discount,
      table_id,
      table_label,
      session_id,
      items // Array de order_items
    } = data;

    if (!customer_name || total === undefined || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields or items' }, { status: 400 });
    }

    // Transacción manual
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const insertOrderSql = `
        INSERT INTO orders 
        (customer_name, customer_phone, customer_address, total, delivery_method, payment_method, coupon_code, discount, table_id, table_label, session_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const orderRes = await client.query(insertOrderSql, [
        customer_name, customer_phone, customer_address, total, delivery_method, payment_method, 
        coupon_code, discount || 0, table_id || null, table_label || null, session_id || null
      ]);
      
      const newOrder = orderRes.rows[0];

      const itemInsertSql = `
        INSERT INTO order_items (order_id, product_name, quantity, price, options, note)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (const item of items) {
        await client.query(itemInsertSql, [
          newOrder.id, item.product_name, item.quantity, item.price, item.options || null, item.note || null
        ]);
      }

      await client.query('COMMIT');
      
      // Trigger Realtime update via Pusher
      try {
        const { pusherServer } = await import('@/lib/pusher-server');
        await pusherServer.trigger('orders', 'order-event', { message: 'new-order' });
      } catch (pError) {
        console.error('Pusher trigger error:', pError);
      }
      
      // Return order with its items for the frontend
      newOrder.order_items = items;
      return NextResponse.json(serializeJSON(newOrder), { status: 201 });
      
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

  } catch (error) {
    return handleError(error);
  }
}
