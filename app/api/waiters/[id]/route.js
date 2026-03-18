import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const { rowCount } = await query('DELETE FROM waiters WHERE id = $1', [id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Waiter not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Waiter deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
