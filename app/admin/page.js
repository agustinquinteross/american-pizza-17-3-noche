'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// --- COMPONENTES / MODALES ---
import AdminProductForm from '../../components/AdminProductForm'
import AdminGroupForm from '../../components/AdminGroupForm'
import AdminCouponForm from '../../components/AdminCouponForm' 
import AdminBannerForm from '../../components/AdminBannerForm'
import AdminOfferForm from '../../components/AdminOfferForm'
import dynamic from 'next/dynamic'
const DashboardMetrics = dynamic(() => import('@/components/metrics/DashboardMetrics'), { 
    ssr: false, 
    loading: () => <div className="h-[400px] w-full bg-[#1A1A1A] animate-pulse rounded-[32px] flex items-center justify-center text-white/20 font-black uppercase tracking-[0.5em] border border-white/5">Cargando Inteligencia...</div> 
});
import AdminCategoryForm from '../../components/AdminCategoryForm'
import AdminTableMap from '../../components/AdminTableMap'
import TableSessionModal from '../../components/TableSessionModal'
import AdminZoneForm from '../../components/AdminZoneForm'
import AdminTableForm from '../../components/AdminTableForm'
import AdminTableManagement from '../../components/AdminTableManagement'
import AdminWaiterDashboard from '../../components/AdminWaiterDashboard'

import Link from 'next/link'
import Image from 'next/image'
import { 
  Loader2, Power, LogOut, RefreshCw, ShoppingBag, Utensils, 
  Plus, Trash2, Layers, Ticket, MapPin, Edit, X, Calendar, 
  Hash, Megaphone, Lock, Unlock, CheckCircle, Clock, Truck, 
  MessageCircle, CreditCard, Wallet, AlertCircle, GripVertical, Printer, Zap,
  TrendingUp, Search, FolderPlus,
  Settings, Save, Phone, LayoutDashboard, Image as ImageIcon, UploadCloud,
  ChevronRight, Check, Coffee, Monitor, Smartphone, User
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  // --- ESTADOS GLOBALES ---
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('menu') 
  
  // --- LOGIN ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // --- ESTADO Y CONFIG DE LA TIENDA ---
  const [storeOpen, setStoreOpen] = useState(true)
  const [updatingStore, setUpdatingStore] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  
  const [storeConfig, setStoreConfig] = useState({
    whatsapp_number: '',
    delivery_base_price: 1500,
    delivery_free_base_km: 2,
    delivery_price_per_extra_km: 800,
    logo_url: null,
    hero_bg_url: null,
    use_hero_bg: false
  })
  const [savingConfig, setSavingConfig] = useState(false)

  // --- DATOS ---
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [categories, setCategories] = useState([])
  const [modifierGroups, setModifierGroups] = useState([])
  const [coupons, setCoupons] = useState([])
  const [banners, setBanners] = useState([])
  const [offers, setOffers] = useState([])
  const [zones, setZones] = useState([])
  const [tables, setTables] = useState([])
  const [waiters, setWaiters] = useState([])

  // --- BUSQUEDA Y FILTROS ---
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  // --- MODALES ---
  const [showProductModal, setShowProductModal] = useState(false)
  const [productToEdit, setProductToEdit] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false) 
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [couponToEdit, setCouponToEdit] = useState(null)
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [showTableFormModal, setShowTableFormModal] = useState(false)
  const [currentZoneId, setCurrentZoneId] = useState(null)
  const [designMode, setDesignMode] = useState(false)
  const [showManagementView, setShowManagementView] = useState(false)

  // --- EXTRAS ---
  const [selectedGroupId, setSelectedGroupId] = useState(null) 
  const [groupOptions, setGroupOptions] = useState([])

  // --- DRAG & DROP ---
  const [draggedOrder, setDraggedOrder] = useState(null)
  const [isDraggingOver, setIsDraggingOver] = useState(null)

  const loadAllData = async () => {
    setLoading(true)
    try {
        await Promise.all([
            fetchStoreConfig(), fetchCategories(), fetchModifiers(),
            fetchProducts(), fetchOrders(), fetchCoupons(), fetchBanners(), fetchOffers(),
            fetchZones(), fetchTables(), fetchWaiters()
        ])
    } catch (error) { console.error("Error cargando datos:", error) }
    setLoading(false)
  }

  const handleSaveCoupon = async (couponLine) => {
    try {
        const res = await fetch('/api/coupons', {
            method: couponToEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(couponLine)
        });
        if (res.ok) {
           setShowCouponModal(false);
           fetchCoupons();
        } else {
           const err = await res.json();
           alert('Error guardando cupón: ' + (err.error || 'Server error'));
        }
    } catch(e) { console.error(e) }
  }

  const fetchStoreConfig = async () => { 
      try {
          const res = await fetch('/api/store-config');
          if (res.ok) {
              const data = await res.json();
              if (data) {
                 setStoreOpen(data.is_open);
                 setStoreConfig(data);
              }
          }
      } catch(e) { console.error(e) }
  }

  const toggleStoreStatus = async () => {
      setUpdatingStore(true);
      const newState = !storeOpen;
      try {
          const res = await fetch('/api/store-config', {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ is_open: newState })
          });
          if (res.ok) setStoreOpen(newState);
          else alert('No se pudo actualizar el estado.');
      } catch(e) { console.error(e) }
      setUpdatingStore(false);
  }
  const saveConfig = async () => {
      setSavingConfig(true)
      if (error) alert('Error al guardar: ' + error.message)
      else alert('✅ Configuración guardada correctamente')
      setSavingConfig(false)
  }

  const handleUploadImage = async (e, field) => {
      const file = e.target.files[0];
      if (!file) return;

      setSavingConfig(true); 

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Upload failed')
        }

        const { url } = await res.json()
        setStoreConfig(prev => ({ ...prev, [field]: url }));
      } catch (error) {
        console.error(error)
        alert('Error al subir imagen: ' + error.message);
      } finally {
        setSavingConfig(false);
      }
  }
  
  const handleRemoveImage = (field) => {
      setStoreConfig(prev => ({ ...prev, [field]: null }));
  }

  const fetchProducts = async () => { 
    try {
      const res = await fetch('/api/products?withExtras=true');
      if (res.ok) setProducts(await res.json());
    } catch(e) { console.error('Error fetching products', e) }
  }
  const fetchOrders = async () => { 
    try {
      const res = await fetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch(e) { console.error('Error fetching orders:', e) }
  }
  const fetchCategories = async () => { 
    try {
      const res = await fetch('/api/categories');
      if (res.ok) setCategories(await res.json());
    } catch(e) { console.error('Error', e) }
  }
  const fetchModifiers = async () => { 
    try {
      const res = await fetch('/api/modifier-groups');
      if (res.ok) setModifierGroups(await res.json());
    } catch(e) { console.error('Error', e) }
  }
  const fetchCoupons = async () => { 
    try {
      const res = await fetch('/api/coupons');
      if (res.ok) setCoupons(await res.json());
    } catch(e) { console.error(e) }
  }
  const fetchBanners = async () => { 
    try {
      const res = await fetch('/api/banners');
      if (res.ok) setBanners(await res.json());
    } catch(e) { console.error(e) }
  }
  const fetchOffers = async () => { 
    try {
      const res = await fetch('/api/special-offers?active=false'); // fetch all including inactive for admin
      if (res.ok) setOffers(await res.json());
    } catch(e) { console.error('Error', e) }
  }
  const fetchZones = async () => { 
    try {
      const res = await fetch('/api/restaurant-zones');
      if (res.ok) setZones(await res.json());
    } catch(e) { console.error(e) }
  }
  const fetchGroupOptions = async (groupId) => { 
    try {
      const res = await fetch(`/api/modifier-options?group_id=${groupId}`);
      if (res.ok) setGroupOptions(await res.json());
      setSelectedGroupId(groupId);
    } catch(e) { console.error(e) }
  }
  const fetchWaiters = async () => { 
    try {
      const res = await fetch('/api/waiters');
      if (res.ok) setWaiters(await res.json());
    } catch(e) { console.error(e) }
  }

  useEffect(() => {
    // Escuchar cambios en la sesión de forma estable
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadAllData();
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Sin dependencias para que solo se ejecute al montar

    // Setup Pusher Realtime
    let pusherObj;
    let orderChannel;
    let tableChannel;
    
    const setupPusher = async () => {
      const { pusherClient } = await import('@/lib/pusher');
      pusherObj = pusherClient;
      
      // Channel: Orders
      orderChannel = pusherClient.subscribe('orders');
      orderChannel.bind('order-event', (data) => {
        fetchOrders();
        if (data.message === 'new-order') {
          try {
             const audioEl = document.getElementById('order-alert-sound');
             if (audioEl) {
                 audioEl.currentTime = 0;
                 audioEl.play().catch(e => console.warn('Audio blocked:', e))
             }
          } catch(e) { console.error(e) }

          if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === "granted") {
                  new Notification("American Pizza | ¡NUEVO PEDIDO!", { body: `Ingresó un nuevo pedido.` })
              }
          }
        }
      });

      // Channel: Tables
      tableChannel = pusherClient.subscribe('tables');
      tableChannel.bind('table-event', () => {
        fetchTables();
        fetchZones();
      });
    };

    setupPusher();

    return () => { 
       if (orderChannel) orderChannel.unbind_all();
       if (tableChannel) tableChannel.unbind_all();
       if (pusherObj) {
         pusherObj.unsubscribe('orders');
         pusherObj.unsubscribe('tables');
       }
    }
  }, [session])

  const printOrder = (order) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const date = new Date(order.created_at).toLocaleString('es-AR');
    const doc = iframe.contentWindow.document;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Ticket #${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
            @page { size: 80mm auto; margin: 0; }
            body { width: 72mm; margin: 0 auto; padding: 5px; font-family: 'Roboto Mono', 'Courier margin-bottom: 10px; }
            h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
            .big-type { font-size: 16px; font-weight: 900; text-align: center; border: 2px solid #000; padding: 5px; margin: 10px 0; border-radius: 0; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { text-align: left; border-bottom: 2px solid #000; font-size: 12px; padding-bottom: 2px; }
            td { padding: 5px 0; vertical-align: top; border-bottom: 1px dotted #ccc; }
            .col-qty { width: 10%; font-weight: bold; }
            .col-prod { width: 65%; }
            .col-price { width: 25%; text-align: right; font-weight: bold; }
            .totals { border-top: 2px dashed #000; padding-top: 5px; margin-top: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
            .total-final { font-size: 22px; font-weight: 900; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header"><h1>AMERICAN PIZZA</h1><p>${date}</p><h2>PEDIDO #${order.id}</h2></div>
          <div class="big-type">${order.delivery_method === 'delivery' ? '🛵 DELIVERY' : '🏪 RETIRO'}</div>
          <div class="info">
            <p><strong>Cliente:</strong> ${order.customer_name}</p>
            <p><strong>Tel:</strong> ${order.customer_phone}</p>
            ${order.delivery_method === 'delivery' ? `<p><strong>Dirección:</strong> ${order.customer_address}</p>` : ''}
          </div>
          <table><thead><tr><th class="col-qty">Cnt</th><th class="col-prod">Producto</th><th class="col-price">Total</th></tr></thead><tbody>
            ${order.order_items.map(item => `<tr><td>${item.quantity}</td><td><strong>${item.product_name}</strong>${item.options ? `<br>${item.options}` : ''}</td><td class="col-price">$${item.price * item.quantity}</td></tr>`).join('')}
          </tbody></table>
          <div class="totals">
            <div class="row"><span>Subtotal:</span><span>$${order.total + (Number(order.discount) || 0)}</span></div>
            ${order.discount > 0 ? `<div class="row"><span>Descuento:</span><span>-$${order.discount}</span></div>` : ''}
            <div class="row total-final"><span>TOTAL:</span><span>$${order.total}</span></div>
          </div>
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { if(iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
  }

  const handleDragStart = (e, order) => { setDraggedOrder(order); e.dataTransfer.effectAllowed = "move"; }
  const handleDragEnd = (e) => { setDraggedOrder(null); setIsDraggingOver(null) }
  const handleDragOver = (e, colId) => { e.preventDefault(); if (isDraggingOver !== colId) setIsDraggingOver(colId) }
  
  const handleStatusUpdate = async (orderId, newStatus) => {
    // Actualización optimista
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        alert('Error al actualizar estado');
        fetchOrders();
      }
    } catch(e) {
      console.error(e);
      fetchOrders();
    }
  }

  const handleDrop = async (e, newStatus) => { e.preventDefault(); setIsDraggingOver(null); if (!draggedOrder || draggedOrder.status === newStatus) return; handleStatusUpdate(draggedOrder.id, newStatus); }

  const handleLogin = async (e) => { 
    e.preventDefault(); 
    setLoading(true); 
    const { error } = await supabase.auth.signInWithPassword({ email, password }); 
    if (error) alert("Error: " + error.message); 
    else {
      const { data: { session: newSession } } = await supabase.auth.getSession();
      setSession(newSession);
      loadAllData(); 
    }
    setLoading(false); 
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    router.push('/')
  }
  
  const handleCreateProduct = () => { setProductToEdit(null); setShowProductModal(true) }
  const handleEditProduct = (p) => { setProductToEdit(p); setShowProductModal(true) }
  
  const deleteProduct = async (id, imageUrl) => { 
      if (!confirm('¿Eliminar producto?')) return; 
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
           fetchProducts();
        } else {
           const err = await res.json();
           alert(err.error || 'Error deleting product');
        }
      } catch (error) { console.error(error) }
  }
  
  const toggleActive = async (id, current) => { 
      try {
         await fetch(`/api/products/${id}`, { 
           method: 'PUT', 
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ is_active: !current })
         });
         fetchProducts();
      } catch(e) { console.error(e) }
  }
  const handleCreateGroup = () => { setGroupToEdit(null); setShowGroupModal(true) }
  const handleEditGroup = (g) => { setGroupToEdit(g); setShowGroupModal(true) }
  const deleteGroup = async (id, e) => { 
      e.stopPropagation(); 
      if(!confirm('¿Borrar grupo?')) return; 
      await fetch(`/api/modifier-groups/${id}`, { method: 'DELETE' });
      fetchModifiers(); 
      if (selectedGroupId === id) setSelectedGroupId(null);
  }
  const addOption = async () => { 
      if(!selectedGroupId) return; 
      await fetch('/api/modifier-options', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ group_id: selectedGroupId, name: 'Nueva Opción', price: 0, is_available: true })
      });
      fetchGroupOptions(selectedGroupId) 
  }
  const updateOption = async (id, field, value) => { 
      await fetch(`/api/modifier-options/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ [field]: value })
      });
      fetchGroupOptions(selectedGroupId) 
  }
  const deleteOption = async (id) => { 
      if(!confirm('¿Borrar opción?')) return; 
      await fetch(`/api/modifier-options/${id}`, { method: 'DELETE' });
      fetchGroupOptions(selectedGroupId) 
  }
  const handleCreateCoupon = () => { setCouponToEdit(null); setShowCouponModal(true) }
  const handleEditCoupon = (c) => { setCouponToEdit(c); setShowCouponModal(true) }
  const deleteCoupon = async (code) => { 
      // Si decidí implementarlo en el modal o acá después, por ahora uso supahase como fallback o lo omito 
      // Por consistencia vamos migrando poco a poco. Asigno todo lo básico:
      if(!confirm('¿Eliminar cupón?')) return; 
      // Esto después requiere GET/DELETE por code. Lo mantengo como fetch si el delete maneja código o ID (TODO).
      // await supabase.from('coupons').delete().eq('code', code); 
      // Por propósitos de migración pasamos a un api route, asumo que será /api/coupons?code=...
      const res = await fetch(`/api/coupons?code=${code}`, { method: 'DELETE' });
      if (res.ok) fetchCoupons();
  }
  
  const handleCreateWaiter = async () => {
    const name = prompt('Nombre del Mozo:')
    const pin = prompt('PIN de Acceso (4-6 números):')
    if (name && pin) {
        try {
           const res = await fetch('/api/waiters', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ name, pin_code: pin })
           });
           if (res.ok) fetchWaiters();
        } catch(e) { console.error(e) }
    }
  }

  const deleteWaiter = async (id) => {
    if (!confirm('¿Eliminar mozo?')) return
    await fetch(`/api/waiters/${id}`, { method: 'DELETE' })
    fetchWaiters()
  }
  
  const deleteBanner = async (id, imageUrl) => { 
      if(!confirm('¿Eliminar banner?')) return; 
      try {
        const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
        if (res.ok) {
           fetchBanners();
        } else alert('Error borrando banner');
      } catch(e) { console.error(e) }
  }
  const toggleBannerActive = async (id, current) => { 
      await fetch(`/api/banners/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ is_active: !current }) });
      fetchBanners();
  }
  const deleteOffer = async (id) => { 
      if(!confirm('¿Eliminar oferta?')) return; 
      await fetch(`/api/special-offers/${id}`, { method: 'DELETE' });
      fetchOffers(); fetchProducts();
  }
  const toggleOfferActive = async (id, current) => { 
      await fetch(`/api/special-offers/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ is_active: !current })
      });
      fetchOffers() 
  }

  // --- MESA ACTIONS ---
  const handleCreateTable = (zoneId) => {
    if (!zoneId) { alert('Debes tener al menos una zona.'); return; }
    setCurrentZoneId(zoneId)
    setShowTableFormModal(true)
  }

  const handleCreateZone = () => {
    setShowZoneModal(true)
  }

  const handleTableClick = (table) => {
    if (designMode) return // En modo diseño no abre sesión
    setSelectedTable(table)
    setShowSessionModal(true)
  }

  if (!session) return <LoginScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} loading={loading} />

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const OrderCard = ({ order }) => {
    const getNextStatus = (current) => {
        if (current === 'pending') return { id: 'cooking', label: 'COCINA', icon: Utensils, color: 'red' };
        if (current === 'cooking') {
            if (order.delivery_method === 'mesa') {
                return { id: 'completed', label: 'LISTO', icon: Check, color: 'green' };
            }
            return { id: 'delivery', label: 'CAMINO', icon: Truck, color: 'blue' };
        }
        if (current === 'delivery') return { id: 'completed', label: 'LISTO', icon: Check, color: 'green' };
        return null;
    }

    const next = getNextStatus(order.status);

    return (
      <div 
        draggable="true"
        onDragStart={(e) => handleDragStart(e, order)}
        onDragEnd={handleDragEnd}
        className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-3 shadow-sm hover:border-[#E31B23]/40 transition-all mb-2 flex flex-col gap-1.5 group cursor-grab active:cursor-grabbing hover:shadow-md hover:translate-y-[-1px] select-none relative"
      >
          <div className="flex justify-between items-start border-b border-white/10 pb-1.5 pointer-events-none">
             <div className="flex items-center gap-1.5"><GripVertical size={14} className="text-white/20 transition-colors"/><div><span className="font-black text-white text-base sm:text-lg leading-none">#{order.id}</span><p className="text-[10px] text-white/60 font-bold uppercase truncate max-w-[80px] sm:max-w-[120px] mt-0.5">{order.customer_name}</p></div></div>
             <div className="flex flex-col items-end gap-1 pointer-events-auto">
                <div className="flex gap-1 mb-1">
                    <button onClick={() => printOrder(order)} className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded transition border border-white/5"><Printer size={14} /></button>
                    {next && (
                        <button 
                            onClick={() => handleStatusUpdate(order.id, next.id)}
                            className={`p-1.5 rounded transition flex items-center gap-1 font-bold text-[9px] uppercase tracking-tighter shadow-lg border border-white/10 animate-in fade-in zoom-in duration-300
                                ${next.id === 'cooking' ? 'bg-red-600 hover:bg-red-500 text-white' : 
                                  next.id === 'delivery' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 
                                  'bg-green-600 hover:bg-green-500 text-white'}`}
                        >
                            {next.label} <ChevronRight size={12}/>
                        </button>
                    )}
                </div>
                <span className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold uppercase tracking-wide flex items-center gap-1
                    ${order.delivery_method === 'delivery' ? 'bg-[#E31B23] text-white' : 
                      order.delivery_method === 'mesa' ? 'bg-purple-600 text-white' : 
                      'bg-black text-white border border-white/20'}`}>
                    {order.delivery_method === 'delivery' ? <Truck size={10}/> : order.delivery_method === 'mesa' ? <Coffee size={10}/> : <ShoppingBag size={10}/>}
                    {order.delivery_method === 'mesa' ? (order.table_label?.toLowerCase().includes('mesa') ? order.table_label.toUpperCase() : `MESA ${order.table_label?.toUpperCase() || 'S/N'}`) : order.delivery_method === 'delivery' ? 'DELIVERY' : 'RETIRO'}
                </span>
             </div>
          </div>
          <div className="space-y-1.5 py-1 pointer-events-none">{order.order_items.map(item => (<div key={item.id} className="text-[11px] sm:text-sm leading-tight"><div className="flex gap-2"><span className="text-[#E31B23] font-bold">{item.quantity}x</span> <span className="text-white/90 truncate">{item.product_name}</span></div>{item.options && <p className="text-[9px] text-white/40 ml-5 line-clamp-1">+ {item.options}</p>}{item.note && <p className="text-[9px] text-yellow-500 ml-5 italic bg-yellow-400/5 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-yellow-400/10 truncate">📝 {item.note}</p>}</div>))}</div>
          <div className="pt-1.5 mt-auto border-t border-white/10 pointer-events-none">
              <div className="flex justify-between items-center mb-1.5 text-xs sm:text-sm uppercase tracking-tight">
                  <span className="text-[9px] text-white/40 font-medium flex items-center gap-1">
                      {order.payment_method === 'mercadopago' || order.payment_method === 'QR' ? <CreditCard size={10} className="text-sky-400"/> : 
                       order.payment_method === 'A DEFINIR' ? <Clock size={10} className="text-yellow-500"/> :
                       <Wallet size={10} className="text-green-500"/>}
                      {order.payment_method === 'A DEFINIR' ? 'PAGO PENDIENTE' : (order.payment_method || 'EFECTIVO')}
                  </span>
                  <span className="font-black text-white">${order.total}</span>
              </div>
              {order.delivery_method === 'delivery' && (
                  <div className="text-[9px] text-white/40 flex items-start gap-1 bg-black/40 p-1 rounded">
                      <MapPin size={9} className="mt-0.5 text-[#E31B23] shrink-0"/> 
                      <span className="line-clamp-1">{order.customer_address}</span>
                  </div>
              )}
          </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans text-white flex flex-col h-screen overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade-right {
          -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
      `}} />
      
      {/* NAVBAR */}
      <nav className="bg-[#1A1A1A] border-b border-white/10 p-2 sm:p-4 shrink-0 flex justify-between items-center z-40 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <img src="/logo.png" alt="American Pizza Admin" className="h-8 sm:h-16 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-4 overflow-hidden">
          <audio id="order-alert-sound" src="https://cdn.pixabay.com/download/audio/2021/08/04/audio_3d1da9ac74.mp3?filename=cash-register-kaching-93513.mp3" preload="auto"></audio>
          
          <button onClick={() => {
              if (!soundEnabled) {
                 setSoundEnabled(true);
                 const audioEl = document.getElementById('order-alert-sound');
                 if (audioEl) { 
                     audioEl.volume = 0;
                     audioEl.play().then(() => { audioEl.pause(); audioEl.volume = 1; }).catch(()=>{}); 
                 }
                 if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== "granted") {
                     Notification.requestPermission();
                 }
              } else {
                 setSoundEnabled(false);
              }
          }} className={`p-2 rounded-full transition-all shrink-0 ${soundEnabled ? 'bg-green-600/20 text-green-500' : 'bg-[#E31B23]/20 text-[#E31B23] animate-pulse'}`}>
             {soundEnabled ? <Megaphone size={16}/> : <Megaphone size={16} className="opacity-40"/>}
          </button>
          <div className="flex bg-white/5 rounded-lg p-1 overflow-x-auto no-scrollbar mask-fade-right max-w-[180px] sm:max-w-none">
             {[
               {id:'orders',icon:ShoppingBag},
               {id:'tables',icon:Coffee},
               {id:'menu',icon:Utensils},
               {id:'extras',icon:Layers},
               {id:'coupons',icon:Ticket},
               {id:'promos',icon:Megaphone},
               {id:'waiters',icon:User},
               {id:'metrics',icon:TrendingUp},
               {id:'settings',icon:Settings}
             ].map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`p-2 rounded transition shrink-0 ${activeTab === t.id ? 'bg-[#E31B23] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}><t.icon size={18}/></button>))}
          </div>
          
          <button onClick={toggleStoreStatus} disabled={updatingStore} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shrink-0 ${storeOpen ? 'bg-green-600' : 'bg-[#E31B23]'}`}>
            {storeOpen ? <Unlock size={12}/> : <Lock size={12}/>}
            <span className="hidden sm:inline">{storeOpen ? 'ABIERTO' : 'CERRADO'}</span>
          </button>
          <button onClick={handleLogout} className="text-white/40 hover:text-[#E31B23] shrink-0 p-1.5 sm:p-2"><LogOut size={16}/></button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative">
        
        {activeTab === 'orders' && (
          <div className="h-full p-4 overflow-x-auto dash-scroll">
             <div className="flex gap-4 h-full min-w-[1200px]">
                 {[{id:'pending',label:'PENDIENTES',color:'yellow',icon:Clock},{id:'cooking',label:'COCINA',color:'red',icon:Utensils},{id:'delivery',label:'EN CAMINO',color:'blue',icon:Truck},{id:'completed',label:'LISTOS',color:'green',icon:CheckCircle}].map(col => (
                     <div key={col.id} onDragOver={(e) => handleDragOver(e, col.id)} onDrop={(e) => handleDrop(e, col.id)} className={`flex-1 flex flex-col rounded-xl border-white/10 border h-full transition-colors duration-200 ${isDraggingOver === col.id ? 'bg-white/10' : 'bg-white/5'}`}>
                         <div className={`p-3 border-b border-white/10 rounded-t-xl flex justify-between items-center ${col.color==='yellow'?'text-yellow-500':col.color==='red'?'text-red-500':col.color==='blue'?'text-blue-400':'text-green-600'}`}>
                             <h3 className="font-black flex items-center gap-2"><col.icon size={16}/> {col.label}</h3><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10">
                                 {orders.filter(o => o.status === col.id && (col.id !== 'delivery' || o.delivery_method === 'delivery')).length}
                             </span>
                         </div>
                         <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                             {orders.filter(o => o.status === col.id).map(order => <OrderCard key={order.id} order={order} />)}
                         </div>
                     </div>
                 ))}
             </div>
          </div>
        )}

        {activeTab === 'tables' && (
            <div className="h-full p-4 overflow-hidden dash-scroll">
                {showManagementView ? (
                    <AdminTableManagement onBack={() => setShowManagementView(false)} />
                ) : (
                    <AdminTableMap 
                        zones={zones} 
                        tables={tables} 
                        onTableClick={handleTableClick}
                        onCreateTable={handleCreateTable}
                        onCreateZone={handleCreateZone}
                        onRefresh={loadAllData}
                        designMode={designMode}
                        setDesignMode={setDesignMode}
                        onShowManagement={() => setShowManagementView(true)}
                    />
                )}
            </div>
        )}

        {activeTab === 'metrics' && <div className="h-full overflow-y-auto p-4"><DashboardMetrics /></div>}

        {activeTab === 'waiters' && (
            <div className="h-full overflow-y-auto w-full">
                <AdminWaiterDashboard />
            </div>
        )}

        {activeTab === 'menu' && (
           <div className="h-full overflow-y-auto p-4 custom-scrollbar pb-20">
               <div className="space-y-6 max-w-7xl mx-auto">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1A1A1A] p-4 rounded-xl border border-white/10">
                       <div className="flex gap-3 flex-1 w-full">
                           <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-black border border-white/20 rounded-lg py-2 px-4 text-sm" />
                           <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-black border border-white/20 rounded-lg px-4 py-2 text-sm">
                               <option value="Todas">Todas</option>
                               {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                           </select>
                       </div>
                       <div className="flex gap-3">
                           <button onClick={() => setShowCategoryModal(true)} className="bg-white/5 px-4 py-2 rounded-lg font-bold text-sm border border-white/10">CATEGORÍAS</button>
                           <button onClick={handleCreateProduct} className="bg-[#E31B23] px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={18}/> NUEVO</button>
                       </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       {filteredProducts.map(p => (
                           <div key={p.id} className={`bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden flex flex-col ${!p.is_active ? 'opacity-50' : ''}`}>
                               <div className="flex p-4 gap-3">
                                   <div className="w-16 h-16 bg-black rounded-lg overflow-hidden shrink-0">
                                       {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full">🍔</div>}
                                   </div>
                                   <div className="flex flex-col justify-between overflow-hidden">
                                       <h3 className="font-bold text-sm truncate">{p.name}</h3>
                                       <p className="text-lg font-black text-[#E31B23]">${p.price}</p>
                                   </div>
                               </div>
                               <div className="bg-black/40 p-2 flex justify-between gap-2">
                                   <button onClick={() => toggleActive(p.id, p.is_active)} className="flex-1 py-2 rounded-lg bg-white/5 text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-widest">{p.is_active ? 'Ocultar' : 'Mostrar'}</button>
                                   <button onClick={() => handleEditProduct(p)} className="p-2 text-white/70 hover:text-white"><Edit size={16}/></button>
                                   <button onClick={() => deleteProduct(p.id, p.image_url)} className="p-2 text-red-500/70 hover:text-red-500"><Trash2 size={16}/></button>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           </div>
        )}

        {activeTab === 'extras' && (
            <div className="h-full overflow-y-auto p-4 pb-20">
                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto h-[600px]">
                    <div className="bg-[#1A1A1A] rounded-xl border border-white/10 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5"><h3 className="font-bold">GRUPOS</h3><button onClick={handleCreateGroup} className="bg-[#E31B23] px-3 py-2 rounded text-xs font-bold">NUEVO</button></div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-2">{modifierGroups.map(g => (<div key={g.id} onClick={() => fetchGroupOptions(g.id)} className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition ${selectedGroupId === g.id ? 'bg-[#E31B23]/20 border-[#E31B23]' : 'bg-black border-white/10'}`}><span className="font-bold text-sm">{g.name}</span><div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); handleEditGroup(g) }} className="text-white/60 hover:text-white"><Edit size={14}/></button><button onClick={(e) => deleteGroup(g.id, e)} className="text-red-500/60 hover:text-red-500"><Trash2 size={14}/></button></div></div>))}</div>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-xl border border-white/10 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5"><h3 className="font-bold">OPCIONES</h3>{selectedGroupId && <button onClick={addOption} className="bg-green-600 px-3 py-2 rounded text-xs font-bold">AGREGAR</button>}</div>
                        <div className="p-4 overflow-y-auto flex-1">{selectedGroupId ? <div className="space-y-2">{groupOptions.map(opt => (<div key={opt.id} className="flex gap-3 items-center bg-black p-3 rounded-xl border border-white/10"><input className="bg-transparent text-sm flex-1" defaultValue={opt.name} onBlur={(e) => updateOption(opt.id, 'name', e.target.value)} /><input className="bg-transparent text-sm w-16 text-right font-bold text-[#E31B23]" type="number" defaultValue={opt.price} onBlur={(e) => updateOption(opt.id, 'price', e.target.value)} /><button onClick={() => updateOption(opt.id, 'is_available', !opt.is_available)} className={`px-2 py-1 rounded text-[10px] font-bold ${opt.is_available ? 'text-green-500' : 'text-red-500'}`}>{opt.is_available ? 'STOCK' : 'OUT'}</button><button onClick={() => deleteOption(opt.id)} className="text-white/20 hover:text-red-500"><Trash2 size={16}/></button></div>))}</div> : <p className="text-center text-white/20 mt-20">Selecciona un grupo</p>}</div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'coupons' && (
           <div className="h-full overflow-y-auto p-4 pb-20"><div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4 max-w-4xl mx-auto"><div className="flex justify-end mb-4"><button onClick={handleCreateCoupon} className="bg-[#E31B23] px-4 py-2 rounded font-bold text-sm">NUEVO CUPÓN</button></div><div className="grid gap-3">{coupons.map(c => (<div key={c.code} className="flex justify-between items-center bg-black border border-white/10 p-4 rounded-xl"><span className="font-black text-lg tracking-widest text-[#E31B23]">{c.code}</span><div className="flex gap-4"><button onClick={() => handleEditCoupon(c)} className="text-white/60 hover:text-white"><Edit size={16}/></button> <button onClick={() => deleteCoupon(c.code)} className="text-red-500/60 hover:text-red-500"><Trash2 size={16}/></button></div></div>))}</div></div></div>
        )}

        {activeTab === 'promos' && (
           <div className="h-full overflow-y-auto p-4 pb-20">
               <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                   <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4">
                       <div className="flex justify-between items-center mb-4"><h3 className="font-bold flex items-center gap-2"><Megaphone size={18}/> BANNERS</h3><button onClick={() => setShowBannerModal(true)} className="bg-blue-600 px-3 py-1.5 rounded text-xs font-bold">SUBIR</button></div>
                       <div className="grid gap-4">{banners.map(b => (<div key={b.id} className="relative group"><img src={b.image_url} className="w-full aspect-video object-cover rounded-xl border border-white/10"/><div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl"><button onClick={() => deleteBanner(b.id, b.image_url)} className="bg-red-500 p-3 rounded-full hover:scale-110 transition-transform"><Trash2 size={20}/></button></div></div>))}</div>
                   </div>
                   <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4">
                       <div className="flex justify-between items-center mb-4"><h3 className="font-bold flex items-center gap-2"><Zap size={18} className="text-yellow-500"/> OFERTAS</h3><button onClick={() => setShowOfferModal(true)} className="bg-yellow-600 px-3 py-1.5 rounded text-xs font-bold">CREAR</button></div>
                       <div className="space-y-3">{offers.map(offer => (<div key={offer.id} className="bg-black p-3 rounded-xl border border-white/10 flex justify-between items-center"><div><h4 className="font-bold">{offer.title}</h4><p className="text-xs text-white/50">{offer.discount_value}</p></div><button onClick={() => deleteOffer(offer.id)} className="text-red-500/50 hover:text-red-500"><Trash2 size={18}/></button></div>))}</div>
                   </div>
               </div>
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="h-full overflow-y-auto p-4 pb-20">
               <div className="max-w-2xl mx-auto bg-[#1A1A1A] rounded-2xl border border-white/10 overflow-hidden">
                   <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center"><h2 className="font-black">AJUSTES</h2><button onClick={saveConfig} disabled={savingConfig} className="bg-green-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">{savingConfig ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} GUARDAR</button></div>
                   <div className="p-6 space-y-6">
                       <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase">WhatsApp</label><input type="text" className="w-full bg-black border border-white/20 rounded-xl p-3" value={storeConfig.whatsapp_number || ''} onChange={e => setStoreConfig({...storeConfig, whatsapp_number: e.target.value})} /></div>
                       <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase">Base $</label><input type="number" className="w-full bg-black border border-white/20 rounded-xl p-3" value={storeConfig.delivery_base_price || ''} onChange={e => setStoreConfig({...storeConfig, delivery_base_price: e.target.value})} /></div>
                           <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase">KM Base</label><input type="number" className="w-full bg-black border border-white/20 rounded-xl p-3" value={storeConfig.delivery_free_base_km || ''} onChange={e => setStoreConfig({...storeConfig, delivery_free_base_km: e.target.value})} /></div>
                           <div className="space-y-2"><label className="text-xs font-bold text-white/50 uppercase">Extra KM $</label><input type="number" className="w-full bg-black border border-white/20 rounded-xl p-3" value={storeConfig.delivery_price_per_extra_km || ''} onChange={e => setStoreConfig({...storeConfig, delivery_price_per_extra_km: e.target.value})} /></div>
                       </div>
                       <div className="pt-6 border-t border-white/10">
                           <Link href="/mozo" target="_blank" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-[#E31B23] transition-all group">
                               <div className="flex items-center gap-4 text-white">
                                   <div className="p-3 bg-black rounded-xl text-[#E31B23]">
                                       <Smartphone size={24}/>
                                   </div>
                                   <div>
                                       <p className="font-black text-sm uppercase tracking-tighter">APP DE MOZOS</p>
                                       <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Abrir terminal móvil para personal</p>
                                   </div>
                               </div>
                               <ChevronRight size={20} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all"/>
                           </Link>
                       </div>
                   </div>
               </div>
           </div>
        )}

      </main>

      {/* MODALES */}
      {showCategoryModal && <AdminCategoryForm onCancel={() => setShowCategoryModal(false)} onSaved={() => { fetchCategories(); fetchProducts(); }} />}
      {showProductModal && <AdminProductForm productToEdit={productToEdit} onCancel={() => setShowProductModal(false)} onSaved={() => { setShowProductModal(false); fetchProducts() }} />}
      {showGroupModal && <AdminGroupForm groupToEdit={groupToEdit} onCancel={() => setShowGroupModal(false)} onSaved={() => { setShowGroupModal(false); fetchModifiers() }} />}
      {showCouponModal && <AdminCouponForm couponToEdit={couponToEdit} onCancel={() => setShowCouponModal(false)} onSaved={() => { setShowCouponModal(false); fetchCoupons() }} />}
      {showBannerModal && <AdminBannerForm onCancel={() => setShowBannerModal(false)} onSaved={() => { setShowBannerModal(false); fetchBanners() }} />}
      {showOfferModal && <AdminOfferForm onCancel={() => setShowOfferModal(false)} onSaved={() => { setShowOfferModal(false); fetchOffers() }} />}
      
      {showSessionModal && (
          <TableSessionModal 
            table={selectedTable} 
            products={products}
            onClose={() => setShowSessionModal(false)}
            onRefresh={() => { fetchTables(); fetchOrders(); }}
          />
      )}

      {showZoneModal && (
          <AdminZoneForm 
            onClose={() => setShowZoneModal(false)} 
            onRefresh={fetchZones} 
          />
      )}

      {showTableFormModal && (
          <AdminTableForm 
            zoneId={currentZoneId}
            onClose={() => setShowTableFormModal(false)} 
            onRefresh={fetchTables} 
          />
      )}

    </div>
  )
}

function LoginScreen({ email, setEmail, password, setPassword, handleLogin, loading }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="relative bg-[#1A1A1A] border border-white/10 p-8 pt-16 rounded-2xl w-full max-w-md shadow-xl">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-[#0A0A0A] border border-white/10 rounded-full p-3 flex items-center justify-center shadow-2xl">
            <img src="/logo.png" alt="American Pizza" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-lg font-black text-center mb-8 uppercase tracking-widest text-[#E31B23]">Acceso Admin</h1>
        <form onSubmit={handleLogin} className="space-y-5">
          <input type="email" placeholder="Email" className="w-full p-4 bg-black border border-white/20 rounded-xl text-white outline-none focus:border-[#E31B23] transition-colors" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Contraseña" className="w-full p-4 bg-black border border-white/20 rounded-xl text-white outline-none focus:border-[#E31B23] transition-colors" value={password} onChange={e => setPassword(e.target.value)} />
          <button disabled={loading} className="w-full bg-[#E31B23] hover:bg-[#C1121F] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">{loading ? <Loader2 className="animate-spin" size={20} /> : 'ENTRAR'}</button>
        </form>
      </div>
    </div>
  )
}