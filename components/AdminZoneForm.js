'use client'
import { useState } from 'react'
import { X, Save, MapPin } from 'lucide-react'

export default function AdminZoneForm({ zoneToEdit, onClose, onRefresh }) {
    const [name, setName] = useState(zoneToEdit?.name || '')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        
        const zoneData = { name, is_active: true }
        
        try {
            const url = zoneToEdit ? `/api/restaurant-zones/${zoneToEdit.id}` : '/api/restaurant-zones';
            const res = await fetch(url, {
                method: zoneToEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(zoneData)
            });

            if (res.ok) {
                onRefresh()
                onClose()
            } else {
                const err = await res.json();
                alert('Error al guardar zona: ' + (err.error || 'Unknown error'));
            }
        } catch(e) {
            console.error(e);
            alert('Error en el servidor');
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-black text-xl italic tracking-tighter uppercase shrink-0 flex items-center gap-2">
                        <MapPin size={20} className="text-[#E31B23]"/>
                        {zoneToEdit ? 'Editar Zona' : 'Nueva Zona'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nombre de la Zona</label>
                        <input 
                            autoFocus
                            type="text" 
                            required
                            placeholder="Ej: Salón Principal, Terraza, VIP..." 
                            className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#E31B23] transition-all font-bold"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full bg-[#E31B23] py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#E31B23]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? 'GUARDANDO...' : <><Save size={18}/> Guardar Zona</>}
                    </button>
                </form>
            </div>
        </div>
    )
}
