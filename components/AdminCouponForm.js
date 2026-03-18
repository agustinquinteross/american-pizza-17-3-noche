'use client'
import { useState } from 'react'
import { Save, X, Loader2, Ticket, Calendar, Hash } from 'lucide-react'

// ✅ FIX TIMEZONE: Convierte una fecha UTC de la DB al formato que necesita
// el input datetime-local (YYYY-MM-DDTHH:MM) pero en hora LOCAL del usuario,
// no en UTC. El bug original usaba .toISOString() que siempre devuelve UTC,
// haciendo que la fecha mostrada estuviera 3 horas adelantada (para GMT-3).
function utcToLocalInputValue(utcString) {
  if (!utcString) return ''
  const date = new Date(utcString)
  // Ajustamos al offset local para que el input muestre la hora correcta
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(date.getTime() - offsetMs)
  return localDate.toISOString().slice(0, 16)
}

// ✅ FIX TIMEZONE: Convierte el valor del input datetime-local (que es hora local)
// a un string ISO UTC para enviar a Supabase.
// El bug original mandaba el string tal cual (ej: "2024-12-31T23:00"),
// que Supabase interpreta como UTC, haciendo que el cupón venza 3 horas antes.
function localInputValueToUTC(localString) {
  if (!localString) return null
  // new Date() interpreta el string sin timezone como hora LOCAL del browser
  return new Date(localString).toISOString()
}

export default function AdminCouponForm({ couponToEdit, onCancel, onSaved }) {
  const [loading, setLoading] = useState(false)

  // Estados Básicos
  const [code, setCode] = useState(couponToEdit?.code || '')
  const [value, setValue] = useState(couponToEdit?.value || 10)
  const [discountType, setDiscountType] = useState(couponToEdit?.discount_type || 'percent')

  // ✅ FIX: Usamos utcToLocalInputValue para que al EDITAR un cupón,
  // el input muestre la hora local correcta y no la hora UTC.
  const [expiresAt, setExpiresAt] = useState(
    utcToLocalInputValue(couponToEdit?.expires_at)
  )
  const [usageLimit, setUsageLimit] = useState(couponToEdit?.usage_limit || '')

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const couponData = {
        code: code.toUpperCase().trim(),
        value: parseFloat(value),
        discount_type: discountType,
        // ✅ FIX: Convertimos la hora local del input a UTC antes de guardar.
        // Antes: expires_at: expiresAt || null  → guardaba "2024-12-31T20:00" como UTC
        // Ahora: convierte "2024-12-31T20:00" (hora local GMT-3) → "2024-12-31T23:00:00.000Z" (UTC correcto)
        expires_at: localInputValueToUTC(expiresAt),
        usage_limit: usageLimit && parseInt(usageLimit) > 0 ? parseInt(usageLimit) : null,
        is_active: true
      }

      const url = couponToEdit ? `/api/coupons?code=${couponToEdit.code}` : '/api/coupons';
      const res = await fetch(url, {
          method: couponToEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(couponData)
      });
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Server error');
      }

      onSaved()

    } catch (error) {
      console.error(error)
      alert('Error guardando cupón: ' + error.message)
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
            <Ticket size={20} className="text-[#E31B23]" />
            {couponToEdit ? 'Editar Cupón' : 'Nuevo Cupón'}
          </h2>
          <button type="button" onClick={onCancel} className="text-white/70 hover:text-white transition-colors"><X /></button>
        </div>

        {/* ✅ FIX: Mismo fix que AdminBannerForm — un solo punto de submit vía form.
            El botón Guardar pasa a type="submit", se elimina el onClick duplicado. */}
        <form onSubmit={handleSave} className="p-6 space-y-5">

          {/* Código */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/50 uppercase">Código (Ej: PROMO2024)</label>
            <input
              required
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full bg-black border border-white/20 rounded-lg p-3 text-white font-black tracking-widest focus:border-[#E31B23] outline-none placeholder-gray-600 uppercase"
              placeholder="CÓDIGO..."
            />
          </div>

          {/* Tipo y Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/50 uppercase">Tipo</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white outline-none focus:border-[#E31B23]">
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto Fijo ($)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/50 uppercase">Valor</label>
              <input
                required
                type="number"
                min="0"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-[#E31B23] outline-none"
              />
            </div>
          </div>

          {/* Restricciones */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <p className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">Restricciones (Opcional)</p>

            {/* Fecha Límite */}
            <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/10">
              <Calendar size={20} className="text-white/40" />
              <div className="flex-1">
                <label className="text-[10px] text-white/60 block mb-1">
                  Fecha de Vencimiento <span className="text-white/30">(hora local)</span>:
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="bg-transparent text-white text-sm w-full outline-none scheme-dark"
                />
              </div>
            </div>

            {/* Límite de Usos */}
            <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/10">
              <Hash size={20} className="text-white/40" />
              <div className="flex-1">
                <label className="text-[10px] text-white/60 block mb-1">Límite de usos totales:</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ej: 50 (Dejar vacío para Ilimitado)"
                  value={usageLimit}
                  onChange={e => setUsageLimit(e.target.value)}
                  className="bg-transparent text-white text-sm w-full outline-none placeholder-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Footer dentro del form */}
          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg font-bold text-white/50 hover:bg-white/5 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg font-bold bg-[#E31B23] text-white hover:bg-[#C1121F] transition shadow-lg flex items-center gap-2 text-sm disabled:opacity-50 tracking-widest"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Guardar</>}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}