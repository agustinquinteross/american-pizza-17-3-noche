import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM store_config WHERE id = 1');
    if (rows.length === 0) return NextResponse.json({}, { status: 404 });
    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const allowedFields = [
      'whatsapp_number', 'delivery_base_price', 'delivery_free_base_km', 
      'delivery_price_per_extra_km', 'logo_url', 'hero_bg_url', 'use_hero_bg', 'is_open'
    ];
    
    const updates = [];
    const values = [];
    let i = 1;

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updates.push(`${key} = $${i}`);
        // Si es un campo de precio o número y viene como "", enviamos null
        const val = (data[key] === "" && (key.includes('price') || key.includes('km'))) ? null : data[key];
        values.push(val);
        i++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields provided to update.' }, { status: 400 });
    }

    const setQuery = updates.join(', ');
    const sql = `UPDATE store_config SET ${setQuery} WHERE id = 1 RETURNING *`;
    
    const { rows } = await query(sql, values);
    
    // Trigger Realtime update via Pusher
    try {
      const { pusherServer } = await import('@/lib/pusher-server');
      await pusherServer.trigger('store', 'store-event', { message: 'config-updated' });
    } catch (pError) {
      console.error('Pusher trigger error:', pError);
    }

    return NextResponse.json(serializeJSON(rows[0]));
  } catch (error) {
    return handleError(error);
  }
}
