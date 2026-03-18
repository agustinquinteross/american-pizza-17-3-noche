import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const withWaiters = searchParams.get('waiters') === 'true';
    
    let sql = `
       SELECT ts.*, 
              rt.label as "restaurant_tables(label)"
              ${withWaiters ? ', w.name as "waiters(name)"' : ''}
       FROM table_sessions ts
       LEFT JOIN restaurant_tables rt ON ts.table_id = rt.id
       ${withWaiters ? 'LEFT JOIN waiters w ON ts.waiter_id = w.id' : ''}
    `;
    const values = [];

    if (status) {
        sql += ' WHERE ts.status = $1';
        values.push(status);
        if (withWaiters) sql += ' AND ts.waiter_id IS NOT NULL';
    } else if (withWaiters) {
        sql += ' WHERE ts.waiter_id IS NOT NULL';
    }

    if (status === 'closed') {
        sql += ' ORDER BY ts.closed_at DESC';
    } else {
        sql += ' ORDER BY ts.created_at DESC';
    }
    
    const { rows } = await query(sql, values);
    
    const formatted = rows.map(r => {
        const row = { ...r };
        row.restaurant_tables = r["restaurant_tables(label)"] ? { label: r["restaurant_tables(label)"] } : null;
        if (withWaiters) row.waiters = r["waiters(name)"] ? { name: r["waiters(name)"] } : null;
        // Clean up raw sql aliases
        delete row["restaurant_tables(label)"];
        delete row["waiters(name)"];
        return row;
    });

    return NextResponse.json(serializeJSON(formatted));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { table_id, waiter_id, is_design_mode, status } = data;

    if (!table_id) {
       return NextResponse.json({ error: 'table_id is required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO table_sessions (table_id, waiter_id, is_design_mode, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [table_id, waiter_id || null, is_design_mode ?? false, status || 'open']
    );

    // Trigger Realtime update via Pusher
    try {
      const { pusherServer } = await import('@/lib/pusher-server');
      await pusherServer.trigger('tables', 'table-event', { message: 'session-created' });
    } catch (pError) {
      console.error('Pusher trigger error:', pError);
    }

    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
