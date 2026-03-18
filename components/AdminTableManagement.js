'use client'
import { useState, useEffect } from 'react'
import { Calendar, DollarSign, Clock, User, Coffee, Search, Download, Trash2, ArrowLeft, BarChart3 } from 'lucide-react'
import AdminTableStats from './AdminTableStats'

export default function AdminTableManagement({ onBack }) {
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchHistory()
    }, [filterDate])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/table-sessions?status=closed');
            if (res.ok) {
                const data = await res.json();
                setHistory(data || [])
            }
        } catch(e) { console.error(e) }
        setLoading(false)
    }

    const totalSales = history.reduce((acc, session) => acc + (Number(session.total) || 0), 0)
    const totalDiscounts = history.reduce((acc, session) => acc + (Number(session.discount) || 0), 0)

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Gestión */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1A1A1A] p-6 rounded-[32px] border border-white/10 shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase text-[#E31B23]">Auditoría de Salón</h2>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Información Táctica y Gestión</p>
                    </div>
                </div>
            </div>

            {/* Estadísticas Elite */}
            <AdminTableStats history={history} />

            {/* Listado de Historial */}
            <div className="flex-1 bg-[#121212] rounded-[32px] border border-white/5 p-8 overflow-hidden flex flex-col shadow-inner">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                        <Clock size={14}/> Cuentas Cerradas Recentemente
                    </h3>
                    <div className="flex gap-2">
                         <input 
                            type="date" 
                            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-[#E31B23]"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                         />
                         <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"><Download size={16}/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {loading ? (
                        [1,2,3].map(n => <div key={n} className="h-20 bg-white/5 rounded-3xl animate-pulse"></div>)
                    ) : history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-white/10">
                            <Coffee size={48} className="mb-4 opacity-10"/>
                            <p className="font-black uppercase tracking-widest text-sm italic">No hay registros hoy</p>
                        </div>
                    ) : history.map(session => (
                        <div key={session.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-[24px] flex items-center justify-between hover:bg-white/5 transition-all group">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-black rounded-2xl border border-white/5 text-[#E31B23]">
                                    <Coffee size={20}/>
                                </div>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-tight text-white/90">Mesa {session.restaurant_tables?.label || 'S/N'}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-bold text-white/30 flex items-center gap-1"><Clock size={10}/> {new Date(session.closed_at).toLocaleTimeString()}</span>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${session.payment_method === 'EFECTIVO' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                            {session.payment_method || 'S/D'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-right flex items-center gap-8">
                                <div className="hidden sm:block">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Subtotal: ${Number(session.total) + Number(session.discount)}</p>
                                    <p className="text-[9px] font-black text-red-500/50 uppercase tracking-widest">Desc: -${session.discount}</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <p className="text-lg font-black text-white italic tracking-tighter">${session.total}</p>
                                    <button className="p-1 px-2 bg-white/5 rounded text-[8px] font-black text-white/20 hover:bg-red-500/20 hover:text-red-500 transition-all uppercase mt-1">Borrar</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
