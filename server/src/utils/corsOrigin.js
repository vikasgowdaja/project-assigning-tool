const PRIVATE_IPV4_PATTERNS = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./
]

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

const normalizeOrigin = (origin) => origin.replace(/\/+$/, '').trim()

const isPrivateIpv4Host = (hostname) =>
  PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))

const isDevLocalOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin)
    return LOCAL_HOSTNAMES.has(hostname) || isPrivateIpv4Host(hostname)
  } catch {
    return false
  }
}

export const createCorsOriginMatcher = ({ corsOrigin, nodeEnv }) => {
  const allowAllOrigins = corsOrigin === '*'
  const allowedOrigins = new Set(
    corsOrigin
      .split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  )

  return (origin, callback) => {
    // Allow non-browser requests (for example, health checks and server-to-server calls).
    if (!origin) {
      callback(null, true)
      return
    }

    const normalizedOrigin = normalizeOrigin(origin)

    if (
      allowAllOrigins ||
      allowedOrigins.has(normalizedOrigin) ||
      (nodeEnv !== 'production' && isDevLocalOrigin(normalizedOrigin))
    ) {
      callback(null, true)
      return
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`))
  }
}