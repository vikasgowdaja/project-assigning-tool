import jwt from 'jsonwebtoken'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/apiError.js'

const createAdminToken = () => {
  return jwt.sign({ role: 'admin', username: env.adminUsername }, env.jwtSecret, {
    expiresIn: '8h'
  })
}

export const loginAdmin = asyncHandler(async (req, res) => {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')

  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required')
  }

  if (username !== env.adminUsername || password !== env.adminPassword) {
    throw new ApiError(401, 'Invalid admin credentials')
  }

  const token = createAdminToken()
  res.json({
    token,
    admin: {
      username: env.adminUsername,
      role: 'admin'
    }
  })
})

export const getCurrentAdmin = asyncHandler(async (req, res) => {
  res.json({
    admin: {
      username: req.admin.username,
      role: req.admin.role
    }
  })
})
