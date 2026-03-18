import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { rowCount } = await query('DELETE FROM modifier_options WHERE id = $1', [id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Option deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name, price, is_available } = data;

    const updates = [];
    const values = [];
    let i = 1;

    if (name !== undefined) { updates.push(`name = $${i}`); values.push(name); i++; }
    if (price !== undefined) { updates.push(`price = $${i}`); values.push(price); i++; }
    if (is_available !== undefined) { updates.push(`is_available = $${i}`); values.push(is_available); i++; }

    if (updates.length === 0) {
       return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
    }
    values.push(id);

    const { rows } = await query(
      `UPDATE modifier_options SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }
    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}
