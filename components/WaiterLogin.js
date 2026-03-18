'use client'
import { useState, useEffect } from 'react'
import { Lock, User, ChevronRight, X, Delete } from 'lucide-react'

export default function WaiterLogin({ onLogin }) {
    const [pin, setPin] = useState('')
    const [waiters, setWaiters] = useState([])
    const [selectedWaiter, setSelectedWaiter] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchWaiters()
    }, [])

    const fetchWaiters = async () => {
        try {
            const res = await fetch('/api/waiters');
            if (res.ok) {
                const data = await res.json();
                setWaiters(data || []);
            }
        } catch(e) { console.error(e) }
        setLoading(false);
    }

    const handleNumberClick = (num) => {
        if (pin.length < 6) {
            setPin(prev => prev + num)
            setError(null)
        }
    }

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1))
    }

    const handleSubmit = async () => {
        if (!selectedWaiter) {
            setError('Selecciona un mozo primero')
            return
        }

        if (pin === selectedWaiter.pin_code) {
            onLogin(selectedWaiter)
        } else {
            setError('PIN Incorrecto')
            setPin('')
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
            <div className="w-10 h-10 border-4 border-[#E31B23] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Cargando Personal...</p>
        </div>
    )

    return (
        <div className="w-full max-w-md bg-[#1A1A1A] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-black rounded-full border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <User size={40} className="text-[#E31B23]"/>
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Acceso Mozo</h2>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Identifícate para operar</p>
            </div>

            {/* Selector de Mozo */}
            {!selectedWaiter ? (
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {waiters.map(waiter => (
                        <button
                            key={waiter.id}
                            onClick={() => setSelectedWaiter(waiter)}
                            className="p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-[#E31B23]/50 transition-all text-center group"
                        >
                            <p className="font-black text-xs uppercase tracking-tight text-white/60 group-hover:text-white">{waiter.name}</p>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#E31B23] rounded-full flex items-center justify-center font-black text-xs">{selectedWaiter.name[0]}</div>
                            <span className="font-black text-sm uppercase">{selectedWaiter.name}</span>
                        </div>
                        <button onClick={() => { setSelectedWaiter(null); setPin(''); }} className="p-2 text-white/20 hover:text-white"><X size={16}/></button>
                    </div>

                    {/* Visor de PIN */}
                    <div className="flex justify-center gap-3">
                        {[1, 2, 3, 4].map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-4 h-4 rounded-full border-2 transition-all duration-300
                                    ${pin.length > i ? 'bg-[#E31B23] border-[#E31B23] scale-110 shadow-[0_0_10px_rgba(227,27,35,0.5)]' : 'border-white/10 bg-transparent'}`}
                            />
                        ))}
                    </div>

                    {/* Teclado Numérico */}
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num.toString())}
                                className="aspect-square bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-xl font-black hover:bg-white/10 active:scale-90 transition-all"
                            >
                                {num}
                            </button>
                        ))}
                        <button onClick={handleDelete} className="aspect-square flex items-center justify-center text-white/20 hover:text-white"><Delete size={24}/></button>
                        <button onClick={() => handleNumberClick('0')} className="aspect-square bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-xl font-black hover:bg-white/10 active:scale-90 transition-all">0</button>
                        <button 
                            onClick={handleSubmit}
                            disabled={pin.length < 4}
                            className={`aspect-square rounded-2xl flex items-center justify-center transition-all
                                ${pin.length >= 4 ? 'bg-[#E31B23] text-white shadow-lg shadow-[#E31B23]/30 active:scale-90' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}
                        >
                            <ChevronRight size={32}/>
                        </button>
                    </div>

                    {error && <p className="text-center text-red-500 text-[10px] font-black uppercase tracking-widest animate-bounce">{error}</p>}
                </div>
            )}
        </div>
    )
}
