import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../utils/apiError.js'

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null
  }

  const [scheme, token] = authorizationHeader.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return null
  }

  return token
}

export const requireAdminAuth = (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    next(new ApiError(401, 'Authentication required'))
    return
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    if (payload.role !== 'admin') {
      throw new ApiError(403, 'Admin access required')
    }

    req.admin = {
      username: payload.username,
      role: payload.role
    }

    next()
  } catch (error) {
    next(new ApiError(error.statusCode || 401, 'Invalid or expired token'))
  }
}

export const requireTeamAuth = (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    next(new ApiError(401, 'Authentication required'))
    return
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    if (payload.role !== 'team' || !payload.teamId) {
      throw new ApiError(403, 'Team access required')
    }

    req.team = {
      teamId: payload.teamId,
      teamName: payload.teamName,
      role: payload.role
    }

    next()
  } catch (error) {
    next(new ApiError(error.statusCode || 401, 'Invalid or expired token'))
  }
}
