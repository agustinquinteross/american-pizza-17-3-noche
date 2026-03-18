'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

// ✅ FIX: Helper seguro para acceder a localStorage.
// En SSR (Next.js renderiza en el servidor), "window" no existe y llamar
// localStorage directamente lanza "ReferenceError: localStorage is not defined".
// Este helper verifica que estamos en el cliente antes de cada acceso.
const safeLocalStorage = {
  get: (key) => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (key, value) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Puede fallar en modo incógnito con storage lleno, ignoramos silenciosamente
    }
  },
  remove: (key) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignoramos silenciosamente
    }
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [mounted, setMounted] = useState(false)

  // Carga inicial — solo se ejecuta en el cliente gracias al useEffect
  useEffect(() => {
    const saved = safeLocalStorage.get('cart')
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(JSON.parse(saved))
      } catch {
        // ✅ FIX: Si el JSON guardado está corrupto, lo descartamos en lugar de romper la app
        safeLocalStorage.remove('cart')
      }
    }
    setMounted(true)
  }, [])

  // Guardado automático — solo cuando ya montó (evita sobreescribir con [] en SSR)
  useEffect(() => {
    if (mounted) {
      safeLocalStorage.set('cart', JSON.stringify(cart))
    }
  }, [cart, mounted])

  const addToCart = (item) => {
    setCart(prev => {
      const options = item.selectedOptions || []
      const optionsSignature = options.map(o => o.name).sort().join('-')
      const cartItemId = `${item.id}-${optionsSignature}`
      const existing = prev.find(i => i.cartItemId === cartItemId)

      if (existing) {
        return prev.map(i =>
          i.cartItemId === cartItemId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }

      return [...prev, { ...item, cartItemId }]
    })
  }

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId))
  }

  const clearCart = () => {
    setCart([])
    // ✅ FIX: Antes llamaba localStorage.removeItem directamente,
    // lo que podía romper en SSR o en modo incógnito con storage restringido.
    // Ahora usa el helper seguro.
    safeLocalStorage.remove('cart')
  }

  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity < 1) return
    setCart(prev => prev.map(item =>
      item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
    ))
  }

  const getTotal = () => {
    return cart.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)
  }

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotal,
      // ✅ BONUS: Exponemos "mounted" para que los componentes que muestran
      // el conteo del carrito puedan esperar a que esté listo y evitar
      // el hydration mismatch (el servidor ve 0 items, el cliente ve 3).
      // Uso: const { cart, mounted } = useCart()
      //      if (!mounted) return null  ← evita el parpadeo del contador
      mounted
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  // ✅ FIX: Si alguien usa useCart() fuera de CartProvider, da un error claro
  // en lugar de fallar silenciosamente con "cannot read property 'cart' of undefined".
  if (!context) {
    throw new Error('useCart debe usarse dentro de un <CartProvider>. Verificá tu layout o _app.js.')
  }
  return context
}