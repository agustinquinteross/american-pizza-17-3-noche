import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { rows } = await query(`
        SELECT ts.*, w.name as "waiters(name)" 
        FROM table_sessions ts 
        LEFT JOIN waiters w ON ts.waiter_id = w.id 
        WHERE ts.id = $1
    `, [id]);

    if(rows.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    
    // Format response
    const formatted = { ...rows[0] };
    formatted.waiters = formatted["waiters(name)"] ? { name: formatted["waiters(name)"] } : null;
    delete formatted["waiters(name)"];

    return NextResponse.json(serializeJSON(formatted));
  } catch(error) {
    return handleError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { total, subtotal, discount, status, closed_at, payment_method } = data;

    const updates = [];
    const values = [];
    let i = 1;

    if (total !== undefined) { updates.push(`total = $${i}`); values.push(total); i++; }
    if (subtotal !== undefined) { updates.push(`subtotal = $${i}`); values.push(subtotal); i++; }
    if (discount !== undefined) { updates.push(`discount = $${i}`); values.push(discount); i++; }
    if (status !== undefined) { updates.push(`status = $${i}`); values.push(status); i++; }
    if (closed_at !== undefined) { updates.push(`closed_at = $${i}`); values.push(closed_at); i++; }
    if (payment_method !== undefined) { updates.push(`payment_method = $${i}`); values.push(payment_method); i++; }

    if (updates.length === 0) {
       return NextResponse.json({ error: 'At least one field must be provided' }, { status: 400 });
    }
    values.push(id);

    const { rows } = await query(
      `UPDATE table_sessions SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Trigger Realtime update via Pusher
    try {
      const { pusherServer } = await import('@/lib/pusher-server');
      await pusherServer.trigger('tables', 'table-event', { message: 'session-updated' });
    } catch (pError) {
      console.error('Pusher trigger error:', pError);
    }

    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}
