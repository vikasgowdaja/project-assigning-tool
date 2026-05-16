import crypto from 'crypto'

const SCRYPT_KEY_LENGTH = 64

const scryptAsync = (value, salt) => {
  return new Promise((resolve, reject) => {
    crypto.scrypt(value, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(derivedKey)
    })
  })
}

export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt)
  return `${salt}:${derivedKey.toString('hex')}`
}

export const verifyPassword = async (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) {
    return false
  }

  const [salt, hashHex] = storedHash.split(':')
  const derivedKey = await scryptAsync(password, salt)
  const storedBuffer = Buffer.from(hashHex, 'hex')

  if (storedBuffer.length !== derivedKey.length) {
    return false
  }

  return crypto.timingSafeEqual(storedBuffer, derivedKey)
}

export const generateOtp = () => String(crypto.randomInt(100000, 1000000))

export const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex')

export const generateResetToken = () => crypto.randomBytes(24).toString('hex')

export const createDefaultTeamPassword = (leadUsn) => String(leadUsn || '').trim().toLowerCase()