import { io } from 'socket.io-client'

const getSocketBaseUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  }

  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000`
  }

  return 'http://localhost:5000'
}

export const socket = io(getSocketBaseUrl(), {
  autoConnect: false,
  transports: ['websocket', 'polling']
})
