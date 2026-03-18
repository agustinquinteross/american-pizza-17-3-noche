import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { rowCount } = await query('DELETE FROM restaurant_tables WHERE id = $1', [id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Table deleted successfully' });
  } catch (error) {
    if (error.code === '23503') { // Foreign key constraint error
        return NextResponse.json({ error: 'No se puede eliminar la mesa porque tiene sesiones o pedidos.' }, { status: 400 });
    }
    return handleError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { label, shape, is_active, status, active_session_id, x_pos, y_pos } = data;

    const updates = [];
    const values = [];
    let i = 1;

    if (label !== undefined) { updates.push(`label = $${i}`); values.push(label); i++; }
    if (shape !== undefined) { updates.push(`shape = $${i}`); values.push(shape); i++; }
    if (is_active !== undefined) { updates.push(`is_active = $${i}`); values.push(is_active); i++; }
    if (status !== undefined) { updates.push(`status = $${i}`); values.push(status); i++; }
    if (active_session_id !== undefined) { updates.push(`active_session_id = $${i}`); values.push(active_session_id); i++; }
    if (x_pos !== undefined) { updates.push(`x_pos = $${i}`); values.push(x_pos); i++; }
    if (y_pos !== undefined) { updates.push(`y_pos = $${i}`); values.push(y_pos); i++; }

    if (updates.length === 0) {
       return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
    }
    values.push(id);

    const { rows } = await query(
      `UPDATE restaurant_tables SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Trigger Realtime update via Pusher
    try {
      const { pusherServer } = await import('@/lib/pusher-server');
      await pusherServer.trigger('tables', 'table-event', { message: 'table-updated' });
    } catch (pError) {
      console.error('Pusher trigger error:', pError);
    }

    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}
