import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { ApiError } from '../utils/apiError.js'

let transporter = null

const getTransporter = () => {
  if (transporter) {
    return transporter
  }

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.mailFrom) {
    throw new ApiError(500, 'Email service is not configured')
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  })

  return transporter
}

export const sendPasswordResetOtpEmail = async ({ to, teamName, otp, expiresInMinutes }) => {
  const mailer = getTransporter()

  await mailer.sendMail({
    from: env.mailFrom,
    to,
    subject: 'Your OTP for password reset',
    text: [
      `Hello ${teamName},`,
      '',
      `Your OTP for password reset is: ${otp}`,
      `It will expire in ${expiresInMinutes} minutes.`,
      '',
      'If you did not request this, please ignore this email.'
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <p>Hello ${teamName},</p>
        <p>Your OTP for password reset is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>It will expire in ${expiresInMinutes} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `
  })
}