import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (code) {
      const { rows } = await query(
        'SELECT * FROM coupons WHERE code = $1 AND is_active = true', 
        [code]
      );
      if (rows.length === 0) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
      return NextResponse.json(serializeJSON(rows[0]));
    } else {
       const { rows } = await query('SELECT * FROM coupons ORDER BY created_at DESC');
       return NextResponse.json(serializeJSON(rows));
    }
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { code, discount_type, value, usage_limit, is_active } = data;

    if (!code || !discount_type || value === undefined) {
      return NextResponse.json({ error: 'Code, type and value are required' }, { status: 400 });
    }

    const { rows } = await query(
      'INSERT INTO coupons (code, discount_type, value, usage_limit, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [code.toUpperCase(), discount_type, value || 0, usage_limit || null, is_active ?? true]
    );

    return NextResponse.json(serializeJSON(rows[0]), { status: 201 });
  } catch (error) {
    if (error.code === '23505') {
        return NextResponse.json({ error: 'Ese código de cupón ya existe.' }, { status: 400 });
    }
    return handleError(error);
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const data = await request.json();

    if (code && data.increment_usage) {
       const { rows } = await query(
         'UPDATE coupons SET times_used = times_used + 1 WHERE code = $1 RETURNING *',
         [code.toUpperCase()]
       );
       return NextResponse.json(serializeJSON(rows[0]));
    }

    // General UPDATE for admin
    const { code: oldCode, discount_type, value, usage_limit, is_active } = data;
    if (!oldCode) return NextResponse.json({ error: 'Coupon code required to update' }, { status: 400 });

    const sql = `
       UPDATE coupons 
       SET discount_type = $1, value = $2, usage_limit = $3, is_active = $4 
       WHERE code = $5 RETURNING *
    `;
    const { rows } = await query(sql, [discount_type, value || 0, usage_limit || null, is_active ?? true, oldCode.toUpperCase()]);

    if(rows.length === 0) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

    return NextResponse.json(serializeJSON(rows[0]));

  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request) {
   try {
     const { searchParams } = new URL(request.url);
     const code = searchParams.get('code');
     
     if (!code) return NextResponse.json({ error: 'Code required to delete' }, { status: 400 });

     const { rowCount } = await query('DELETE FROM coupons WHERE code = $1', [code.toUpperCase()]);
     if (rowCount === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

     return NextResponse.json({ message: 'Deleted successfully' });
   } catch(e) { return handleError(e) }
}
