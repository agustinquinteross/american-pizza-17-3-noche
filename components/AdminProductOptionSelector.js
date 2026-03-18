'use client'
import { useState } from 'react'
import { X, Plus, Check, MessageSquare } from 'lucide-react'

export default function AdminProductOptionSelector({ product, modifierGroups, onConfirm, onClose }) {
    const [note, setNote] = useState('')
    const [selectedOptions, setSelectedOptions] = useState([])
    
    if (!product) return null

    const toggleOption = (opt) => {
        setSelectedOptions(prev => {
            const exists = prev.find(o => o.id === opt.id)
            if (exists) {
                return prev.filter(o => o.id !== opt.id)
            } else {
                return [...prev, opt]
            }
        })
    }

    const totalExtras = selectedOptions.reduce((acc, opt) => acc + (Number(opt.price) || 0), 0)
    const optionsText = selectedOptions.map(o => o.name).join(', ')
    const fmt = (n) => `$${Number(n).toLocaleString('es-AR')}`

    // Calcula precio base del producto considerando ofertas
    const calcBase = () => {
        const p = Number(product.price);
        if (!product.special_offers?.is_active) return p;
        const offer = product.special_offers;
        const val = offer.discount_value;
        // ✅ Tolerante al formato viejo ('50% OFF') y nuevo ('50')
        const pct = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
        if (offer.type === 'percent' || offer.type === 'percentage') return Math.round(p * (1 - pct / 100));
        if (offer.type === 'fixed') return Math.max(0, p - Number(val));
        if (offer.type === 'fixed_price') return Number(val);
        // nxm, 2x1, second_unit: precio unitario sin cambios
        return p;
    };
    const basePrice = calcBase();
    const totalProduct = Math.round(basePrice + totalExtras);


    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#111111] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1A1A1A]">
                    <div>
                        <h3 className="font-black text-xl italic tracking-tighter uppercase">{product.name}</h3>
                        <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Personaliza el pedido</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24}/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-8 dash-scroll">
                    {/* Sección de Notas Especiales */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-white/40 uppercase tracking-widest font-black text-[10px]">
                            <MessageSquare size={14}/> Instrucciones Especiales
                        </div>
                        <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ej: Sin cebolla, carne bien cocida, etc..."
                            className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-[#E31B23] transition-colors resize-none h-24 text-white"
                        />
                    </div>

                    {modifierGroups.length > 0 && modifierGroups.map(group => (
                        <div key={group.id} className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-white/60">{group.name}</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {group.modifier_options?.map(opt => {
                                    const isSelected = selectedOptions.find(o => o.id === opt.id)
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => toggleOption(opt)}
                                            className={`border p-4 rounded-2xl flex justify-between items-center group transition-all ${isSelected ? 'bg-[#E31B23]/20 border-[#E31B23] shadow-[0_0_15px_rgba(227,27,35,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#E31B23] border-[#E31B23]' : 'border-white/10'}`}>
                                                    {isSelected && <Check size={14} className="text-white"/>}
                                                </div>
                                                <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-white/60'}`}>{opt.name}</span>
                                            </div>
                                             {Number(opt.price) > 0 && <span className="font-black text-xs text-[#E31B23]">+{fmt(Number(opt.price))}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-[#1A1A1A] border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total del Producto</span>
                        <span className="text-xl font-black text-white italic">
                            {fmt(totalProduct)}
                        </span>
                    </div>
                    <button 
                        onClick={() => onConfirm(product, optionsText, totalExtras, note)}
                        className="w-full bg-[#E31B23] py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#E31B23]/20 hover:scale-[1.02] active:scale-98 transition-all text-white"
                    >
                        Agregar al Pedido
                    </button>
                </div>
            </div>
        </div>
    )
}
