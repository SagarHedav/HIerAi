import { io } from 'socket.io-client'

let socket = null

export function connectSocket(){
  if (socket) return socket
  const url = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : 'https://hierai.onrender.com'
  socket = io(url, { withCredentials: true, autoConnect: true })
  return socket
}

export function getSocket(){
  return socket
}
