import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { X, Check, PenLine } from 'lucide-react';

// ✅ FIX: Helper para formatear precios sin decimales sucios.
// El problema: sumar floats en JS da resultados como 1250.0000000002
// porque los números de punto flotante no son exactos en binario.
// Ejemplo: 1200 + 50.10 = 1250.1000000000001
//
// Solución: redondeamos a 2 decimales y luego usamos toLocaleString
// para mostrar el separador de miles con formato argentino.
function formatPrice(amount) {
  // Math.round(n * 100) / 100 es más preciso que toFixed() para aritmética
  const rounded = Math.round(amount * 100) / 100
  // Si el resultado es entero, no mostramos decimales (ej: $1.250 en vez de $1.250,00)
  return rounded % 1 === 0
    ? rounded.toLocaleString('es-AR')
    : rounded.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart }) {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  // 1. Reiniciar estado al abrir
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedOptions({});
      setQty(1);
      setNote('');
    }
  }, [isOpen, product]);

  const groups = product?.modifiers || [];

  // 2. Calcular precio unitario
  const unitPrice = useMemo(() => {
    if (!product) return 0;

    // Calcular precio base con oferta
    const rawPrice = Number(product.price);
    const offer = product.special_offers;
    let basePrice = rawPrice;

    if (offer?.is_active) {
      if (offer.type === 'percent' || offer.type === 'percentage') {
        const pct = parseFloat(offer.discount_value) || 0;
        basePrice = Math.round(rawPrice * (1 - pct / 100));
      } else if (offer.type === 'fixed') {
        basePrice = Math.max(0, rawPrice - Number(offer.discount_value));
      } else if (offer.type === 'fixed_price') {
        basePrice = Number(offer.discount_value);
      }
      // nxm, 2x1, second_unit: el descuento es multi-unidad, el precio base no cambia
    }

    let extraCost = 0;
    groups.forEach(group => {
      const options = group.modifier_options || [];
      options.forEach(opt => {
        if (selectedOptions[opt.id]) {
          extraCost += Number(opt.price);
        }
      });
    });
    return Math.round((basePrice + extraCost) * 100) / 100;
  }, [product, selectedOptions, groups]);

  if (!isOpen || !product) return null;

  // 3. Handlers
  const handleToggleOption = (group, option) => {
    if (group.min_selection === 1 && group.max_selection === 1) {
      // Radio (selección única)
      const newSelection = { ...selectedOptions };
      group.modifier_options.forEach(o => delete newSelection[o.id]);
      newSelection[option.id] = true;
      setSelectedOptions(newSelection);
    } else {
      // Checkbox (selección múltiple)
      setSelectedOptions(prev => {
        const isSelected = !!prev[option.id];
        const currentCount = group.modifier_options.filter(o => prev[o.id]).length;

        if (isSelected) {
          const newState = { ...prev };
          delete newState[option.id];
          return newState;
        } else {
          if (group.max_selection && currentCount >= group.max_selection) {
            return prev; // Límite alcanzado
          }
          return { ...prev, [option.id]: true };
        }
      });
    }
  };

  const handleAddToOrder = () => {
    // Validar obligatorios
    const missingRequired = groups.filter(g => {
      if (g.min_selection > 0) {
        const count = g.modifier_options.filter(o => selectedOptions[o.id]).length;
        return count < g.min_selection;
      }
      return false;
    });

    if (missingRequired.length > 0) {
      alert(`⚠️ Por favor selecciona opciones en: ${missingRequired[0].name}`);
      return;
    }

    // Preparar lista de opciones elegidas
    const optionsList = [];
    groups.forEach(g => {
      g.modifier_options.forEach(o => {
        if (selectedOptions[o.id]) {
          optionsList.push({ name: o.name, price: o.price });
        }
      });
    });

    onAddToCart({
      ...product,
      selectedOptions: optionsList,
      price: unitPrice, // Ya viene redondeado del useMemo
      quantity: qty,
      note: note
    });
    onClose();
  };

  // ✅ FIX: Calculamos el total para mostrar en el botón usando el helper,
  // evitando que aparezca "$1250.0000000002" cuando hay extras con decimales.
  // Antes: ${unitPrice * qty}  →  podía dar "1250.1000000000001"
  // Ahora: formatPrice(unitPrice * qty)  →  siempre da "1.250,10" o "1.250"
  const totalDisplay = formatPrice(unitPrice * qty)

  // 4. Renderizado
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">

      <div className="bg-[#1A1A1A] w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-white/10 text-white">

        {/* Imagen Header */}
        <div className="relative h-40 sm:h-56 bg-black shrink-0 overflow-hidden">
          {product.image_url ? (
            <Image 
                src={product.image_url} 
                alt={product.name} 
                fill 
                priority
                className="object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20">🍔</div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full transition border border-white/20"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-[#1A1A1A] to-transparent"></div>
        </div>

        {/* Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 bg-[#1A1A1A] custom-scrollbar">

          {/* Info Producto */}
          <div>
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{product.name}</h2>
              {product.stock !== null && product.stock !== undefined && (
                <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest ${product.stock <= 0 ? 'bg-[#E31B23] text-white border-[#E31B23]' : product.stock <= 5 ? 'bg-orange-500 text-white border-orange-500 animate-pulse' : 'bg-green-600/20 text-green-500 border-green-600/30'}`}>
                  {product.stock <= 0 ? 'Agotado' : product.stock <= 5 ? `¡Casi Agotado! (${product.stock})` : `En Stock: ${product.stock}`}
                </span>
              )}
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{product.description}</p>
          </div>

          <hr className="border-white/10" />

          {/* Extras */}
          {groups.length > 0 ? (
            groups.map(group => (
              <div key={group.id} className="space-y-3">
                <div className="flex justify-between items-end">
                  <h3 className="font-bold text-white/50 uppercase text-[10px] tracking-widest">{group.name}</h3>
                  <div className="flex gap-2">
                    {group.min_selection > 0 && (
                      <span className="text-[10px] bg-[#E31B23]/20 text-[#E31B23] px-2 py-0.5 rounded border border-[#E31B23]/30 font-bold uppercase tracking-widest">Obligatorio</span>
                    )}
                    {group.max_selection > 1 && (
                      <span className="text-[10px] text-white/40 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">Max: {group.max_selection}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {group.modifier_options?.map(option => {
                    const isSelected = !!selectedOptions[option.id];
                    return (
                      <div
                        key={option.id}
                        onClick={() => option.is_available && handleToggleOption(group, option)}
                        className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] 
                          ${!option.is_available ? 'opacity-30 grayscale cursor-not-allowed bg-white/5' : ''}
                          ${isSelected ? 'border-[#E31B23] bg-[#E31B23]/10 shadow-[0_0_15px_rgba(227,27,35,0.15)]' : 'border-white/10 bg-black/40 hover:border-white/20'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-[#E31B23] bg-[#E31B23] text-white' : 'border-white/20 bg-transparent'}`}>
                            {isSelected && <Check size={12} strokeWidth={4} />}
                          </div>
                          <span className={`font-bold text-sm uppercase tracking-tight ${isSelected ? 'text-white' : 'text-white/60'}`}>{option.name}</span>
                        </div>
                        {/* ✅ FIX: También formateamos el precio de cada extra para consistencia */}
                        <span className={`text-sm font-black ${isSelected ? 'text-[#E31B23]' : 'text-white/30'}`}>
                          {Number(option.price) > 0 ? `+$${formatPrice(Number(option.price))}` : 'Gratis'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-white/40 text-xs italic">Este producto no tiene ingredientes extra.</p>
          )}

          {/* SECCIÓN NOTA DE PEDIDO */}
          <div className="bg-black/40 p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <PenLine size={14} className="text-[#E31B23]" />
              <h3 className="font-black text-white/40 text-[10px] uppercase tracking-[0.2em]">¿Alguna aclaración?</h3>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm focus:border-[#E31B23] outline-none placeholder-white/20 resize-none transition-all focus:ring-4 focus:ring-[#E31B23]/10"
              rows="2"
              placeholder="Ej: Sin sal, la carne bien cocida..."
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-[#1A1A1A] border-t border-white/10 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-black border border-white/10 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 flex items-center justify-center font-bold text-lg text-white/40 hover:text-white transition active:scale-90"
              >-</button>
              <span className="w-8 text-center font-bold text-white text-lg">{qty}</span>
              <button
                type="button"
                onClick={() => {
                  if (product.stock === undefined || product.stock === null || qty < product.stock) {
                    setQty(qty + 1)
                  }
                }}
                className={`w-10 h-10 flex items-center justify-center font-bold text-lg transition active:scale-90 ${product.stock !== undefined && product.stock !== null && qty >= product.stock ? 'text-white/10 cursor-not-allowed' : 'text-white/40 hover:text-white'}`}
              >+</button>
            </div>

            <button
              type="button"
              onClick={handleAddToOrder}
              disabled={product.stock === 0}
              className="flex-1 bg-[#E31B23] hover:bg-[#C1121F] text-white font-black py-3.5 sm:py-4 rounded-xl text-base sm:text-lg flex justify-between px-5 sm:px-6 shadow-2xl shadow-[#E31B23]/20 transition-all active:scale-95 border-t border-white/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase tracking-widest"
            >
              <span>{product.stock === 0 ? 'AGOTADO' : 'AGREGAR'}</span>
              <span>${totalDisplay}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}