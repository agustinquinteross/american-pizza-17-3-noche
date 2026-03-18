import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    let sql = 'SELECT * FROM modifier_options';
    const values = [];

    if (groupId) {
       sql += ' WHERE group_id = $1';
       values.push(groupId);
    }
    sql += ' ORDER BY id ASC';

    const { rows } = await query(sql, values);
    return NextResponse.json(serializeJSON(rows));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { group_id, name, price, is_available } = data;

    if (!group_id || !name) {
      return NextResponse.json({ error: 'Group_id and name are required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO modifier_options (group_id, name, price, is_available) VALUES ($1, $2, $3, $4) RETURNING *',
      [group_id, name, price || 0, is_available ?? true]
    );

    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
