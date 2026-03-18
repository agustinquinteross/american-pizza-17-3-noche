import { NextResponse } from 'next/server';
import { query, handleError, serializeJSON } from '@/lib/db';

// Update a product
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const {
      name,
      description,
      price,
      cost_price,
      category_id,
      image_url,
      promo_tag,
      is_active,
      stock,
      offer_id,      // ✅ FIX: antes no se extraía ni se guardaba
      selectedGroups // [1, 2, 5]
    } = data;

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // 1. Update the main product record (incluyendo offer_id)
    const { rows } = await query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, cost_price = $4, category_id = $5, 
           image_url = $6, promo_tag = $7, is_active = $8, stock = $9, offer_id = $10
       WHERE id = $11 
       RETURNING *`,
      [
        name, 
        description || null, 
        price, 
        cost_price || null, 
        category_id || null, 
        image_url || null, 
        promo_tag || null, 
        is_active ?? true, 
        stock ?? 0,
        offer_id || null,  // ✅ FIX: ahora se guarda correctamente (null = sin promo)
        id
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updatedProduct = rows[0];

    // 2. Manage modifier groups (delete old, insert new)
    if (selectedGroups !== undefined) {
      // Borramos las relaciones anteriores
      await query('DELETE FROM product_modifiers WHERE product_id = $1', [id]);
      
      // Insertamos las nuevas
      if (selectedGroups.length > 0) {
        for (const groupId of selectedGroups) {
          await query(
            'INSERT INTO product_modifiers (product_id, group_id) VALUES ($1, $2)',
            [id, groupId]
          );
        }
      }
    }

    // Trigger Realtime update via Pusher
    try {
      const { pusherServer } = await import('@/lib/pusher-server');
      await pusherServer.trigger('products', 'product-event', { message: 'product-updated' });
    } catch (pError) {
      console.error('Pusher trigger error:', pError);
    }

    return NextResponse.json(serializeJSON(updatedProduct));
  } catch (error) {
    return handleError(error);
  }
}

// Delete a product
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Primero borramos dependencias en cascada si no la configuramos en SQL (ej: product_modifiers)
    await query('DELETE FROM product_modifiers WHERE product_id = $1', [id]);

    const { rows } = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Trigger Realtime update via Pusher
    try {
      const { pusherServer } = await import('@/lib/pusher-server');
      await pusherServer.trigger('products', 'product-event', { message: 'product-deleted' });
    } catch (pError) {
      console.error('Pusher trigger error:', pError);
    }

    return NextResponse.json({ success: true, deleted: rows[0] });
  } catch (error) {
    return handleError(error);
  }
}
