'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Save, X, Loader2, Image as ImageIcon } from 'lucide-react'

export default function AdminBannerForm({ onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e) => {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
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
      alert('Error subiendo imagen: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // ✅ FIX: handleSave ya no recibe "e" porque el form NO tiene onSubmit.
  // El único punto de entrada es el botón type="submit" dentro del form.
  // Esto elimina el doble disparo que ocurría cuando el botón del footer
  // llamaba onClick={handleSave} mientras el form ya tenía onSubmit={handleSave}.
  const handleSave = async (e) => {
    e.preventDefault()
    if (!imageUrl) return alert('¡Debes subir una imagen!')

    setLoading(true)
    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          image_url: imageUrl,
          is_active: true
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save banner');
      }
      
      onSaved()

    } catch (error) {
      console.error(error)
      alert('Error guardando banner: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#1A1A1A] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col">

        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-2 uppercase">
            <ImageIcon size={20} className="text-[#E31B23]" /> Nuevo Banner
          </h2>
          <button type="button" onClick={onCancel} className="text-white/70 hover:text-white transition-colors"><X /></button>
        </div>

        {/* ✅ FIX: Solo el form tiene onSubmit. El botón Publicar es type="submit".
            El botón Cancelar es type="button" para no interferir. */}
        <form onSubmit={handleSave} className="p-6 space-y-6">

          {/* Subida de Imagen */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/50 uppercase">Imagen del Banner</label>
            <div className="relative overflow-hidden bg-black border border-white/20 rounded-xl aspect-video flex items-center justify-center group cursor-pointer hover:border-[#E31B23]/40 transition">
              {imageUrl ? (
                <Image 
                    src={imageUrl} 
                    fill 
                    className="object-cover" 
                    alt="Preview banner" 
                />
              ) : (
                <div className="text-white/40 flex flex-col items-center">
                  {uploading ? <Loader2 className="animate-spin mb-2" /> : <ImageIcon size={32} className="mb-2" />}
                  <span className="text-xs font-bold uppercase">{uploading ? 'Subiendo...' : 'Click para subir foto'}</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </div>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-tight">Recomendado: Formato horizontal (ej: 1200x400)</p>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/50 uppercase">Título (Opcional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white outline-none focus:ring-2 focus:ring-[#E31B23] transition-all placeholder-white/20 font-bold"
              placeholder="Ej: 2x1 Jueves..."
            />
          </div>

          {/* Footer dentro del form para que type="submit" funcione correctamente */}
          <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl font-bold text-white/40 hover:text-white transition-all text-xs uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploading || !imageUrl}
              className="px-8 py-2.5 rounded-xl font-black bg-[#E31B23] text-white hover:bg-white hover:text-[#E31B23] transition-all shadow-lg flex items-center gap-2 text-xs disabled:opacity-30 uppercase tracking-[0.2em]"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Publicar</>}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}