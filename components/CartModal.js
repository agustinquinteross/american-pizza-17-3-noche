'use client'
import { useState, useEffect } from 'react'
import { useCart } from '../store/useCart'
import { X, Loader2, MapPin, Store, Search, Trash2, Ticket, CreditCard, MessageCircle, Wallet, Gift } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false, loading: () => <div className="h-40 bg-white/5 animate-pulse rounded-xl"/> })

// 📍 COORDENADAS EXACTAS DE GUSTO
const RESTAURANT_COORDS = { lat: -28.4678981, lng: -65.7735899 }

function calculateDistanceKM(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

export default function CartModal({ isOpen, onClose }) {
  const { cart, getTotal, clearCart, removeFromCart } = useCart()
  const fmt = (n) => `$${Math.round(Number(n)).toLocaleString('es-AR')}`

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState('delivery')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  
  const [config, setConfig] = useState({
    whatsapp_number: '5493834968345',
    delivery_base_price: 1500,
    delivery_free_base_km: 2,
    delivery_price_per_extra_km: 800
  })

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponMsg, setCouponMsg] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [coords, setCoords] = useState(null)
  const [forcedCoords, setForcedCoords] = useState(null)
  const [searchingMap, setSearchingMap] = useState(false)

  const [distanceKm, setDistanceKm] = useState(0)
  const [deliveryCost, setDeliveryCost] = useState(0)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/store-config');
        if (res.ok) {
          const data = await res.json();
          setConfig({
              whatsapp_number: data.whatsapp_number || '5493834968345',
              delivery_base_price: Number(data.delivery_base_price) || 1500,
              delivery_free_base_km: Number(data.delivery_free_base_km) || 2,
              delivery_price_per_extra_km: Number(data.delivery_price_per_extra_km) || 800
          });
        }
      } catch(e) { console.error('Error fetching config', e); }
    }
    if (isOpen) fetchConfig()
  }, [isOpen])

  useEffect(() => {
    if (coords && deliveryType === 'delivery') {
      const dist = calculateDistanceKM(RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng, coords.lat, coords.lng)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDistanceKm(dist)
      
      if (dist <= config.delivery_free_base_km) {
        setDeliveryCost(config.delivery_base_price)
      } else {
        const extraKm = Math.ceil(dist - config.delivery_free_base_km)
        setDeliveryCost(config.delivery_base_price + (extraKm * config.delivery_price_per_extra_km))
      }
    } else {
      setDeliveryCost(0)
      setDistanceKm(0)
    }
  }, [coords, deliveryType, config])

  if (!isOpen) return null

  const getItemPromoSavings = (item) => {
    const offer = item.special_offers
    if (!offer || offer.is_active === false) return 0
    
    const qty = Math.max(0, Number(item.quantity) || 0)
    const unitPrice = Number(item.price) || 0
    
    try {
      if (offer.type === 'nxm' || offer.type === '2x1') {
        let n = 2, m = 1; 
        if (offer.type === 'nxm') {
           const parts = (offer.discount_value || '').toLowerCase().split('x');
           n = parseInt(parts[0]) || 2; m = parseInt(parts[1]) || 1;
        }
        if (n <= m || n <= 0) return 0; 
        return Math.floor(qty / n) * (n - m) * unitPrice;
      }
      if (offer.type === 'second_unit') {
        // \u2705 Tolerante al formato viejo ('70% 2da') y nuevo ('70')
        const pct = parseFloat(String(offer.discount_value).replace(/[^0-9.]/g, '')) || 0;
        const pairs = Math.floor(qty / 2);
        return pairs * Math.round(unitPrice * pct / 100);
      }
    } catch (e) { console.error(e) }
    return 0; 
  }

  const multiUnitSavings = Math.round(cart.reduce((total, item) => total + getItemPromoSavings(item), 0) * 100) / 100
  const subtotal = Number(getTotal()) || 0
  
  // ✅ FIX: El descuento del cupón ahora es dinámico (se recalcula si cambia el subtotal).
  let discountAmount = 0
  if (appliedCoupon) {
      discountAmount = appliedCoupon.discount_type === 'percent' 
          ? (subtotal * appliedCoupon.value) / 100 
          : appliedCoupon.value;
  }
  
  const total = Math.max(0, subtotal - discountAmount - multiUnitSavings + deliveryCost)

  const handleSearchAddress = async () => {
    if (!address) return
    setSearchingMap(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', San Fernando del Valle de Catamarca, Argentina')}`)
      const data = await response.json()
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        setForcedCoords({ lat: parseFloat(lat), lng: parseFloat(lon) })
        setCoords({ lat: parseFloat(lat), lng: parseFloat(lon) })
      } else { alert('📍 Dirección no encontrada en mapa.') }
    } catch (error) { console.error(error) }
    setSearchingMap(false)
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/coupons?code=${couponCode.toUpperCase()}`);
      setLoading(false);
      
      if (!res.ok) { setCouponMsg('❌ Cupón inválido'); setAppliedCoupon(null); return; }
      
      const data = await res.json();
      if (data.expires_at && new Date() > new Date(data.expires_at)) { setCouponMsg('⚠️ Vencido'); setAppliedCoupon(null); return; }
      if (data.usage_limit && data.times_used >= data.usage_limit) { setCouponMsg('⚠️ Agotado'); setAppliedCoupon(null); return; }
      
      setAppliedCoupon(data);
      setCouponMsg(`✅ Cupón aplicado correctamente`);
    } catch(e) {
      setLoading(false);
      setCouponMsg('❌ Error al validar');
      setAppliedCoupon(null);
    }
  }

  const getOptionsString = (item) => item.selectedOptions?.map(o => o.name).join(', ') || ''

  const handleCheckout = async () => {
    if (!name || !phone) return alert('⚠️ Completa Nombre y Teléfono')
    if (deliveryType === 'delivery' && !coords) return alert('⚠️ Por favor, marcá tu ubicación en el mapa para calcular el envío.')
    
    setLoading(true)

    const orderPayload = {
        customer_name: name,
        customer_phone: phone,
        customer_address: deliveryType === 'delivery' ? `(${distanceKm.toFixed(1)} km) ${address}` : 'Retiro en Local',
        total: total,
        delivery_method: deliveryType,
        payment_method: paymentMethod,
        discount: discountAmount + multiUnitSavings, 
        coupon_code: couponCode || null,
        items: cart.map(item => ({
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          options: getOptionsString(item),
          note: item.note || ''
        }))
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Error al guardar: ' + (err.error || 'Server error'));
        setLoading(false);
        return;
      }

      const order = await res.json();

      // Descontar stock (API side ideally, but doing it here as per migration strategy for now)
      await Promise.all(cart.map(async (item) => {
          if (item.stock !== null && item.stock !== undefined) {
              const newStock = Math.max(0, item.stock - item.quantity);
              await fetch(`/api/products/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock })
              });
          }
      }));

      if (discountAmount > 0 && couponCode) {
          await fetch(`/api/coupons?code=${couponCode}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ increment_usage: true }) });
      }

      const itemsList = cart.map(i => {
          const extras    = getOptionsString(i)
          const nota      = i.note ? ` _(Nota: ${i.note})_` : ''
          const savings   = getItemPromoSavings(i)
          const hasPromo  = i.special_offers && i.special_offers.is_active !== false
          const promoTag  = hasPromo ? ` 🎁 *[${i.special_offers.discount_value}]*` : ''
          const promoLine = savings > 0 ? `%0A  └ Ahorro: -$${Math.round(savings).toLocaleString('es-AR')}` : ''
          return `▪️ ${i.quantity}x *${i.name}*${promoTag}${extras ? ` + ${extras}` : ''}${nota}${promoLine}`
      }).join('%0A')

      const mapLink = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : ''
      
      let msg = `¡Hola American Burger! ✨%0A%0ASoy *${name}*.%0APedido *%23${order.id}*%0A`
      
      if (deliveryType === 'delivery') {
          msg += `%0A🛵 *ENVÍO A DOMICILIO*`
          msg += `%0A📏 Distancia: *${distanceKm.toFixed(1)} KM*` 
          msg += `%0A📍 Dir: *${address}*`
          if (mapLink) msg += `%0A📍 GPS: ${mapLink}%0A`
      } else { 
          msg += `%0A🏪 *RETIRO EN LOCAL*%0A` 
      }

      msg += `%0A${itemsList}%0A%0A`
      if (multiUnitSavings > 0) msg += `🎁 Ahorro Promos: -$${multiUnitSavings}%0A`
      if (deliveryType === 'delivery') msg += `🛵 Costo Envío: $${deliveryCost}%0A`
      msg += `Total a Pagar: *$${total}*%0APago: ${paymentMethod.toUpperCase()}%0A%0A`

      const trackingUrl = `${window.location.origin}/pedido/${order.id}`
      msg += `📍 *SEGUÍ TU PEDIDO EN VIVO ACÁ:*%0A${trackingUrl}`

      window.open(`https://wa.me/${config.whatsapp_number}?text=${msg}`, '_blank')
      
      clearCart()
      onClose()
    } catch (error) {
       console.error(error);
       alert('Server error saving order');
    } finally {
       setLoading(false)
    }
  }



  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1A1A1A] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-white/10 text-white no-scrollbar">
        
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter uppercase">Tu Pedido</h2>
          <button onClick={onClose} className="p-1 sm:p-2 bg-white/5 rounded-full hover:bg-white/10 text-white"><X size={18} /></button>
        </div>

        {/* LISTA DE PRODUCTOS */}
        <div className="space-y-3 mb-6 pr-1">
          {cart.length === 0 ? (
            <p className="text-center text-white/30 py-4 font-bold uppercase text-[10px] tracking-widest">Carrito vacío</p>
          ) : cart.map((item, index) => {
            const itemSavings = getItemPromoSavings(item)
            const offer = item.special_offers
            // ✅ FIX: hasPromo solo activa el estilo amarillo/tachado cuando hay un ahorro
            // real por multi-unidad (nxm/2x1/second_unit). Para percent/fixed/fixed_price
            // el precio ya viene descontado desde ProductModal, no debe aparecer tachado.
            const isMultiUnitPromo = offer && offer.is_active !== false && ['nxm', '2x1', 'second_unit'].includes(offer.type)
            const hasSingleUnitDiscount = offer && offer.is_active !== false && ['percent', 'percentage', 'fixed', 'fixed_price'].includes(offer.type)
            const hasPromo = isMultiUnitPromo && itemSavings > 0
            return (
              <div key={index} className={`flex justify-between items-start p-3 rounded-xl border transition-all ${hasPromo ? 'bg-yellow-900/10 border-yellow-800/50' : hasSingleUnitDiscount ? 'bg-green-900/10 border-green-800/30' : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'}`}>
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="text-red-500 font-bold mt-0.5 shrink-0">{item.quantity}x</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white leading-tight">{item.name}</p>
                      {/* Multi-unit promo badge (NxM, 2x1, segunda unidad) */}
                      {isMultiUnitPromo && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-yellow-400 bg-yellow-900/30 border border-yellow-800/50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          <Gift size={9} className="shrink-0"/> {offer.discount_value}
                        </span>
                      )}
                      {/* Single-unit promo badge (porcentaje, precio fijo) */}
                      {hasSingleUnitDiscount && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-green-400 bg-green-900/30 border border-green-800/50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          <Gift size={9} className="shrink-0"/> PROMO
                        </span>
                      )}
                    </div>
                    {item.selectedOptions?.length > 0 && <p className="text-xs text-white/50 mt-0.5">+ {getOptionsString(item)}</p>}
                    {item.note && <p className="text-[10px] text-yellow-500 italic mt-1 bg-yellow-900/10 px-2 py-0.5 rounded border border-yellow-900/30">📝 {item.note}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {/* Para multi-unit con ahorro real: precio tachado + precio con descuento */}
                      {hasPromo ? (
                        <>
                          <p className="font-bold text-sm line-through text-white/40">{fmt(Number(item.price) * Number(item.quantity))}</p>
                          <p className="text-yellow-400 font-black text-sm">
                            {fmt((Number(item.price) * Number(item.quantity)) - itemSavings)}
                            <span className="text-[9px] text-yellow-600 ml-1">(-{fmt(itemSavings)})</span>
                          </p>
                        </>
                      ) : (
                        // Para precio ya descontado o sin promo: mostrar directo sin tachar
                        <p className="font-bold text-sm text-white/70">{fmt(Number(item.price) * Number(item.quantity))}</p>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.cartItemId)} className="text-white/30 hover:text-[#E31B23] p-1 transition-colors shrink-0 ml-2"><Trash2 size={16}/></button>
              </div>
            )
          })}
        </div>

        {/* FORMULARIO */}
        <div className="space-y-4">
            <div className="flex gap-2">
                <input type="text" placeholder="CUPÓN" className="w-full pl-4 p-3 bg-black border border-white/10 rounded-xl text-white outline-none uppercase text-xs font-black tracking-widest focus:border-[#E31B23]" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                <button onClick={handleApplyCoupon} className="bg-white/5 text-white/70 font-black px-4 rounded-xl text-[10px] border border-white/10 tracking-widest uppercase hover:bg-white/10 transition">APLICAR</button>
            </div>
            {couponMsg && <p className={`text-[10px] text-center font-black uppercase tracking-widest ${appliedCoupon ? 'text-green-500' : 'text-[#E31B23]'}`}>{couponMsg}</p>}

            <input type="text" placeholder="Tu Nombre" className="w-full p-4 bg-black border border-white/10 rounded-xl text-white focus:border-[#E31B23] outline-none transition-all placeholder-white/20 text-sm font-bold uppercase" value={name} onChange={e => setName(e.target.value)} />
            <input type="tel" placeholder="Tu WhatsApp" className="w-full p-4 bg-black border border-white/10 rounded-xl text-white focus:border-[#E31B23] outline-none transition-all placeholder-white/20 text-sm font-bold uppercase" value={phone} onChange={e => setPhone(e.target.value)} />
            
            <div className="flex bg-black rounded-xl p-1 border border-white/10">
                <button onClick={() => setDeliveryType('delivery')} className={`flex-1 py-2 sm:py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${deliveryType === 'delivery' ? 'bg-[#E31B23] text-white shadow-lg' : 'text-white/40'}`}><MapPin size={12} className="inline mr-1 mb-0.5"/> ENVÍO</button>
                <button onClick={() => setDeliveryType('pickup')} className={`flex-1 py-2 sm:py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${deliveryType === 'pickup' ? 'bg-[#E31B23] text-white shadow-lg' : 'text-white/40'}`}><Store size={12} className="inline mr-1 mb-0.5"/> RETIRO</button>
            </div>

            {deliveryType === 'delivery' && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex gap-2">
                        <input type="text" placeholder="Calle y Número (Ej: Rivadavia 123)" className="flex-1 p-4 bg-black border border-white/10 rounded-xl text-white focus:border-[#E31B23] outline-none transition-all placeholder-white/20 text-sm font-bold uppercase" value={address} onChange={e => setAddress(e.target.value)} />
                        <button onClick={handleSearchAddress} className="bg-white/5 text-white p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">{searchingMap ? <Loader2 className="animate-spin" size={20}/> : <Search size={22} />}</button>
                    </div>
                    
                    <div className="rounded-2xl overflow-hidden border border-white/10 h-32 sm:h-48 ring-4 ring-black/50 relative shadow-2xl">
                        <MapPicker setLocation={setCoords} forcedCoords={forcedCoords} />
                    </div>

                    <div className={`p-4 rounded-2xl border transition-all ${coords ? 'bg-green-600/10 border-green-500/30' : 'bg-black/40 border-white/10'}`}>
                        {coords ? (
                           <div className="flex justify-between items-center px-2">
                              <div>
                                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Costo de Envío</p>
                                <p className="text-xs font-bold text-white uppercase italic tracking-tighter">Distancia: <span className="text-green-500 font-black">{distanceKm.toFixed(1)} km</span></p>
                              </div>
                              <span className="text-3xl font-black text-green-500 tracking-tighter italic">${deliveryCost}</span>
                           </div>
                        ) : (
                           <p className="text-[10px] text-white/40 text-center font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 py-2">
                              <MapPin size={14} className="text-[#E31B23] animate-bounce" /> Marcá tu ubicación en el mapa
                           </p>
                        )}
                    </div>
                </div>
            )}

            <select className="w-full p-4 bg-black border border-white/10 rounded-xl text-white focus:border-[#E31B23] outline-none font-bold uppercase text-xs tracking-widest cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23E31B23%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_1.5rem_center] bg-no-repeat" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="mercadopago">💳 Mercado Pago</option>
            </select>
        </div>

        {/* RESUMEN DE TOTALES */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-white/40 text-[10px] font-black uppercase tracking-widest px-1"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {deliveryType === 'delivery' && coords && <div className="flex justify-between text-white/40 text-[10px] font-black uppercase tracking-widest px-1"><span>Envío</span><span>{fmt(deliveryCost)}</span></div>}
            {multiUnitSavings > 0 && <div className="flex justify-between text-[#E31B23] font-black text-xs uppercase italic tracking-widest px-1"><span>Ahorro Promos</span><span>-{fmt(multiUnitSavings)}</span></div>}
            {discountAmount > 0 && <div className="flex justify-between text-green-500 font-black text-xs uppercase tracking-widest px-1"><span>Descuento Cupón</span><span>-{fmt(discountAmount)}</span></div>}
            <div className="flex justify-between text-2xl sm:text-4xl font-black text-white py-2 sm:py-4 italic tracking-tighter"><span>TOTAL</span><span className="text-[#E31B23]">{fmt(total)}</span></div>
            
            <div className="space-y-4 pt-2">
                <button onClick={() => alert("MP En mantenimiento")} disabled={loading || cart.length === 0} className="w-full bg-blue-600/20 text-blue-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex justify-center items-center gap-3 border border-blue-500/20 hover:bg-blue-600/30 transition-all opacity-50 cursor-not-allowed">
                    <CreditCard size={18}/> PAGAR CON MERCADO PAGO
                </button>
                <button onClick={handleCheckout} disabled={loading || cart.length === 0 || (deliveryType === 'delivery' && !coords)} className="w-full bg-[#E31B23] hover:bg-[#C1121F] text-white py-5 rounded-2xl font-black flex justify-center items-center gap-3 transition-all uppercase tracking-[0.3em] text-sm shadow-2xl shadow-[#E31B23]/30 border-t border-white/20 active:scale-95 disabled:opacity-30">
                    {loading ? <Loader2 className="animate-spin" size={24}/> : <><MessageCircle size={24}/> ENVIAR PEDIDO</>}
                </button>
            </div>
        </div>

      </div>
    </div>
  )
}