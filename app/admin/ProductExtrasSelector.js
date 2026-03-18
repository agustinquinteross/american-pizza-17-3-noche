import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Este componente va DENTRO de tu formulario de Admin
export default function ProductExtrasSelector({ productId }) {
  const [allGroups, setAllGroups] = useState([]);
  const [activeGroupIds, setActiveGroupIds] = useState([]);

  async function loadData() {
    // 1. Cargar TODOS los grupos disponibles (Punto carne, Salsas, etc)
    try {
        const res = await fetch('/api/modifier-groups');
        if (res.ok) {
            const groups = await res.json();
            setAllGroups(groups || []);
        }
    } catch(e) { console.error(e) }

    // 2. Si estamos editando un producto, ver cuáles ya tiene asignados
    if (productId) {
      const { data: relations } = await supabase
        .from('product_modifiers')
        .select('group_id')
        .eq('product_id', productId);
      
      if (relations) {
        setActiveGroupIds(relations.map(r => r.group_id));
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [productId]);

  const toggleGroup = async (groupId) => {
    const isSelected = activeGroupIds.includes(groupId);

    if (isSelected) {
      // BORRAR relación
      await supabase
        .from('product_modifiers')
        .delete()
        .match({ product_id: productId, group_id: groupId });
        
      setActiveGroupIds(prev => prev.filter(id => id !== groupId));
    } else {
      // CREAR relación
      await supabase
        .from('product_modifiers')
        .insert({ product_id: productId, group_id: groupId });
        
      setActiveGroupIds(prev => [...prev, groupId]);
    }
  };

  if (!productId) return <p className="text-xs font-black text-white/20 uppercase tracking-widest text-center py-4 bg-black/40 rounded-xl border border-dashed border-white/10">Guarda el producto primero para asignar extras.</p>;

  return (
    <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/5 mt-6 shadow-2xl">
      <h3 className="font-black text-[#E31B23] text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-[#E31B23] animate-pulse"/> Extras & Adicionales
      </h3>
      <div className="grid grid-cols-1 gap-3">
                {allGroups.map(group => {
          const isActive = activeGroupIds.includes(group.id);
          return (
            <div 
              key={group.id} 
              onClick={() => toggleGroup(group.id)}
              className={`
                flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-all
                ${isActive ? 'bg-[#E31B23]/10 border-[#E31B23]' : 'bg-black border-white/10 hover:border-[#E31B23]/40'}
              `}
            >
              <div>
                <span className="font-bold text-white uppercase tracking-tight text-sm">{group.name}</span>
                <span className="text-[10px] font-black text-white/30 ml-3 uppercase tracking-widest">
                   ({group.min_selection === 1 && group.max_selection === 1 ? 'Selección Única' : 'Múltiple'})
                </span>
              </div>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isActive ? 'bg-[#E31B23] border-[#E31B23] shadow-[0_0_15px_rgba(227,27,35,0.4)]' : 'border-white/20 bg-black'}`}>
                {isActive && <span className="text-white text-xs font-black">✓</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}