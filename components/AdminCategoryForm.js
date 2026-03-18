import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit, Save, Loader2 } from 'lucide-react';

export default function AdminCategoryForm({ onCancel, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado para la nueva categoría o la que estamos editando
  const [currentCategory, setCurrentCategory] = useState({ id: null, name: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Error fetching categories');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentCategory.name.trim()) return;

    setSaving(true);
    try {
      if (isEditing && currentCategory.id) {
        // Actualizar
        const res = await fetch(`/api/categories/${currentCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: currentCategory.name })
        });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        // Crear nueva
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: currentCategory.name })
        });
        if (!res.ok) throw new Error('Failed to create');
      }
      
      // Limpiar y recargar
      setCurrentCategory({ id: null, name: '' });
      setIsEditing(false);
      await fetchCategories();
      onSaved(); // Avisamos al padre que hubo cambios
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error al guardar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setCurrentCategory(category);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro? Los productos en esta categoría podrían quedar huérfanos.')) return;
    
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchCategories();
      onSaved();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar. Verifica que no haya productos usando esta categoría.');
    }
  };

  const resetForm = () => {
    setCurrentCategory({ id: null, name: '' });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1A1A1A]">
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
            Gestión de Categorías
          </h2>
          <button onClick={onCancel} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Formulario Crear/Editar */}
        <div className="p-4 border-b border-white/10 bg-black/20">
          <form onSubmit={handleSave} className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre de la categoría..."
              className="flex-1 bg-black border border-white/20 rounded-lg p-2.5 text-white outline-none focus:border-[#E31B23] transition-colors placeholder:text-white/30 text-sm"
              value={currentCategory.name}
              onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
              required
            />
            <button 
              type="submit" 
              disabled={saving || !currentCategory.name.trim()}
              className="bg-[#E31B23] hover:bg-[#C1121F] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin"/> : (isEditing ? <Save size={16}/> : <Plus size={16}/>)}
              {isEditing ? 'Guardar' : 'Crear'}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="px-3 py-2.5 bg-white/5 text-white/70 hover:text-white rounded-lg transition">
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        {/* Lista de Categorías */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#E31B23]" /></div>
          ) : (
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-center text-white/30 text-sm py-4">No hay categorías. Crea la primera.</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center bg-black/40 border border-white/10 p-3 rounded-xl hover:border-white/30 transition group">
                    <span className="font-bold text-white/90">{cat.name}</span>
                    <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(cat)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded transition">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-500 hover:bg-red-900/30 rounded transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}