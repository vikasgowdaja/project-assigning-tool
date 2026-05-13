import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env.js'
import teamRoutes from './routes/teamRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

export const createApp = () => {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
      credentials: true
    })
  )

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    next()
  })

  app.use(express.json())
  app.use(morgan('dev'))

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use('/api/teams', teamRoutes)
  app.use('/api/projects', projectRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
