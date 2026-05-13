import http from 'http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { connectDb } from './config/db.js'
import { env } from './config/env.js'
import { setupSockets } from './sockets/index.js'
import { ensureProjectPool } from './services/seedService.js'
import { getLanIPv4Addresses } from './utils/network.js'

const bootstrap = async () => {
  await connectDb()
  await ensureProjectPool()

  const app = createApp()
  const server = http.createServer(app)
  const io = new Server(server, {
    cors: {
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',')
    }
  })

  app.set('io', io)
  setupSockets(io)

  server.listen(env.port, '0.0.0.0', () => {
    const lanIps = getLanIPv4Addresses()

    console.log('\nInnovation Project Allocation Portal API running')
    console.log(`Local:   http://localhost:${env.port}`)
    lanIps.forEach((ip) => {
      console.log(`LAN:     http://${ip}:${env.port}`)
    })
    console.log('')
  })
}

bootstrap().catch((error) => {
  console.error('Server startup failed:', error)
  process.exit(1)
})
