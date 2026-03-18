'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Lock, MapPin, Phone, Instagram, Loader2, ShoppingCart, Clock, Zap, Gift } from 'lucide-react'

// --- COMPONENTES ---
import ProductModal from '../components/ProductModal'
import CartModal from '../components/CartModal'
import PromoCarousel from '../components/PromoCarousel'
import { useCart } from '../store/useCart'

// --- SKELETON UI ---
const ProductSkeleton = () => (
  <div className="bg-transparent border-none overflow-hidden animate-pulse">
    <div className="h-36 sm:h-52 w-full bg-white/5 rounded-2xl sm:rounded-[32px] mb-4" />
    <div className="pl-4 pr-2 pb-2 space-y-3">
      <div className="h-6 sm:h-8 bg-white/10 rounded-lg w-3/4" />
      <div className="h-3 sm:h-4 bg-white/5 rounded-lg w-1/2" />
      <div className="h-3 sm:h-4 bg-white/5 rounded-lg w-1/4" />
    </div>
  </div>
)

export default function Home() {
  // --- ESTADOS DE DATOS ---
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // --- ESTADOS DE NEGOCIO ---
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [checkingStore, setCheckingStore] = useState(true)
  const [storeConfig, setStoreConfig] = useState(null)

  // --- ESTADOS DE UI ---
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')

  // Estados para controlar los Modales
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Hook del Carrito (Evita error de hidratación con 'mounted')
  const { cart, addToCart, mounted } = useCart()
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

  // 1. Chequear si la tienda está abierta y obtener ajustes visuales
  const fetchStoreConfig = async () => {
    try {
      const res = await fetch('/api/store-config');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setStoreConfig(data);
          setIsStoreOpen(data.is_open);
        }
      }
    } catch(e) { console.error(e) }
    setCheckingStore(false)
  }

  // 2. Cargar Productos y Categorías
  const fetchData = async () => {
    try {
      // Categorías
      const catsRes = await fetch('/api/categories');
      if (catsRes.ok) {
        const cats = await catsRes.json();
        setCategories([{ id: 'all', name: 'Todos' }, ...cats]);
      }

      // Productos con sus Extras y Ofertas (el formato ya lo maneja el backend)
      const prodRes = await fetch('/api/products?withExtras=true');
      if (prodRes.ok) {
         const formatted = await prodRes.json();
         setProducts(formatted);
      }
    } catch (err) {
      console.error(err)
    }
  }

  // --- CARGA INICIAL Y REALTIME ---
  useEffect(() => {
    async function init() {
      await Promise.all([fetchStoreConfig(), fetchData()])
      setLoading(false)
    }
    init()

    // Setup Pusher Realtime
    let pusherObj;
    let storeChannel;
    let productChannel;

    const setupPusher = async () => {
      const { pusherClient } = await import('../lib/pusher');
      pusherObj = pusherClient;

      // 1. Listen for Store Open/Close
      storeChannel = pusherClient.subscribe('store');
      storeChannel.bind('store-event', () => {
        console.log("Store config changed in vivo");
        fetchStoreConfig();
      });

      // 2. Listen for Products/Stock/Promos
      productChannel = pusherClient.subscribe('products');
      productChannel.bind('product-event', () => {
        console.log("Catalog changed in vivo");
        fetchData();
      });
    };

    setupPusher();

    return () => {
      if (storeChannel) storeChannel.unbind_all();
      if (productChannel) productChannel.unbind_all();
      if (pusherObj) {
        pusherObj.unsubscribe('store');
        pusherObj.unsubscribe('products');
      }
    }
  }, [])

  // --- FILTROS Y ORDENAMIENTO ESTELAR ---
  const filteredProducts = products
    .filter(p => {
      // ✅ FIX: La API con withExtras=true devuelve `category: { name }`, no `categories`.
      const matchesCategory = activeCategory === 'Todos' || p.category?.name === activeCategory
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
    .sort((a, b) => {
      // 1. STOCK 0 SIEMPRE AL FONDO
      if (a.stock === 0 && b.stock !== 0) return 1;
      if (b.stock === 0 && a.stock !== 0) return -1;

      // 2. PROMOCIONES ARRIBA
      const aHasPromo = a.special_offers && a.special_offers.is_active !== false;
      const bHasPromo = b.special_offers && b.special_offers.is_active !== false;
      if (aHasPromo && !bHasPromo) return -1;
      if (bHasPromo && !aHasPromo) return 1;

      // 3. ETIQUETAS DESTACADAS (Ej: NUEVO, MAS VENDIDO) suben un poquito
      const aHasTags = a.promo_tag && a.promo_tag.trim() !== '';
      const bHasTags = b.promo_tag && b.promo_tag.trim() !== '';
      if (aHasTags && !bHasTags) return -1;
      if (bHasTags && !aHasTags) return 1;

      // 4. ORDEN ALFABÉTICO POR DEFECTO PARA EL RESTO
      return a.name.localeCompare(b.name);
    });

  // Pantalla de carga inicial para evitar el parpadeo
  if (checkingStore) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#E31B23] mb-4" size={48} />
        <p className="text-[#FFFFFF]/90 font-bold tracking-widest uppercase text-sm animate-pulse">
          Preparando el horno...
        </p>
      </div>
    )
  }

  // --- RENDER: PANTALLA "CERRADO" ---
  if (!isStoreOpen) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col items-center justify-center text-center p-6 text-[#FFFFFF] overflow-hidden">
        {/* Fondo sutil elegante */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo animado lentamente */}
          <div className="mb-8 hover:scale-105 transition-transform duration-700 relative">
             <Image src="/logo.png" alt="American Pizza" width={256} height={200} className="w-56 sm:w-64 object-contain drop-shadow-xl" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter mb-4 text-[#E31B23]">CERRADO</h1>
          
          <p className="text-[#FFFFFF]/70 font-medium mb-8 max-w-sm text-sm sm:text-base">
            Nos estamos preparando para ofrecerte el mejor sabor.
          </p>
          
          <div className="bg-[#E31B23] px-6 py-3 rounded-2xl shadow-lg border border-white/20 flex items-center gap-3">
             <Clock size={20} className="text-white animate-pulse" />
             <span className="text-white font-black uppercase tracking-widest text-sm">Pronto abriremos</span>
          </div>
        </div>
      </div>
    )
  }

  // --- RENDER PRINCIPAL ---
  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans text-[#FFFFFF] pb-24">

      {/* HERO BANNER - LOGO EXCLUSIVO */}
      <div className="relative pt-4 pb-0 bg-[#0A0A0A] flex flex-col items-center justify-center text-center w-full z-10">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes gentleFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}} />
        <Image src="/logo.png" alt="American Pizza" width={260} height={200} priority className="w-full max-w-[260px] px-4 object-contain drop-shadow-xl select-none" style={{ animation: 'gentleFloat 4s ease-in-out infinite' }} />
      </div>

      {/* BARRA DE NAVEGACIÓN STICKY */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="max-w-6xl mx-auto p-4 space-y-4">

          {/* Buscador */}
          <div className="relative z-20 shadow-[0_8px_30px_rgb(227,27,35,0.12)] rounded-xl">
            <Search className="absolute left-4 top-3.5 text-white/70" size={22} />
            <input
              type="text" placeholder="¿Qué se te antoja hoy?"
              className="w-full bg-[#1A1A1A] border-0 rounded-xl py-3.5 pl-12 pr-4 text-white font-bold placeholder-white/40 outline-none transition-all ring-1 ring-white/10 focus:ring-2 focus:ring-[#E31B23]"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Categorías */}
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm transition-all border ${activeCategory === cat.name ? 'bg-[#E31B23] text-white border-[#E31B23] shadow-lg' : 'bg-transparent text-white/70 border-white/20 hover:border-[#E31B23] hover:text-white'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CARRUSEL DE PROMOS */}
      <PromoCarousel />

      {/* GRILLA DE PRODUCTOS */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {[1,2,3,4,5,6].map(i => <ProductSkeleton key={i} />)}
            </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} onClick={() => product.stock !== 0 && setSelectedProduct(product)} className={`bg-transparent border-none overflow-hidden transition-all duration-500 group relative ${product.stock === 0 ? 'opacity-75 cursor-not-allowed grayscale-[0.2]' : 'cursor-pointer hover:bg-white/[0.02]'}`}>

                  {/* 🔥 CONTENEDOR DE ETIQUETAS 🔥 */}
                  <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1.5">

                    {/* 1. Etiqueta de la Oferta Vinculada (Amarilla) */}
                    {product.special_offers && product.special_offers.is_active !== false && (
                      <div className="bg-yellow-500 text-black font-black text-[10px] uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1 animate-pulse">
                        <Gift size={12} /> {product.special_offers.discount_value}
                      </div>
                    )}

                    {/* Etiqueta de Stock */}
                    {product.stock !== null && product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
                      <div className="bg-orange-500 text-white font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1 animate-pulse">
                        ¡Últimos {product.stock}!
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="bg-[#E31B23] text-white font-black text-[10px] uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1">
                        AGOTADO
                      </div>
                    )}

                    {/* 2. Etiquetas de Texto (Rojas/Oscuras) - Con filtro anti-duplicados */}
                    {product.promo_tag && product.promo_tag.split(',').map((tag, index) => {
                      const cleanTag = tag.trim().toUpperCase();
                      const offerTag = product.special_offers?.discount_value?.toUpperCase();

                      // Si la etiqueta está vacía o dice exactamente lo mismo que la oferta (ej: 2X1), no la mostramos
                      if (cleanTag === "" || cleanTag === offerTag) return null;

                      return (
                        <div key={index} className="bg-[#E31B23] text-white font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1">
                          <Zap size={10} /> {cleanTag}
                        </div>
                      );
                    })}
                  </div>

                  <div className="h-36 sm:h-52 overflow-hidden relative rounded-2xl sm:rounded-[32px] mb-4 bg-white/5">
                    {product.image_url ? (
                      <Image 
                        src={product.image_url} 
                        alt={product.name} 
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🍕</div>
                    )}
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-xl font-black border border-white/10 text-xs sm:text-lg italic tracking-tighter shadow-2xl z-20">
                      {/* ✅ FIX: Calcular el precio mostrado correctamente para cada tipo de oferta */}
                      ${(() => {
                        const p = product.price;
                        const off = product.special_offers;
                        if (!off || !off.is_active) return Number(p).toLocaleString('es-AR');
                        const type = off.type;
                        const val = off.discount_value;
                        if (type === 'percent' || type === 'percentage') return Math.round(Number(p) * (1 - parseFloat(val) / 100)).toLocaleString('es-AR');
                        if (type === 'fixed') return Math.max(0, Number(p) - Number(val)).toLocaleString('es-AR');
                        if (type === 'fixed_price') return Number(val).toLocaleString('es-AR');
                        // nxm, 2x1, second_unit: el ahorro es por cantidad, el precio unitario no cambia
                        return Number(p).toLocaleString('es-AR');
                      })()}
                    </div>
                  </div>
                  <div className="pl-4 pr-2 pb-2">
                    <h3 className="text-base sm:text-2xl font-black text-white mb-1 uppercase italic tracking-tighter leading-none group-hover:text-[#E31B23] transition-colors">{product.name}</h3>
                    <p className="text-[10px] sm:text-sm text-white/40 font-medium line-clamp-1 sm:line-clamp-2 mb-4 uppercase tracking-wider">{product.description}</p>
                    <div className="flex items-center gap-2 text-[#E31B23] font-black text-[9px] sm:text-xs uppercase tracking-[0.2em] italic group-hover:translate-x-2 transition-transform">
                      Ver Detalles <Zap size={12} className="fill-[#E31B23]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="text-center py-20 text-white/90"><p className="text-lg">No encontramos productos 😔</p></div>}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-black text-white border-t border-white/10 mt-12 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-10">
          <div className="text-center md:text-left">
            <Image src="/logo.png" alt="American Pizza" width={80} height={80} className="h-20 w-auto opacity-90 mx-auto md:mx-0 object-contain" />
            <p className="text-white/80 font-medium text-sm mt-4">El verdadero sabor,<br />directo a donde estés.</p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="text-center md:text-right space-y-1">
              <p className="text-white/90 font-bold text-sm">República 927, Catamarca</p>
              <p className="text-white/60 text-[10px] sm:text-xs uppercase tracking-widest leading-relaxed">Domingos a Jueves: 19:30 a 01:00<br/>Viernes y Sábados: 19:30 a 02:00</p>
            </div>
            <div className="flex gap-4">
              <a href="#" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 rounded-full text-white hover:bg-[#E31B23] hover:text-white transition" title="Instagram">
                <Instagram size={20} />
              </a>
              <a href="https://wa.me/qr/YIQG3BJC7FFUC1" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 rounded-full text-white hover:bg-[#E31B23] hover:text-white transition" title="WhatsApp">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto text-center text-white/40 text-xs mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2">
          <span>© 2026 American Pizza. Todos los derechos reservados.</span>
          <span>Creado por webdesigner.com</span>
        </div>
      </footer>

      {/* BOTONES FLOTANTES */}
      <Link href="/admin" className="fixed bottom-6 left-6 z-40 bg-[#1A1A1A]/80 backdrop-blur-md border border-white/20 p-3 rounded-full text-white/70 hover:bg-[#E31B23] hover:text-white hover:border-[#E31B23] transition-all shadow-2xl group"><Lock size={20} className="group-hover:scale-110 transition-transform" /></Link>

      <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 right-6 z-40 bg-[#E31B23] text-white p-4 rounded-full shadow-xl hover:bg-white hover:text-[#E31B23] hover:scale-105 transition-all flex items-center justify-center group">
        <ShoppingCart size={24} className="group-hover:rotate-12 transition-transform" />
        {/* Renderiza el contador solo si se montó en el cliente */}
        {mounted && totalItems > 0 && <span className="absolute -top-2 -right-2 bg-white text-[#E31B23] font-black text-xs w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#E31B23] animate-in zoom-in">{totalItems}</span>}
      </button>

      {/* --- MODALES --- */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(item) => {
          addToCart(item)
          setIsCartOpen(true)
        }}
      />

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

    </div>
  )
}