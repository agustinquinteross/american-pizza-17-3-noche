'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Save, Upload, Loader2, Layers, Image as ImageIcon, Zap, Gift, Plus } from 'lucide-react'

export default function AdminProductForm({ productToEdit, onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Estados del Formulario
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('') 
  const [stock, setStock] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [offerId, setOfferId] = useState('') 
  const [imageUrl, setImageUrl] = useState('')
  const [imageToDelete, setImageToDelete] = useState(null)
  const [promoTags, setPromoTags] = useState([]) 
  const [customTag, setCustomTag] = useState('') 
  const [isActive, setIsActive] = useState(true)
  
  // Estados de Datos
  const [categories, setCategories] = useState([])
  const [modifierGroups, setModifierGroups] = useState([])
  const [selectedModifiers, setSelectedModifiers] = useState([])
  const [availableOffers, setAvailableOffers] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      let cats = [];
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          cats = await res.json();
          setCategories(cats);
        } else {
          console.error('Error fetching categories:', res.statusText);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
      if (!productToEdit && cats.length > 0) setCategoryId(cats[0].id)
      try {
        const mgRes = await fetch('/api/modifier-groups');
        if (mgRes.ok) {
          const groups = await mgRes.json();
          setModifierGroups(groups);
        }

        const soRes = await fetch('/api/special-offers?active=true');
        if (soRes.ok) {
          const offers = await soRes.json();
          setAvailableOffers(offers);
        }
      } catch (err) {
        console.error('Error fetching supplementary data:', err);
      }

      if (productToEdit) {
        setName(productToEdit.name || ''); setDescription(productToEdit.description || ''); setPrice(productToEdit.price || '');
        setCostPrice(productToEdit.cost_price || ''); setCategoryId(productToEdit.category_id || '');
        setStock(productToEdit.stock !== undefined && productToEdit.stock !== null ? productToEdit.stock : '');
        setOfferId(productToEdit.offer_id || ''); setImageUrl(productToEdit.image_url || ''); setIsActive(productToEdit.is_active);
        
        if (productToEdit.promo_tag) {
            setPromoTags(productToEdit.promo_tag.split(',').map(tag => tag.trim()).filter(tag => tag !== ""))
        } else { setPromoTags([]) }

        try {
          const pmRes = await fetch(`/api/product-modifiers?product_id=${productToEdit.id}`);
          if (pmRes.ok) {
             const existingModifiers = await pmRes.json();
             setSelectedModifiers(existingModifiers.map(em => em.group_id));
          }
        } catch(err) {
           console.error('Error fetching product modifiers:', err);
        }
      }
    }
    fetchData()
  }, [productToEdit])

  const handleImageUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      const { url } = await res.json()
      setImageUrl(url)
    } catch (error) { 
      console.error(error)
      alert('Error imagen: ' + error.message) 
    } finally { 
      setUploading(false) 
    }
  }

  const handleSave = async () => {
    if (!name || !price) return alert('Falta nombre o precio.')
    setLoading(true)
    try {
      const tagsString = promoTags.length > 0 ? promoTags.join(', ') : null
      const productData = {
        name, description, price: parseFloat(price), cost_price: costPrice ? parseFloat(costPrice) : null,
        stock: stock !== '' ? parseInt(stock) : null,
        category_id: categoryId, offer_id: offerId || null, image_url: imageUrl, promo_tag: tagsString, is_active: isActive
      }

      let url = '/api/products';
      let method = 'POST';

      if (productToEdit) {
        url = `/api/products/${productToEdit.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productData,
          selectedGroups: selectedModifiers
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save product');
      }

      // Supabase storage deletion removed for Cloudinary migration
      setTimeout(() => onSaved(), 100)
    } catch (error) { alert('Error: ' + error.message); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#1A1A1A] z-10">
          <h2 className="text-xl font-bold text-white uppercase italic tracking-widest">{productToEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button type="button" onClick={onCancel} className="text-white/70 hover:text-white transition-colors"><X /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto no-scrollbar flex-1">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Foto</label>
                        <div className="relative overflow-hidden bg-black border border-white/20 rounded-xl aspect-square flex items-center justify-center group cursor-pointer hover:border-[#E31B23]/40 transition">
                            {imageUrl ? (
                                <Image 
                                    src={imageUrl} 
                                    fill 
                                    className="object-cover" 
                                    alt="Preview" 
                                />
                            ) : (
                                <div className="text-white/40 flex flex-col items-center">
                                    {uploading ? <Loader2 className="animate-spin mb-2"/> : <Upload size={32} className="mb-2"/>}
                                    <span className="text-xs font-bold uppercase">Subir Foto</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-white/10">
                        <label className="text-xs font-bold text-green-500 uppercase flex items-center gap-1 tracking-widest"><Zap size={14}/> Etiquetas</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {['NUEVO', 'VEGANO', 'SIN TACC', 'PICANTE'].map(tag => (
                                <button key={tag} type="button" onClick={() => setPromoTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])} className={`text-[9px] font-black px-2 py-1.5 rounded border transition-all ${promoTags.includes(tag) ? 'bg-green-600 text-white border-green-600' : 'bg-black text-white/40 border-white/20 hover:border-white/40'}`}>{tag}</button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Agregar etiqueta..." value={customTag} onChange={e => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setPromoTags(p => [...new Set([...p, customTag.toUpperCase()])]), setCustomTag(''))} className="w-full bg-black border border-white/20 rounded-lg p-2 text-[10px] text-white outline-none focus:border-green-600" />
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-white/10">
                        <label className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-1 tracking-widest"><Gift size={14}/> Vincular Promo</label>
                        <select value={offerId} onChange={e => setOfferId(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white outline-none focus:border-yellow-500 text-xs font-bold">
                            <option value="">Sin Promoción</option>
                            {availableOffers.map(off => <option key={off.id} value={off.id}>{off.title} ({off.discount_value})</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-white/50 uppercase tracking-widest">Nombre</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[#E31B23] font-bold" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-white/50 uppercase tracking-widest">Venta</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[#E31B23] font-black" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-white/50 uppercase tracking-widest">Costo</label><input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[#E31B23] font-black" placeholder="0.00" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-white/50 uppercase tracking-widest">Stock</label><input type="number" step="1" value={stock} onChange={e => setStock(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[#E31B23] font-black" placeholder="Ilimitado" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-white/50 uppercase tracking-widest">Categoría</label><select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[#E31B23] text-xs font-bold">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-white/50 uppercase tracking-widest">Descripción</label><textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[#E31B23] text-xs resize-none" /></div>
                    <div className="space-y-2 pt-2 border-t border-white/10"><label className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2 tracking-widest"><Layers size={14}/> Extras Permitidos</label><div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto no-scrollbar p-1">{modifierGroups.map(group => (<div key={group.id} onClick={() => setSelectedModifiers(p => p.includes(group.id) ? p.filter(id => id !== group.id) : [...p, group.id])} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition select-none ${selectedModifiers.includes(group.id) ? 'bg-blue-900/20 border-blue-600 text-white' : 'bg-black border-white/10 text-white/40 hover:border-white/30'}`}><div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${selectedModifiers.includes(group.id) ? 'bg-blue-600 border-blue-600' : 'border-white/30'}`}>{selectedModifiers.includes(group.id) && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}</div><span className="text-[11px] font-bold uppercase">{group.name}</span></div>))}</div></div>
                </div>
            </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-white/10 flex justify-end gap-3 bg-[#1A1A1A] z-10">
            <button type="button" onClick={onCancel} className="px-4 py-2 font-bold text-white/50 hover:text-white transition-colors text-xs uppercase">Cancelar</button>
            <button onClick={handleSave} disabled={loading || uploading} className="px-8 py-3 bg-[#E31B23] text-white rounded-xl font-black text-xs uppercase hover:bg-black transition shadow-lg flex items-center gap-2 disabled:opacity-50 tracking-widest">{loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}<span>Confirmar</span></button>
        </div>
      </div>
    </div>
  )
}