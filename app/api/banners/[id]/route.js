import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { rowCount } = await query('DELETE FROM banners WHERE id = $1', [id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { is_active } = data;

    if (is_active === undefined) {
       return NextResponse.json({ error: 'No data provided to update' }, { status: 400 });
    }

    const { rows } = await query(
      'UPDATE banners SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}
