'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Printer, Check, DollarSign, Utensils, List, Coffee, Trash2, Send, ChevronRight, XCircle } from 'lucide-react'
import AdminProductOptionSelector from './AdminProductOptionSelector'
import AdminSessionReceipt from './AdminSessionReceipt'
import WaiterLogin from './WaiterLogin'

export default function TableSessionModal({ table, products, categories = [], onClose, onRefresh, loggedWaiter = null }) {
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState(null)
    const [sessionOrders, setSessionOrders] = useState([])
    const [cart, setCart] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProductForOptions, setSelectedProductForOptions] = useState(null)
    const [modifierGroups, setModifierGroups] = useState([])
    const [isCheckingOut, setIsCheckingOut] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO')
    const [discount, setDiscount] = useState(0)
    const [showAddMenu, setShowAddMenu] = useState(false)
    const [selectedCategoryId, setSelectedCategoryId] = useState(null)
    const [showReceipt, setShowReceipt] = useState(false)
    const [waiter, setWaiter] = useState(loggedWaiter)
    const [showWaiterSelection, setShowWaiterSelection] = useState(false)

    useEffect(() => {
        if (loggedWaiter) setWaiter(loggedWaiter)
    }, [loggedWaiter])

    useEffect(() => {
        const activeSessionId = table?.active_session_id || session?.id
        
        if (activeSessionId) {
            fetchSessionData(activeSessionId)
        } else {
            setLoading(false)
            setSession(null)
            setSessionOrders([])
        }

        // --- PUSHER REALTIME SUBSCRIPTION ---
        if (!activeSessionId) return

        let pusherObj;
        let tableChannel;
        let orderChannel;

        const setupPusher = async () => {
            const { pusherClient } = await import('../lib/pusher');
            pusherObj = pusherClient;

            tableChannel = pusherClient.subscribe('tables');
            tableChannel.bind('table-event', () => fetchSessionData(activeSessionId));

            orderChannel = pusherClient.subscribe('orders');
            orderChannel.bind('order-event', () => fetchSessionData(activeSessionId));
        };

        setupPusher();

        return () => {
            if (tableChannel) tableChannel.unbind_all();
            if (orderChannel) orderChannel.unbind_all();
            if (pusherObj) {
                pusherObj.unsubscribe('tables');
                pusherObj.unsubscribe('orders');
            }
        }
    }, [table.id, table.active_session_id])

    const fetchSessionData = async (explicitId = null) => {
        const sessionId = explicitId || session?.id || table.active_session_id
        if (!sessionId) {
            return
        }
        
        try {
            const [sRes, oRes] = await Promise.all([
                fetch(`/api/table-sessions/${sessionId}`),
                fetch(`/api/orders?session_id=${sessionId}`) // 🚀 Filtro de servidor eficiente
            ]);
            
            if (sRes.ok) {
                const sessionData = await sRes.json();
                setSession(sessionData);
                if (sessionData.waiters) setWaiter(sessionData.waiters);
                if (sessionData.status === 'closed') {
                    onClose();
                    onRefresh();
                }
            } else {
                setSession(null);
                setSessionOrders([]);
            }

            if (oRes.ok) {
                const sessionOrders = await oRes.json();
                setSessionOrders(sessionOrders);
            }
        } catch(e) { console.error('Error fetching session data', e) }

        setLoading(false)
    }

    const fetchModifiers = async (productId) => {
        try {
            const res = await fetch(`/api/product-modifiers?productId=${productId}`);
            if (res.ok) {
                const data = await res.json();
                // We expect an array of Groups with embedded Options
                setModifierGroups(data || []);
            }
        } catch(e) { console.error(e) }
    }

    const openSession = async (waiterObj) => {
        setLoading(true)
        const activeWaiter = waiterObj || waiter
        if (!activeWaiter) {
            setShowWaiterSelection(true)
            setLoading(false)
            return
        }

        try {
            const res = await fetch('/api/table-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_id: Number(table.id),
                    waiter_id: activeWaiter.id
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                await fetch(`/api/restaurant-tables/${table.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'ocupada', active_session_id: data.id })
                });
                
                setShowWaiterSelection(false)
                setWaiter(activeWaiter)
                onRefresh()
                fetchSessionData(data.id)
            } else {
                const err = await res.json();
                alert('Error al abrir mesa: ' + err.error);
                setLoading(false);
            }
        } catch(e) { console.error(e); setLoading(false); }
    }

    // Calcula el precio base para descuentos de unidad simple (percentage/percent, fixed, fixed_price)
    // NxM y second_unit se calculan a nivel de carrito completo, no por unidad
    const calcBasePrice = (product) => {
        if (!product.special_offers?.is_active) return Number(product.price);
        const offer = product.special_offers;
        const val = offer.discount_value;
        // ✅ Tolerante a formato viejo ('50% OFF') y nuevo ('50')
        const pct = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
        if (offer.type === 'percent' || offer.type === 'percentage') {
            return Math.round(Number(product.price) * (1 - pct / 100));
        } else if (offer.type === 'fixed') {
            return Math.max(0, Number(product.price) - Number(val));
        } else if (offer.type === 'fixed_price') {
            return Number(val);
        }
        // nxm, 2x1, second_unit → precio unitario sin descuento, el ahorro se calcula a nivel carrito
        return Number(product.price);
    };

    // Calcula el ahorro por promos NxM y second_unit del carrito completo.
    // ✅ FIX: Ahora suma item.quantity en lugar de contar items.length.
    // Antes: si el mozo añadía 1 ítem con quantity=3, items.length=1 y no detectaba la promo.
    // Ahora: suma la cantidad real de cada línea, independiente de cómo estén agrupadas.
    const getCartPromoSavings = (cartItems) => {
        let savings = 0;
        const byProduct = {};
        cartItems.forEach(item => {
            const pid = item.product_id;
            if (!byProduct[pid]) byProduct[pid] = { offer: item.offer, qty: 0, unitPrice: Number(item.unit_price || item.price) };
            byProduct[pid].qty += Number(item.quantity) || 1;
        });
        Object.values(byProduct).forEach(({ offer, qty, unitPrice }) => {
            if (!offer || !offer.is_active) return;
            if (offer.type === 'nxm' || offer.type === '2x1') {
                let n = 2, m = 1;
                if (offer.type === 'nxm') {
                    // ✅ discount_value para nxm es siempre '3x2' etc, no tiene texto extra
                    const parts = (offer.discount_value || '').toLowerCase().split('x');
                    n = parseInt(parts[0]) || 2;
                    m = parseInt(parts[1]) || 1;
                }
                if (n > m && n > 0) {
                    savings += Math.floor(qty / n) * (n - m) * unitPrice;
                }
            } else if (offer.type === 'second_unit') {
                // ✅ Tolerante a formato viejo ('70% 2da') y nuevo ('70')
                const pct = parseFloat(String(offer.discount_value).replace(/[^0-9.]/g, '')) || 0;
                const pairs = Math.floor(qty / 2);
                savings += pairs * Math.round(unitPrice * pct / 100);
            }
        });
        return Math.round(savings);
    };

    // Describe la oferta para mostrar en el producto
    const getOfferBadge = (offer) => {
        if (!offer?.is_active) return null;
        if (offer.type === 'nxm' || offer.type === '2x1') return offer.discount_value || '2x1';
        if (offer.type === 'second_unit') return `${parseFloat(offer.discount_value)}% 2DA`;
        if (offer.type === 'percent' || offer.type === 'percentage') return `${parseFloat(offer.discount_value)}% OFF`;
        if (offer.type === 'fixed') return `-${fmt(Number(offer.discount_value))}`;
        if (offer.type === 'fixed_price') return `¡PRECIO: ${fmt(Number(offer.discount_value))}!`;
        return offer.title || 'PROMO';
    };

    const addToCart = (product, optionsText = '', extraPrice = 0, itemNote = '') => {
        const basePrice = calcBasePrice(product);
        const cartItem = {
            id: Date.now(),
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            price: Math.round(basePrice + Number(extraPrice)),
            unit_price: Math.round(basePrice),  // precio sin extras, para cálculo NxM
            options: optionsText,
            internal_notes: itemNote,
            offer: product.special_offers || null  // guardamos la oferta para calcular savings
        }
        setCart(prev => [...prev, cartItem])
        setShowAddMenu(false)
    }

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id))
    }

    const confirmOrderToKitchen = async () => {
        if (cart.length === 0) return
        if (!session) {
            alert('No hay sesión activa para esta mesa.')
            return
        }
        
        setLoading(true)
        const promoSavings = getCartPromoSavings(cart);
        const batchTotal = Math.max(0, Math.round(cart.reduce((acc, item) => acc + Number(item.price), 0) - promoSavings))
        
        const tableLabel = table.label || ''
        const displayLabel = tableLabel.toLowerCase().includes('mesa') ? tableLabel.toUpperCase() : `MESA ${tableLabel.toUpperCase()}`

        const itemsPayload = cart.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            options: item.options,
            note: item.internal_notes
        }))

        const newOrder = {
            customer_name: displayLabel,
            customer_phone: 'S/N',
            customer_address: '',
            total: batchTotal,
            status: 'pending',
            delivery_method: 'mesa',
            session_id: session.id,
            table_id: session.table_id,
            table_label: table.label,
            payment_method: 'A DEFINIR',
            items: itemsPayload
        }

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            });

            if (!res.ok) {
                const err = await res.json();
                alert('Error al crear pedido: ' + err.error);
                setLoading(false);
                return;
            }

            const newTotal = Number(session.total || 0) + batchTotal;
            await fetch(`/api/table-sessions/${session.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total: newTotal })
            });

            setCart([]);
            await fetchSessionData();
        } catch(e) { console.error(e) }
        
        setLoading(false)
    }

    const deleteConfirmedItem = async (orderId) => {
        if (!confirm('¿Estás seguro de eliminar este pedido?')) return
        setLoading(true)
        
        // Obtenemos el total del pedido para restarlo de la sesión
        const orderToDelete = sessionOrders.find(o => o.id === orderId)
        if (!orderToDelete) return
        
        try {
            const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
            if (res.ok) {
                const newTotal = Math.max(0, Number(session.total || 0) - Number(orderToDelete.total))
                await fetch(`/api/table-sessions/${session.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ total: newTotal })
                });
                await fetchSessionData()
            } else {
                const err = await res.json();
                alert('Error al eliminar: ' + err.error);
            }
        } catch(e) { console.error(e) }
        setLoading(false)
    }

    const closeSession = async () => {
        setLoading(true)
        const finalTotal = totalAcumulado - discount
        try {
            const res = await fetch(`/api/table-sessions/${session.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'closed', 
                    closed_at: new Date().toISOString(),
                    payment_method: paymentMethod,
                    discount: discount,
                    total: finalTotal
                })
            });
            if (res.ok) {
                await fetch(`/api/orders?session_id=${session.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payment_method: paymentMethod })
                });

                await fetch(`/api/restaurant-tables/${table.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'libre', active_session_id: null })
                });

                onClose()
                onRefresh()
            } else {
                const err = await res.json();
                alert('Error al cerrar: ' + err.error);
                setLoading(false)
            }
        } catch(e) { console.error(e); setLoading(false); }
    }

    const requestAccount = async () => {
        try {
            const res = await fetch(`/api/restaurant-tables/${table.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cuenta_pedida' })
            });
            if (res.ok) {
                onRefresh()
                fetchSessionData()
            }
        } catch(e) { console.error(e) }
    }

    const totalAcumulado = Math.round(sessionOrders.reduce((acc, order) => acc + Number(order.total), 0))
    const cartSubtotal = Math.round(cart.reduce((acc, item) => acc + Number(item.price), 0))
    const cartPromoSavings = getCartPromoSavings(cart)
    const cartTotal = Math.max(0, cartSubtotal - cartPromoSavings)
    const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

    // ✅ LOCK: Si hay un mozo logueado (no es el admin) y la sesión pertenece a otro mozo → modo lectura
    // Admin (loggedWaiter === null o undefined) siempre tiene acceso completo.
    const sessionOwnerName = session?.waiters?.name || waiter?.name || 'otro mozo'
    const isLockedForMe = !!loggedWaiter && !!session?.waiter_id && session.waiter_id !== loggedWaiter.id

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:justify-end bg-black/80 backdrop-blur-md px-0 sm:px-4">
            <div className="w-full md:w-[500px] h-full sm:h-[95vh] md:h-screen bg-[#0A0A0A] sm:rounded-t-[40px] md:rounded-none border-l border-white/10 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1A1A1A]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#E31B23]/20 text-[#E31B23] rounded-xl">
                            <Coffee size={20}/>
                        </div>
                        <div>
                            <h2 className="font-black text-lg uppercase tracking-tighter">{table.label}</h2>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{table.restaurant_zones?.name || 'Local'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-white/40">
                        <X size={20}/>
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#E31B23] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/40">Procesando...</p>
                    </div>
                ) : !session ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center pointer-events-auto">
                        {showWaiterSelection ? (
                            <WaiterLogin onLogin={openSession} />
                        ) : (
                            <>
                                <Utensils size={64} className="mb-6 text-white/5"/>
                                <h3 className="text-xl font-black mb-2 uppercase italic tracking-tighter text-[#E31B23]">Mesa Vacía</h3>
                                <p className="text-sm text-white/40 mb-8">No hay una cuenta activa en esta mesa.</p>
                                <button 
                                    onClick={() => openSession()}
                                    className="w-full bg-[#E31B23] py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(227,27,35,0.3)] hover:scale-105 active:scale-95 transition-all text-white"
                                >
                                    Abrir Mesa Nueva
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Contenido de la Sesión */}
                        <div className="flex-1 overflow-y-auto p-4 dash-scroll space-y-6">
                            
                            {/* 🛒 CARRITO LOCAL */}
                            {cart.length > 0 && (
                                <div className="space-y-3 p-4 bg-[#E31B23]/5 border border-[#E31B23]/20 rounded-3xl animate-in slide-in-from-top duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-[10px] font-black text-[#E31B23] uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Utensils size={12}/> Pedido Nuevo (Por enviar)
                                        </h3>
                                        <span className="text-xs font-black text-white">{fmt(cartTotal)}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {cart.map(item => (
                                            <div key={item.id} className="flex justify-between items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/5">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white uppercase">{item.product_name}</p>
                                                    {item.options && <p className="text-[9px] text-white/40 italic truncate">{item.options}</p>}
                                                    {item.offer?.is_active && (
                                                        <span className="text-[8px] font-black text-yellow-400 uppercase">
                                                            🏷 {getOfferBadge(item.offer)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-[#E31B23]">{fmt(item.price)}</span>
                                                    <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-white/20 hover:text-red-500 transition-colors">
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {cartPromoSavings > 0 && (
                                        <div className="flex justify-between items-center px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                            <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">🎉 Ahorro por Promo</span>
                                            <span className="text-[9px] font-black text-yellow-400">-{fmt(cartPromoSavings)}</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={confirmOrderToKitchen}
                                        className="w-full bg-[#E31B23] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#E31B23]/20 hover:scale-[1.02] active:scale-98 transition-all text-white"
                                    >
                                        <Send size={14}/> Enviar a Cocina ({fmt(cartTotal)})
                                    </button>
                                </div>
                            )}

                            {/* Resumen de Consumo Confirmado */}
                            <div className="space-y-3">
                                <h3 className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <List size={10}/> Consumo Confirmado
                                </h3>
                                {sessionOrders.length === 0 ? (
                                    <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl text-center">
                                        <p className="text-xs text-white/20 font-bold italic">Nada pedido aún...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sessionOrders.map(order => (
                                            <div key={order.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 relative group">
                                                <div className="flex justify-between items-center mb-1.5 border-b border-white/5 pb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-[#E31B23]">#{order.id.toString().slice(-4)}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                                                            order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                                                            order.status === 'cooking' ? 'bg-red-500/10 text-red-500' : 
                                                            'bg-green-500/10 text-green-500'
                                                        }`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <button 
                                                        onClick={() => deleteConfirmedItem(order.id)}
                                                        className="p-1 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <XCircle size={14}/>
                                                    </button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {order.order_items.map(item => (
                                                        <div key={item.id} className="space-y-1">
                                                            <div className="flex justify-between items-center text-[11px] font-bold">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[#E31B23]">{item.quantity}x</span>
                                                                    <span className="text-white/80 truncate max-w-[150px]">{item.product_name}</span>
                                                                </div>
                                                                <span>{fmt(Number(item.price) * Number(item.quantity))}</span>
                                                            </div>
                                                            {item.options && <p className="text-[9px] text-white/30 italic ml-4 leading-tight">{item.options}</p>}
                                                            {item.internal_notes && <p className="text-[9px] text-yellow-500 italic mt-0.5 bg-yellow-400/5 px-1.5 py-0.5 rounded border border-yellow-400/10 line-clamp-1">📝 {item.internal_notes}</p>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer con Acciones */}
                        <div className="p-4 bg-[#1A1A1A] border-t border-white/10 space-y-3 shrink-0">
                            <div className="flex justify-between items-end mb-1">
                                <div>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">Total Consolidado</p>
                                    <p className="text-[8px] font-bold text-white/20 uppercase mt-1">Suma de consumos enviados</p>
                                </div>
                                <span className="text-2xl font-black text-white italic tracking-tighter">{fmt(totalAcumulado)}</span>
                            </div>

                            {isLockedForMe ? (
                                // ✅ MODO LECTURA: esta mesa pertenece a otro mozo
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                                        <span className="text-2xl">🔒</span>
                                        <div>
                                            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Mesa bloqueada</p>
                                            <p className="text-[9px] text-yellow-400/70 font-bold uppercase mt-0.5">Atendida por <span className="text-yellow-300">{sessionOwnerName.toUpperCase()}</span></p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowReceipt(true)}
                                        className="w-full bg-white/5 border border-white/10 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors text-white"
                                    >
                                        <Printer size={18}/> Ver Ticket
                                    </button>
                                </div>
                            ) : (
                                // ACCESO COMPLETO: es el dueño de la mesa o es el admin
                                <div className="grid grid-cols-2 xs:grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setShowAddMenu(true)}
                                        className="bg-white/5 border border-white/10 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors text-white"
                                    >
                                        <Plus size={18}/> Agregar
                                    </button>
                                    <button 
                                        onClick={requestAccount}
                                        className={`bg-white/5 border border-white/10 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all text-white
                                            ${table.status === 'cuenta_pedida' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40' : 'hover:bg-white/10'}`}
                                    >
                                        <DollarSign size={18}/> {table.status === 'cuenta_pedida' ? 'Pedida' : 'Cuenta'}
                                    </button>
                                    <button 
                                        onClick={() => setShowReceipt(true)}
                                        className="bg-white/5 border border-white/10 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors text-white"
                                    >
                                        <Printer size={18}/> Ticket
                                    </button>
                                    <button 
                                        onClick={() => setIsCheckingOut(true)}
                                        className="bg-green-600 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-white"
                                    >
                                        <Check size={18}/> Cobrar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sub-Panel: Seleccionador de Productos */}
            {showAddMenu && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl">
                    <div className="w-full max-w-2xl bg-[#0A0A0A] sm:rounded-[32px] overflow-hidden flex flex-col h-full sm:h-[80vh] animate-in zoom-in-95 duration-300">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1A1A1A]">
                            <h3 className="font-black text-lg italic tracking-tighter uppercase text-white">Menú de Salón</h3>
                            <button onClick={() => setShowAddMenu(false)} className="p-1.5 bg-white/5 rounded-full text-white/40"><X size={20}/></button>
                        </div>
                        <div className="p-2 border-b border-white/10 space-y-2 bg-black">
                            <input 
                                type="text" 
                                placeholder="Buscar plato o bebida..." 
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#E31B23] text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                <button 
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${!selectedCategoryId ? 'bg-[#E31B23] border-[#E31B23] text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                                >
                                    Todos
                                </button>
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${selectedCategoryId === cat.id ? 'bg-[#E31B23] border-[#E31B23] text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 content-start dash-scroll">
                            {products
                                .filter(p => p.is_active && 
                                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
                                    (!selectedCategoryId || p.category_id === selectedCategoryId)
                                )
                                .sort((a, b) => {
                                    if (a.stock === 0 && b.stock !== 0) return 1;
                                    if (a.stock !== 0 && b.stock === 0) return -1;
                                    return 0;
                                })
                                .map(product => {
                                    const isOutOfStock = product.stock === 0;
                                    return (
                                        <div 
                                            key={product.id} 
                                            onClick={() => {
                                                if (isOutOfStock) return;
                                                fetchModifiers(product.id)
                                                setSelectedProductForOptions(product)
                                            }}
                                            className={`bg-[#1A1A1A] border border-white/5 px-3 py-2 rounded-2xl flex items-center gap-3 transition-all group relative 
                                                ${isOutOfStock ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-[#E31B23]'}`}
                                        >
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-lg border border-white/5 group-hover:border-[#E31B23]/30 transition-colors">
                                                {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover"/> : '🍕'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <h4 className="font-bold text-xs sm:text-sm truncate uppercase text-white/70 leading-tight group-hover:text-white transition-colors">{product.name}</h4>
                                                    {isOutOfStock && <span className="text-[8px] font-black bg-[#E31B23] text-white px-1.5 py-0.5 rounded block shrink-0">AGOTADO</span>}
                                                    {product.special_offers?.is_active && (
                                                        <span className="text-[8px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded uppercase shrink-0 animate-pulse">
                                                            {getOfferBadge(product.special_offers)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm sm:text-base font-black text-[#E31B23] italic tracking-tight">
                                                        {fmt(calcBasePrice(product))}
                                                    </p>
                                                    {product.special_offers?.is_active && 
                                                     !['nxm','2x1','second_unit'].includes(product.special_offers.type) && (
                                                        <span className="text-[9px] text-white/30 line-through">{fmt(Number(product.price))}</span>
                                                    )}
                                                    {product.special_offers?.is_active && 
                                                     ['nxm','2x1','second_unit'].includes(product.special_offers.type) && (
                                                        <span className="text-[9px] text-yellow-400/70 italic">dto. al agregar {['nxm','2x1'].includes(product.special_offers.type) ? 'varios' : '2+'}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {!isOutOfStock && (
                                                <div className="p-2 bg-white/5 rounded-xl text-[#E31B23] group-hover:bg-[#E31B23] group-hover:text-white transition-all"><Plus size={16}/></div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Panel 2: Selector de Opciones */}
            {selectedProductForOptions && (
                <AdminProductOptionSelector 
                    product={selectedProductForOptions}
                    modifierGroups={modifierGroups}
                    onClose={() => setSelectedProductForOptions(null)}
                    onConfirm={(prod, opt, price, note) => {
                        addToCart(prod, opt, price, note)
                        setSelectedProductForOptions(null)
                    }}
                />
            )}

            {/* Ticket */}
            {showReceipt && (
                <AdminSessionReceipt 
                    session={session}
                    orders={sessionOrders}
                    onClose={() => setShowReceipt(false)}
                />
            )}

            {/* Checkout */}
            {isCheckingOut && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="w-full max-w-md bg-[#111111] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1A1A1A]">
                            <h3 className="font-black text-xl italic tracking-tighter uppercase text-white">Finalizar Mesa</h3>
                            <button onClick={() => setIsCheckingOut(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40"><X size={24}/></button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Total a cobrar</p>
                                <p className="text-5xl font-black text-white italic tracking-tighter">{fmt(totalAcumulado - discount)}</p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Método de Pago</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['EFECTIVO', 'TARJETA', 'QR'].map(method => (
                                        <button 
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            className={`py-3 rounded-2xl font-black text-[10px] transition-all border ${paymentMethod === method ? 'bg-[#E31B23] border-[#E31B23] text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40'}`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Descuento Aplicado</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[0, 5, 10].map(pct => (
                                        <button 
                                            key={pct}
                                            onClick={() => setDiscount(Math.round(totalAcumulado * (pct / 100)))}
                                            className={`py-3 rounded-2xl font-black text-[10px] transition-all border ${discount === Math.round(totalAcumulado * (pct / 100)) && (pct > 0 || discount === 0) ? 'bg-[#E31B23] border-[#E31B23] text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40'}`}
                                        >
                                            {pct === 0 ? 'NINGUNO' : `${pct}%`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-[24px] border border-white/5 space-y-2">
                                <div className="flex justify-between text-xs font-bold text-white/40"><span>Subtotal</span><span>{fmt(totalAcumulado)}</span></div>
                                <div className="flex justify-between text-xs font-bold text-[#E31B23]"><span>Descuento</span><span>-{fmt(discount)}</span></div>
                                <div className="flex justify-between text-lg font-black text-white pt-2 border-t border-white/10 italic"><span>TOTAL</span><span>{fmt(totalAcumulado - discount)}</span></div>
                            </div>

                            <button 
                                onClick={closeSession}
                                className="w-full bg-green-600 py-4 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl text-white hover:scale-[1.02] active:scale-98 transition-all"
                            >
                                Confirmar y Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
