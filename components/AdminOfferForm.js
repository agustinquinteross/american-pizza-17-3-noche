'use client'
import { useState } from 'react'
import { X, Save, Zap, Percent, Copy, Loader2, Tag } from 'lucide-react'

export default function AdminOfferForm({ onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)
  
  // Estados para la lógica dinámica
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [offerType, setOfferType] = useState('nxm') // nxm, percent, second_unit
  
  // Variables dinámicas
  const [valN, setValN] = useState(2) // Llevás
  const [valM, setValM] = useState(1) // Pagás
  const [valPct, setValPct] = useState(50) // Porcentaje

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // ✅ FIX: discount_value debe ser el VALOR LÓGICO PURO, no un texto decorativo.
    // Toda la lógica de cálculo (parseFloat, split('x'), etc.) depende de esto.
    // - nxm         → "3x2", "2x1"  (se parsea con split('x'))
    // - percent     → "50"           (se parsea con parseFloat)
    // - second_unit → "70"           (se parsea con parseFloat)
    // La etiqueta visual se genera en getOfferBadge() de cada componente.
    let finalValue = ''
    if (offerType === 'nxm') {
        finalValue = `${valN}x${valM}`   // Ej: "3x2", "2x1"
    } else if (offerType === 'percent') {
        finalValue = `${valPct}`          // Ej: "50"  ← NO "50% OFF"
    } else if (offerType === 'second_unit') {
        finalValue = `${valPct}`          // Ej: "70"  ← NO "70% 2da"
    }

    const offerData = {
        title: title,
        description: description,
        type: offerType,
        discount_value: finalValue,
        is_active: true 
    };

    try {
        // Assuming this form is for creating new offers, so always POST.
        // If it were for editing, `offerToEdit` would be passed as a prop.
        const url = '/api/special-offers';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(offerData)
        });

        if (res.ok) {
            onSaved();
        } else {
            const err = await res.json();
            alert('Error al guardar oferta: ' + (err.error || 'Unknown Error'));
        }
    } catch(e) {
        console.error(e);
        alert('Error contactando al servidor');
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1A1A1A] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1A1A1A] shrink-0">
          <h2 className="font-black text-white text-lg flex items-center gap-2 italic uppercase tracking-tighter">
            <Zap className="text-[#E31B23]" size={18}/> CREADOR DE OFERTAS
          </h2>
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="offerForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* SELECTOR DINÁMICO DE TIPO */}
            <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setOfferType('nxm')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${offerType === 'nxm' ? 'bg-[#E31B23] border-[#E31B23] text-white' : 'bg-black border-white/20 text-white/40 hover:border-white/40'}`}>
                    <Copy size={20}/> <span className="text-[10px] font-bold text-center leading-tight">Llevá N<br/>Pagá M</span>
                </button>
                <button type="button" onClick={() => setOfferType('percent')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${offerType === 'percent' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-white/20 text-white/40 hover:border-white/40'}`}>
                    <Percent size={20}/> <span className="text-[10px] font-bold text-center leading-tight">Descuento<br/>Directo</span>
                </button>
                <button type="button" onClick={() => setOfferType('second_unit')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${offerType === 'second_unit' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black border-white/20 text-white/40 hover:border-white/40'}`}>
                    <Tag size={20}/> <span className="text-[10px] font-bold text-center leading-tight">Dto. en<br/>2da Unidad</span>
                </button>
            </div>

            {/* CONFIGURADOR DINÁMICO */}
            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-4">
                <h3 className="text-xs font-black text-white/40 uppercase flex items-center gap-2 mb-2">
                   ⚙️ Regla de la Promoción
                </h3>
                
                {offerType === 'nxm' && (
                    <div className="flex items-center gap-4 justify-center">
                        <div className="text-center">
                            <label className="block text-[10px] font-bold text-white/50 mb-1">El cliente LLEVA</label>
                            <input type="number" min="2" max="10" value={valN} onChange={e => setValN(e.target.value)} className="w-16 bg-black border border-white/20 rounded-lg p-2 text-white text-center font-black focus:border-[#E31B23] outline-none" />
                        </div>
                        <span className="text-2xl font-black text-white/20">X</span>
                        <div className="text-center">
                            <label className="block text-[10px] font-bold text-white/50 mb-1">El cliente PAGA</label>
                            <input type="number" min="1" max="9" value={valM} onChange={e => setValM(e.target.value)} className="w-16 bg-black border border-white/20 rounded-lg p-2 text-white text-center font-black focus:border-[#E31B23] outline-none" />
                        </div>
                    </div>
                )}

                {(offerType === 'percent' || offerType === 'second_unit') && (
                    <div>
                        <label className="block text-[10px] font-bold text-white/50 mb-1">Porcentaje a descontar (%)</label>
                        <div className="relative w-1/2 mx-auto">
                            <Percent size={16} className="absolute left-3 top-2.5 text-white/40" />
                            <input type="number" min="1" max="100" value={valPct} onChange={e => setValPct(e.target.value)} className="w-full pl-9 bg-black border border-white/20 rounded-lg p-2 text-white font-black focus:border-blue-500 outline-none" />
                        </div>
                        {offerType === 'second_unit' && <p className="text-[10px] text-white/40 text-center mt-2 italic font-bold">Se aplicará el {valPct}% de descuento a la segunda unidad de cada par.</p>}
                    </div>
                )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-white/40 mb-1 uppercase tracking-widest">Título de la Promo</label>
                <input required type="text" className="w-full bg-black border border-white/20 rounded-xl p-3 text-white focus:border-[#E31B23] outline-none text-sm font-bold" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Especial Día del Amigo" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/40 mb-1 uppercase tracking-widest">Descripción</label>
                <input required type="text" className="w-full bg-black border border-white/20 rounded-xl p-3 text-white focus:border-[#E31B23] outline-none text-sm" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Llevate 3 burgers pagando solo 2." />
              </div>
            </div>
            
            {/* VISTA PREVIA DE LA ETIQUETA */}
            <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Etiqueta Generada:</span>
                <span className="bg-[#E31B23] text-white font-black text-[10px] uppercase px-3 py-1.5 rounded shadow-lg tracking-widest">
                    {offerType === 'nxm' ? `${valN}x${valM}` : offerType === 'percent' ? `${valPct}% OFF` : `${valPct}% 2da`}
                </span>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-white/10 bg-[#1A1A1A] shrink-0">
            <button form="offerForm" type="submit" disabled={loading} className="w-full bg-[#E31B23] hover:bg-[#C1121F] text-white py-4 rounded-xl font-black flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em]">
                {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> GUARDAR PROMOCIÓN</>}
            </button>
        </div>
      </div>
    </div>
  )
}