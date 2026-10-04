import axios from 'axios'

export const API_ROOT = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`
export const api = axios.create({ baseURL: `${API_ROOT}/api`, timeout: 15000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nammakadai_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function apiError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) return 'Could not reach the server. Please check your connection.'
  if (error.response.status === 401) return 'Please log in to continue.'
  if (error.response.status === 403) return 'You do not have access to this action.'
  const detail = error.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return fallback
}

export const money = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', currencyDisplay: 'code', maximumFractionDigits: 2 }).format(Number(value || 0))

export function foodImage(food) {
  if (food?.image_url) return food.image_url.startsWith('http') ? food.image_url : `${API_ROOT}${food.image_url.startsWith('/') ? '' : '/'}${food.image_url}`
  return null
}
