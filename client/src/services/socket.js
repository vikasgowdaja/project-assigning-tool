import { io } from 'socket.io-client'

const getSocketBaseUrl = () => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin
  }

  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return undefined
}

export const socket = io(getSocketBaseUrl(), {
  autoConnect: false,
  transports: ['websocket', 'polling']
})
