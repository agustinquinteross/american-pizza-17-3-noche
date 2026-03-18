import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    
    // Solo manejaremos actualización de estado por ahora
    const data = await request.json();
    const { status } = data;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const { rows } = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Trigger Realtime update via Pusher
    try {
      const { pusherServer } = await import('@/lib/pusher-server');
      await pusherServer.trigger('orders', 'order-event', { message: 'order-updated' });
    } catch (pError) {
      console.error('Pusher trigger error:', pError);
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const { pool } = await import('@/lib/db');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Eliminar items primero (o cascade configurado en bd, pero mejor asegurarse)
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
      
      // Eliminar orden
      const { rowCount } = await client.query('DELETE FROM orders WHERE id = $1', [id]);
      
      await client.query('COMMIT');

      if (rowCount === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Trigger Realtime update via Pusher
      try {
        const { pusherServer } = await import('@/lib/pusher-server');
        await pusherServer.trigger('orders', 'order-event', { message: 'order-deleted' });
      } catch (pError) {
        console.error('Pusher trigger error:', pError);
      }

      return NextResponse.json({ message: 'Order deleted successfully' });
      
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
