import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

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
    const { id } = params;
    const data = await request.json();
    const { title, description, discount_type, discount_value, valid_from, valid_until, is_active } = data;

    const updates = [];
    const values = [];
    let i = 1;

    if (title !== undefined) { updates.push(`title = $${i}`); values.push(title); i++; }
    if (description !== undefined) { updates.push(`description = $${i}`); values.push(description); i++; }
    if (discount_type !== undefined) { updates.push(`discount_type = $${i}`); values.push(discount_type); i++; }
    if (discount_value !== undefined) { updates.push(`discount_value = $${i}`); values.push(discount_value); i++; }
    if (valid_from !== undefined) { updates.push(`valid_from = $${i}`); values.push(valid_from); i++; }
    if (valid_until !== undefined) { updates.push(`valid_until = $${i}`); values.push(valid_until); i++; }
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

    return NextResponse.json(rows[0]);
  } catch (error) {
    return handleError(error);
  }
}
