import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // First remove offer_id from products
    await query('UPDATE products SET offer_id = NULL WHERE offer_id = $1', [id]);
    
    const { rowCount } = await query('DELETE FROM special_offers WHERE id = $1', [id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { title, description, type, discount_value, is_active } = data;

    const updates = [];
    const values = [];
    let i = 1;

    if (title !== undefined) { updates.push(`title = $${i}`); values.push(title); i++; }
    if (description !== undefined) { updates.push(`description = $${i}`); values.push(description); i++; }
    if (type !== undefined) { updates.push(`type = $${i}`); values.push(type); i++; }
    if (discount_value !== undefined) { updates.push(`discount_value = $${i}`); values.push(discount_value); i++; }
    if (is_active !== undefined) { updates.push(`is_active = $${i}`); values.push(is_active); i++; }

    if (updates.length === 0) {
       return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
    }
    values.push(id);

    const { rows } = await query(
      `UPDATE special_offers SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}
