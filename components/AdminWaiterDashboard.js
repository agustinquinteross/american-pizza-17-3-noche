'use client'
import { useState, useEffect } from 'react'
import { User, Plus, Trash2, TrendingUp, DollarSign, Coffee, Calendar, RefreshCw, X } from 'lucide-react'

export default function AdminWaiterDashboard() {
    const [waiters, setWaiters] = useState([])
    const [stats, setStats] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newWaiter, setNewWaiter] = useState({ name: '', pin_code: '' })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [wRes, sRes] = await Promise.all([
                fetch('/api/waiters'),
                fetch('/api/table-sessions?waiters=true')
            ]);
            
            const waitersList = wRes.ok ? await wRes.json() : [];
            const sessions = sRes.ok ? await sRes.json() : [];

            // Procesar analíticas
            const processedStats = waitersList.map(waiter => {
                const waiterSessions = sessions.filter(s => s.waiter_id === waiter.id)
                const totalSales = waiterSessions.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
                const closedSessions = waiterSessions.filter(s => s.status === 'closed').length
                const activeSessions = waiterSessions.filter(s => s.status !== 'closed').length

                return {
                    ...waiter,
                    totalSales,
                    closedSessions,
                    activeSessions,
                    avgPerSession: closedSessions > 0 ? Math.round(totalSales / closedSessions) : 0
                }
            }).sort((a, b) => b.totalSales - a.totalSales)

            setWaiters(waitersList)
            setStats(processedStats)
        } catch(e) { console.error(e) } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!newWaiter.name || !newWaiter.pin_code) return

        try {
            const res = await fetch('/api/waiters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWaiter)
            });
            if (res.ok) {
                setNewWaiter({ name: '', pin_code: '' })
                setShowAddForm(false)
                fetchData()
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch(e) { console.error(e) }
    }

    const deleteWaiter = async (id) => {
        if (!confirm('¿Eliminar mozo? Esto no borrará sus analíticas pasadas pero ya no podrá loguearse.')) return
        try {
            const res = await fetch(`/api/waiters/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData()
        } catch(e) { console.error(e) }
    }

    if (loading && stats.length === 0) return (
        <div className="flex items-center justify-center p-20">
            <RefreshCw className="animate-spin text-[#E31B23]" size={32} />
        </div>
    )

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6">
            {/* Header / Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1A1A1A] border border-white/10 p-6 rounded-[32px] flex flex-col justify-between">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Personal Activo</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black italic text-white">{waiters.length}</span>
                        <span className="text-xs font-bold text-white/20 uppercase">Mozos</span>
                    </div>
                </div>
                <div className="bg-[#E31B23] p-6 rounded-[32px] flex flex-col justify-between shadow-lg shadow-[#E31B23]/20">
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-4">Ventas Totales (Salón)</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black italic text-white">${Math.round(stats.reduce((acc, w) => acc + w.totalSales, 0)).toLocaleString('es-AR')}</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[32px] flex flex-col justify-between shadow-xl">
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-4">Eficiencia Operativa</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black italic text-black">
                            {waiters.length > 0 ? Math.round(stats.reduce((acc, w) => acc + w.closedSessions, 0) / waiters.length) : 0}
                        </span>
                        <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Mesas c/u</span>
                    </div>
                </div>
            </div>

            {/* Ranking de Mozos */}
            <div className="bg-[#1A1A1A] border border-white/10 rounded-[40px] overflow-hidden">
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                            <TrendingUp className="text-[#E31B23]" /> Ranking de Desempeño
                        </h3>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Productividad basada en ventas y mesas</p>
                    </div>
                    <button 
                        onClick={() => setShowAddForm(true)}
                        className="bg-[#E31B23] px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all text-white"
                    >
                        Contratar Mozo
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/40">
                                <th className="px-8 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Mozo</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Facturación</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Mesas (Cerradas)</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Promedio / Mesa</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-center">PIN</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.map((waiter, index) => (
                                <tr key={waiter.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center font-black text-[#E31B23]">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-black text-white uppercase tracking-tight">{waiter.name}</p>
                                                {waiter.activeSessions > 0 && (
                                                    <span className="text-[8px] bg-green-600/20 text-green-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-green-600/20">Atendiendo {waiter.activeSessions} mesas</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-2xl font-black italic text-white tracking-tighter">${Math.round(waiter.totalSales).toLocaleString('es-AR')}</p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="font-black text-white/60">{waiter.closedSessions}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <p className="text-xs font-bold text-white/40">${Math.round(waiter.avgPerSession).toLocaleString('es-AR')}</p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <code className="bg-black px-3 py-1 rounded-lg text-xs border border-white/5 font-mono text-[#E31B23]">{waiter.pin_code}</code>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => deleteWaiter(waiter.id)}
                                            className="p-2 text-white/10 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Agregar Mozo */}
            {showAddForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#1A1A1A] border border-white/10 rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Nuevo Integrante</h3>
                            <button onClick={() => setShowAddForm(false)} className="text-white/20"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nombre Completo</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#E31B23] transition-all"
                                    placeholder="Ej: Juan Pérez"
                                    value={newWaiter.name}
                                    onChange={e => setNewWaiter({...newWaiter, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">PIN de Acceso (Numérico)</label>
                                <input 
                                    type="text" 
                                    maxLength={6}
                                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#E31B23] transition-all font-mono"
                                    placeholder="4-6 dígitos"
                                    value={newWaiter.pin_code}
                                    onChange={e => setNewWaiter({...newWaiter, pin_code: e.target.value.replace(/\D/g, '')})}
                                />
                            </div>
                            <button className="w-full bg-[#E31B23] py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white mt-4 shadow-lg shadow-[#E31B23]/20">Confirmar Alta</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
