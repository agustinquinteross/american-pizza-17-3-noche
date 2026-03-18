import { NextResponse } from 'next/server';
import { query, handleError, pool, serializeJSON } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const withExtras = searchParams.get('withExtras') === 'true';

    // Si la ruta solicitó los extras (equivalente a getProductsWithExtras de supabase.js)
    if (withExtras) {
      // Necesitamos recrear la estructura de datos anidada que devolvía la API de Supabase:
      // Products -> Categories -> Product_Modifiers -> Modifier_Groups -> Modifier_Options
      
      const sql = `
        SELECT 
          p.*,
          c.name as "category_name",
          so.id as "offer_id",
          so.title as "offer_title",
          so.type as "offer_type",
          so.discount_value as "offer_discount_value",
          so.is_active as "offer_is_active",
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', mg.id,
                'name', mg.name,
                'min_selection', mg.min_selection,
                'max_selection', mg.max_selection,
                'modifier_options', (
                  SELECT json_agg(
                    jsonb_build_object(
                      'id', mo.id,
                      'name', mo.name,
                      'price', mo.price,
                      'is_available', mo.is_available
                    )
                  )
                  FROM modifier_options mo
                  WHERE mo.group_id = mg.id
                )
              )
            ) FILTER (WHERE mg.id IS NOT NULL), 
            '[]'
          ) as "modifiers"
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN special_offers so ON p.offer_id = so.id
        LEFT JOIN product_modifiers pm ON p.id = pm.product_id
        LEFT JOIN modifier_groups mg ON pm.group_id = mg.id
        WHERE p.is_active = true
        GROUP BY p.id, c.name, so.id
        ORDER BY p.name;
      `;
      
      const result = await query(sql, []);
      
      const formattedData = result.rows.map(row => ({
        ...row,
        category: { name: row.category_name },
        special_offers: row.offer_id ? {
          id: row.offer_id,
          title: row.offer_title,
          type: row.offer_type,
          discount_value: row.offer_discount_value,
          is_active: row.offer_is_active
        } : null,
        category_name: undefined,
        offer_title: undefined,
        offer_type: undefined,
        offer_discount_value: undefined,
        offer_is_active: undefined
      }));

      return NextResponse.json(serializeJSON(formattedData));
    } 
    else {
      const sql = `
        SELECT 
          p.*, 
          c.name as category_name,
          so.id as offer_id,
          so.title as offer_title,
          so.type as offer_type,
          so.discount_value as offer_discount_value,
          so.is_active as offer_is_active
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN special_offers so ON p.offer_id = so.id
        ORDER BY p.id ASC;
      `;
      const result = await query(sql, []);
      
      const formattedData = result.rows.map(row => ({
        ...row,
         categories: { name: row.category_name },
         special_offers: row.offer_id ? {
          id: row.offer_id,
          title: row.offer_title,
          type: row.offer_type,
          discount_value: row.offer_discount_value,
          is_active: row.offer_is_active
        } : null,
      }))
      
      return NextResponse.json(serializeJSON(formattedData));
    }

  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
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
      selectedGroups // Arreglo de IDs de grupos (product_modifiers)
    } = data;

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Usaremos el pool estático
    // Si lib/db exporta 'query' pero necesitamos cliente para transacciones, usamos pool
    
    // Aquí simplificaremos: si falla pm.insert, igual retornamos error
    const productInsertResult = await query(
      `INSERT INTO products 
        (name, description, price, cost_price, category_id, image_url, promo_tag, is_active, stock) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
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
        stock ?? 0
      ]
    );

    const newProduct = productInsertResult.rows[0];

    // Si el usuario seleccionó grupos de modificadores para este producto
    if (selectedGroups && selectedGroups.length > 0) {
      // Formamos un array para iterar
      for (const groupId of selectedGroups) {
        await query(
          'INSERT INTO product_modifiers (product_id, group_id) VALUES ($1, $2)',
          [newProduct.id, groupId]
        );
      }
    }

    return NextResponse.json(serializeJSON({ ...newProduct, selectedGroups }), { status: 201 });

  } catch (error) {
    return handleError(error);
  }
}
