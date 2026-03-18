import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
// Función para traer productos con sus extras organizados
export async function getProductsWithExtras() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name),
      
      product_modifiers (
        modifier_groups (
          id,
          name,
          min_selection,
          max_selection,
          // Y dentro del grupo, traemos las opciones disponibles
          modifier_options (
            id,
            name,
            price,
            is_available
          )
        )
      )
    `)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error cargando productos:', error);
    return [];
  }

  // Limpiamos un poco la estructura para que sea más fácil de usar en el Frontend
  return data.map(product => ({
    ...product,
    modifiers: product.product_modifiers.map(pm => pm.modifier_groups)
  }));
}