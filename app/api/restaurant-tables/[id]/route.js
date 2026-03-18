import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

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
    const { id } = params;
    const data = await request.json();
    const { label, shape, is_active } = data;

    const updates = [];
    const values = [];
    let i = 1;

    if (label !== undefined) { updates.push(`label = $${i}`); values.push(label); i++; }
    if (shape !== undefined) { updates.push(`shape = $${i}`); values.push(shape); i++; }
    if (is_active !== undefined) { updates.push(`is_active = $${i}`); values.push(is_active); i++; }

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

    return NextResponse.json(rows[0]);
  } catch (error) {
    return handleError(error);
  }
}
