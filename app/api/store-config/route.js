import { NextResponse } from 'next/server';
import { query, handleError } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT * FROM store_config WHERE id = 1');
    if (rows.length === 0) return NextResponse.json({}, { status: 404 });
    
    // Sanitización profunda para JSON (manejo de BigInt y Numeric)
    const config = JSON.parse(JSON.stringify(rows[0], (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    // Forzar tipos numéricos para el frontend
    if (config.delivery_base_price !== null) config.delivery_base_price = Number(config.delivery_base_price);
    if (config.delivery_free_base_km !== null) config.delivery_free_base_km = Number(config.delivery_free_base_km);
    if (config.delivery_price_per_extra_km !== null) config.delivery_price_per_extra_km = Number(config.delivery_price_per_extra_km);
    
    return NextResponse.json(config);
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

    // Sanitización profunda para JSON (manejo de BigInt y Numeric)
    const updatedConfig = JSON.parse(JSON.stringify(rows[0], (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    // Forzar tipos numéricos para el frontend
    if (updatedConfig.delivery_base_price !== null) updatedConfig.delivery_base_price = Number(updatedConfig.delivery_base_price);
    if (updatedConfig.delivery_free_base_km !== null) updatedConfig.delivery_free_base_km = Number(updatedConfig.delivery_free_base_km);
    if (updatedConfig.delivery_price_per_extra_km !== null) updatedConfig.delivery_price_per_extra_km = Number(updatedConfig.delivery_price_per_extra_km);

    return NextResponse.json(updatedConfig);
  } catch (error) {
    return handleError(error);
  }
}
