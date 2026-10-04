import { createContext, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

function loadCart() {
  try { return JSON.parse(localStorage.getItem('nammakadai_cart') || '[]') } catch { return [] }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)
  const persist = (next) => { setItems(next); localStorage.setItem('nammakadai_cart', JSON.stringify(next)) }
  const add = (food, quantity = 1) => {
    if (!food.is_available) return
    const existing = items.find((item) => item.food_id === food.id)
    persist(existing
      ? items.map((item) => item.food_id === food.id ? { ...item, quantity: item.quantity + quantity } : item)
      : [...items, { food_id: food.id, quantity, food }])
  }
  const update = (foodId, quantity) => persist(items.map((item) => item.food_id === foodId ? { ...item, quantity: Math.max(1, quantity) } : item))
  const remove = (foodId) => persist(items.filter((item) => item.food_id !== foodId))
  const clear = () => persist([])
  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  return <CartContext.Provider value={{ items, count, add, update, remove, clear }}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
