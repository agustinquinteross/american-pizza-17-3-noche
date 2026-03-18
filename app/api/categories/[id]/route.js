import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

// PUT (Update) a category
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { name, sort_order } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { rows } = await query(
      'UPDATE categories SET name = $1, sort_order = COALESCE($2, sort_order) WHERE id = $3 RETURNING *',
      [name, sort_order, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}

// DELETE a category
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { rows } = await query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handling foreign key constraint violation (products depend on this category)
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot delete category because it is being used by existing products.' },
        { status: 409 }
      );
    }
    return handleError(error);
  }
}
