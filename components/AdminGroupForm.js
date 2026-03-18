'use client'
import { useState, useEffect } from 'react'
import { Save, X, Loader2, Layers } from 'lucide-react'

export default function AdminGroupForm({ groupToEdit, onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)
  
  // Estados del Formulario
  const [name, setName] = useState('')
  const [type, setType] = useState('single') // 'single' (Radio) o 'multiple' (Checkbox)
  const [isRequired, setIsRequired] = useState(true) // ¿Obligatorio?
  const [maxSelection, setMaxSelection] = useState(5) // Solo para múltiple

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name)
      // Deducir lógica basada en min/max
      if (groupToEdit.max_selection === 1 && groupToEdit.min_selection === 1) {
        setType('single')
        setIsRequired(true)
      } else {
        setType('multiple')
        setIsRequired(groupToEdit.min_selection > 0)
        setMaxSelection(groupToEdit.max_selection || 5)
      }
    }
  }, [groupToEdit])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Calcular reglas para la DB
    let minSel = 0
    let maxSel = 0

    if (type === 'single') {
      // Selección Única siempre es 1 y 1 (Radio Button)
      minSel = 1
      maxSel = 1
    } else {
      // Selección Múltiple
      minSel = isRequired ? 1 : 0
      maxSel = parseInt(maxSelection) || 5
    }

    const groupData = {
      name,
      min_selection: minSel,
      max_selection: maxSel
    }

    try {
        const url = groupToEdit ? `/api/modifier-groups/${groupToEdit.id}` : '/api/modifier-groups';
        const res = await fetch(url, {
            method: groupToEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groupData)
        });

        if (res.ok) {
            onSaved();
        } else {
            const err = await res.json();
            alert('Error al guardar grupo: ' + (err.error || 'Unknown Error'));
        }
    } catch(e) { 
        console.error(e);
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1A1A1A] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers size={20} className="text-[#E31B23]"/> 
            {groupToEdit ? 'Editar Grupo' : 'Nuevo Grupo de Extras'}
          </h2>
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors"><X /></button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {/* Nombre */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/50 uppercase">Nombre del Grupo</label>
            <input 
                required 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-[#E31B23] outline-none placeholder-gray-600"
                placeholder="Ej: Salsas, Punto de Carne, Bebidas..." 
            />
          </div>

          {/* Tipo de Selección */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/50 uppercase">Tipo de Selección</label>
            <div className="grid grid-cols-2 gap-3">
                <div onClick={() => setType('single')} className={`cursor-pointer border rounded-lg p-3 text-center transition ${type === 'single' ? 'bg-[#E31B23]/20 border-[#E31B23] text-white' : 'bg-black border-white/20 text-white/40'}`}>
                    <div className="font-bold text-sm">Única (Radio)</div>
                    <div className="text-[10px]">El usuario elige solo 1 opción.</div>
                </div>
                <div onClick={() => setType('multiple')} className={`cursor-pointer border rounded-lg p-3 text-center transition ${type === 'multiple' ? 'bg-[#E31B23]/20 border-[#E31B23] text-white' : 'bg-black border-white/20 text-white/40'}`}>
                    <div className="font-bold text-sm">Múltiple (Checkbox)</div>
                    <div className="text-[10px]">El usuario puede elegir varias.</div>
                </div>
            </div>
          </div>

          {/* Configuración Adicional */}
          <div className="bg-black/40 p-4 rounded-lg border border-white/10 space-y-4">
              
              {/* Obligatorio Toggle */}
              <div className="flex justify-between items-center">
                  <div>
                      <div className="text-sm font-bold text-white/80">¿Es Obligatorio?</div>
                      <div className="text-xs text-white/40">¿Debe elegir al menos 1 opción?</div>
                  </div>
                  <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="w-5 h-5 accent-[#E31B23] cursor-pointer"/>
              </div>

              {/* Máximo (Solo múltiple) */}
              {type === 'multiple' && (
                  <div className="pt-3 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-bold text-white/80">Máximo permitido</div>
                        <input 
                            type="number" 
                            min="1" 
                            value={maxSelection} 
                            onChange={e => setMaxSelection(e.target.value)}
                            className="w-16 bg-black border border-white/20 rounded p-1 text-center text-white outline-none focus:border-[#E31B23]"
                        />
                      </div>
                  </div>
              )}
          </div>

        </form>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg font-bold text-white/50 hover:text-white hover:bg-white/5 transition text-sm">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="px-6 py-2 rounded-lg font-bold bg-[#E31B23] text-white hover:bg-[#C1121F] transition shadow-lg flex items-center gap-2 text-sm">
            {loading ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Guardar Grupo</>}
          </button>
        </div>

      </div>
    </div>
  )
}