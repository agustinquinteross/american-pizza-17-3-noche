'use client'
import { useState, useEffect, useRef } from 'react'
import WaiterLogin from '../../components/WaiterLogin'
import AdminTableMap from '../../components/AdminTableMap'
import TableSessionModal from '../../components/TableSessionModal'
import { LogOut, Coffee, Map as MapIcon, RefreshCw, Smartphone } from 'lucide-react'

export default function MozoPage() {
    const [waiter, setWaiter] = useState(null)
    const [zones, setZones] = useState([])
    const [categories, setCategories] = useState([])
    const [tables, setTables] = useState([])
    const [products, setProducts] = useState([])
    const [selectedTable, _setSelectedTable] = useState(null)
    const selectedTableRef = useRef(null)

    const setSelectedTable = (table) => {
        selectedTableRef.current = table
        _setSelectedTable(table)
    }

    const [loading, setLoading] = useState(true)
    const [designMode, setDesignMode] = useState(false) // Siempre false para mozos

    useEffect(() => {
        // Cargar datos básicos
        loadData()
        
        // Mantener sesión de mozo localmente
        const savedWaiter = localStorage.getItem('active_waiter')
        if (savedWaiter) setWaiter(JSON.parse(savedWaiter))

        // --- PUSHER REALTIME ---
        let pusherObj;
        let tableChannel;
        let orderChannel;

        const setupPusher = async () => {
            const { pusherClient } = await import('@/lib/pusher');
            pusherObj = pusherClient;

            tableChannel = pusherClient.subscribe('tables');
            tableChannel.bind('table-event', () => loadData(false));

            orderChannel = pusherClient.subscribe('orders');
            orderChannel.bind('order-event', () => loadData(false));
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
    }, [])

    const loadData = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        try {
            const [zRes, tRes, pRes, cRes] = await Promise.all([
                fetch('/api/restaurant-zones'),
                fetch('/api/restaurant-tables'),
                fetch('/api/products?withExtras=true'),
                fetch('/api/categories')
            ]);
            
            const newZones = zRes.ok ? await zRes.json() : [];
            const newTables = tRes.ok ? await tRes.json() : [];
            let newProducts = pRes.ok ? await pRes.json() : [];
            const newCategories = cRes.ok ? await cRes.json() : [];

            // Filter active products as the original query did
            newProducts = newProducts.filter(p => p.is_active);

            setZones(newZones);
            setCategories(newCategories);
            setTables(newTables);
            setProducts(newProducts);

            // Sincronizar mesa seleccionada si existe para evitar que el modal se cierre solo
            const currentTable = selectedTableRef.current
            if (currentTable) {
                const updatedTable = newTables.find(t => t.id === currentTable.id)
                if (updatedTable) {
                    setSelectedTable(updatedTable)
                }
            }
        } catch (error) {
            console.error('Error loading mozo data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogin = (waiterObj) => {
        setWaiter(waiterObj)
        localStorage.setItem('active_waiter', JSON.stringify(waiterObj))
    }

    const handleLogout = () => {
        setWaiter(null)
        localStorage.removeItem('active_waiter')
    }

    if (!waiter) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center mb-8 gap-3">
                        <Smartphone size={48} className="text-[#E31B23] animate-pulse"/>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter">American Mozo v2.0</h1>
                    </div>
                    <WaiterLogin onLogin={handleLogin} />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen h-[100dvh] bg-[#0A0A0A] text-white flex flex-col overflow-hidden select-none">
            {/* Header Mozo */}
            <nav className="bg-[#1A1A1A] border-b border-white/10 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E31B23] rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-[#E31B23]/20">
                        {waiter.name[0]}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Mozo Activo</p>
                        <p className="font-bold text-sm uppercase">{waiter.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                    </button>
                    <button onClick={handleLogout} className="p-3 bg-white/5 rounded-2xl hover:bg-[#E31B23]/20 text-white/40 hover:text-[#E31B23] transition-colors">
                        <LogOut size={20}/>
                    </button>
                </div>
            </nav>

            <main className="flex-1 overflow-hidden relative p-2 sm:p-4 flex flex-col">
                <div className="flex-1 flex flex-col min-h-0 bg-[#121212] rounded-[24px] sm:rounded-[32px] border border-white/5 overflow-hidden">
                    <AdminTableMap 
                        zones={zones}
                        tables={tables}
                        designMode={false}
                        setDesignMode={() => {}} // Deshabilitado para mozos
                        onTableClick={(table) => setSelectedTable(table)}
                        onRefresh={loadData}
                        onShowManagement={() => {}} // Deshabilitado
                        isAdmin={false}
                        initialView="grid"
                        loggedWaiter={waiter}
                    />
                </div>
            </main>



            {/* Modal de Sesión (El mismo que el admin, pero cargado aquí) */}
            {selectedTable && (
                <TableSessionModal 
                    table={selectedTable}
                    products={products}
                    categories={categories}
                    onClose={() => setSelectedTable(null)}
                    onRefresh={loadData}
                    loggedWaiter={waiter}
                />
            )}
        </div>
    )
}
