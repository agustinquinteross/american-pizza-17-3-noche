import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';

// ⚠️ IMPORTANTE: Reemplaza esto con tu ACCESS TOKEN real
// Lo ideal es ponerlo en .env, pero para probar ponlo aquí entre comillas.
const client = new MercadoPagoConfig({ accessToken: 'APP_USR-8534401600948357-010614-bb7c55218ee3158a19b23262e2f21b20-3116393342' });

export async function POST(request) {
  try {
    const { items, orderId } = await request.json();

    // Transformamos los items de tu carrito al formato de Mercado Pago
    const mpItems = items.map(item => ({
        id: item.id || '123',
        title: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        currency_id: 'ARS', // Pesos Argentinos
    }));

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: mpItems,
        // Referencia para saber qué pedido es
        external_reference: orderId ? orderId.toString() : 'temp_order', 
        // A dónde vuelve el cliente después de pagar
        back_urls: {
          success: 'http://localhost:3000/success', // Crearemos esta página luego
          failure: 'http://localhost:3000/',
          pending: 'http://localhost:3000/',
        },
        auto_return: 'approved',
      }
    });

    // Devolvemos el link de pago al frontend
    return NextResponse.json({ url: result.init_point });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al crear preferencia' }, { status: 500 });
  }
}