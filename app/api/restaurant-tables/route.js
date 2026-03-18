import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET() {
  try {
    const sql = `
      SELECT 
        t.*, 
        z.name as "restaurant_zones(name)",
        ts.waiter_id as session_waiter_id,
        w.name as session_waiter_name
      FROM restaurant_tables t
      LEFT JOIN restaurant_zones z ON t.zone_id = z.id
      LEFT JOIN table_sessions ts ON ts.table_id = t.id AND ts.status = 'open'
      LEFT JOIN waiters w ON w.id = ts.waiter_id
      ORDER BY t.id ASC
    `;
    const { rows } = await query(sql);
    
    const formatted = rows.map(r => ({
       ...r,
       restaurant_zones: r["restaurant_zones(name)"] ? { name: r["restaurant_zones(name)"] } : null,
       // Incluimos el mozo dueño de la sesión activa para el lock visual en el mapa
       session_waiter_id: r.session_waiter_id || null,
       session_waiter_name: r.session_waiter_name || null,
    }));
    
    return NextResponse.json(serializeJSON(formatted));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('[API] POST restaurant-tables data:', data);
    const { label, zone_id, shape, is_active } = data;

    if (!label || !zone_id) {
      return NextResponse.json({ error: 'Label and zone_id are required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO restaurant_tables (label, zone_id, shape, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [label, zone_id || null, shape || 'square', is_active ?? true]
    );

    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
