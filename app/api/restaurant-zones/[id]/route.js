import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { rowCount } = await query('DELETE FROM restaurant_zones WHERE id = $1', [id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    if (error.code === '23503') { // Foreign key constraint error
        return NextResponse.json({ error: 'No se puede eliminar la zona porque tiene mesas asignadas.' }, { status: 400 });
    }
    return handleError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name } = data;

    if (!name) {
       return NextResponse.json({ error: 'Zone name is required' }, { status: 400 });
    }

    const { rows } = await query(
      'UPDATE restaurant_zones SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}
