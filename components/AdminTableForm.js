'use client'
import { useState } from 'react'
import { X, Save, Coffee } from 'lucide-react'

export default function AdminTableForm({ tableToEdit, zoneId, onClose, onRefresh }) {
    const [label, setLabel] = useState(tableToEdit?.label || '')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        
        const tableData = { 
            label, 
            zone_id: zoneId || tableToEdit?.zone_id,
            status: tableToEdit?.status || 'libre'
        }
        
        try {
            console.log('Enviando datos de mesa:', tableData);
            const url = tableToEdit ? `/api/restaurant-tables/${tableToEdit.id}` : '/api/restaurant-tables';
            const res = await fetch(url, {
                method: tableToEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tableData)
            });

            if (res.ok) {
                console.log('Mesa guardada con éxito.');
                if (typeof onRefresh === 'function') {
                    await onRefresh();
                } else {
                    console.warn('onRefresh no es una función:', onRefresh);
                }
                
                if (typeof onClose === 'function') {
                    onClose();
                } else {
                    console.warn('onClose no es una función:', onClose);
                }
            } else {
                const err = await res.json();
                alert('Error al guardar mesa (R): ' + (err.error || JSON.stringify(err) || 'Unknown error'));
            }
        } catch(e) {
            console.error('Error en handleSubmit:', e);
            alert('Error al guardar mesa (C): ' + e.message + ' | Stack: ' + e.stack?.substring(0, 50));
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-black text-xl italic tracking-tighter uppercase shrink-0 flex items-center gap-2">
                        <Coffee size={20} className="text-[#E31B23]"/>
                        {tableToEdit ? 'Editar Mesa' : 'Nueva Mesa'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Identificador de la Mesa</label>
                        <input 
                            autoFocus
                            type="text" 
                            required
                            placeholder="Ej: Mesa 1, Mesa 2, Vip A..." 
                            className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#E31B23] transition-all font-bold"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Nota técnica</p>
                        <p className="text-[11px] text-white/50 leading-relaxed font-medium">Una vez creada, podrás posicionar la mesa libremente en el plano 2D usando el <b>Modo Diseño</b>.</p>
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full bg-[#E31B23] py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#E31B23]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? 'GUARDANDO...' : <><Save size={18}/> Guardar Mesa</>}
                    </button>
                </form>
            </div>
        </div>
    )
}
