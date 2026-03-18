import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function GET() {
  try {
    const sql = `
      SELECT t.*, z.name as "restaurant_zones(name)"
      FROM restaurant_tables t
      LEFT JOIN restaurant_zones z ON t.zone_id = z.id
      ORDER BY t.id ASC
    `;
    const { rows } = await query(sql);
    
    // Formatear para que coincida con lo que el frontend espera de Supabase ("restaurant_zones(name)")
    const formatted = rows.map(r => ({
       ...r,
       restaurant_zones: r["restaurant_zones(name)"] ? { name: r["restaurant_zones(name)"] } : null
    }));
    
    return NextResponse.json(formatted);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { label, zone_id, shape, is_active } = data;

    if (!label || !zone_id) {
      return NextResponse.json({ error: 'Label and zone_id are required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO restaurant_tables (label, zone_id, shape, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [label, zone_id || null, shape || 'square', is_active ?? true]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
