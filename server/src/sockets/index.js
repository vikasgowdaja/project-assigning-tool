export const setupSockets = (io) => {
  io.on('connection', (socket) => {
    socket.emit('socket:ready', {
      id: socket.id,
      connectedAt: new Date().toISOString()
    })
  })
}
