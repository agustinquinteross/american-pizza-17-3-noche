import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    // Al eliminar un grupo de modificadores, primero hay que limpiar product_modifiers asociados por diseño.
    // También eliminar las opciones, pero dependerá de las restricciones de clave foránea.
    
    await query('DELETE FROM modifier_options WHERE group_id = $1', [id]);
    await query('DELETE FROM product_modifiers WHERE group_id = $1', [id]);
    
    const { rowCount } = await query('DELETE FROM modifier_groups WHERE id = $1', [id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name, min_selection, max_selection, is_active } = data;

    const updates = [];
    const values = [];
    let i = 1;

    if (name !== undefined) { updates.push(`name = $${i}`); values.push(name); i++; }
    if (min_selection !== undefined) { updates.push(`min_selection = $${i}`); values.push(min_selection); i++; }
    if (max_selection !== undefined) { updates.push(`max_selection = $${i}`); values.push(max_selection); i++; }
    if (is_active !== undefined) { updates.push(`is_active = $${i}`); values.push(is_active); i++; }

    if (updates.length === 0) {
       return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
    }
    values.push(id);

    const { rows } = await query(
      `UPDATE modifier_groups SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}
