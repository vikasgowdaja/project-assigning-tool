import jwt from 'jsonwebtoken'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/apiError.js'
import { Team } from '../models/Team.js'
import {
  createDefaultTeamPassword,
  generateOtp,
  generateResetToken,
  hashOtp,
  hashPassword,
  verifyPassword
} from '../utils/password.js'
import { sendPasswordResetOtpEmail } from '../services/mailService.js'

const MIN_PASSWORD_LENGTH = 8

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const createAdminToken = () => {
  return jwt.sign({ role: 'admin', username: env.adminUsername }, env.jwtSecret, {
    expiresIn: '8h'
  })
}

const createTeamToken = (team) => {
  return jwt.sign(
    {
      role: 'team',
      teamId: String(team._id),
      teamName: team.teamName
    },
    env.jwtSecret,
    { expiresIn: '8h' }
  )
}

const findTeamByUsername = async (username) => {
  const normalizedUsername = String(username || '').trim()
  if (!normalizedUsername) {
    return null
  }

  const safeTeamName = escapeRegex(normalizedUsername)
  return Team.findOne({ teamName: { $regex: new RegExp(`^${safeTeamName}$`, 'i') } })
}

const sanitizeTeamAuthPayload = (team) => ({
  id: team._id,
  teamNumber: team.teamNumber,
  teamName: team.teamName,
  leadEmail: team.leadEmail,
  isDefaultPassword: Boolean(team.isDefaultPassword),
  passwordChangedAt: team.passwordChangedAt
})

const sanitizeTeamDashboardPayload = (team) => ({
  id: team._id,
  teamNumber: team.teamNumber,
  teamName: team.teamName,
  leadName: team.leadName,
  leadEmail: team.leadEmail,
  leadUsn: team.leadUsn,
  leadPhone: team.leadPhone,
  college: team.college,
  department: team.department,
  members: team.members,
  assignedProject: team.assignedProject,
  assignedAt: team.assignedAt,
  customProjectIdea: team.customProjectIdea,
  profileUpdateRequest: team.profileUpdateRequest,
  registrationStatus: team.registrationStatus,
  registrationReviewedAt: team.registrationReviewedAt,
  registrationReviewedBy: team.registrationReviewedBy,
  registrationReviewNote: team.registrationReviewNote,
  isDefaultPassword: Boolean(team.isDefaultPassword),
  passwordChangedAt: team.passwordChangedAt,
  securityActivity: team.securityActivity || {}
})

const ensureApprovedRegistration = (team) => {
  const registrationStatus = String(team?.registrationStatus || 'approved')
  const hasAssignedProject = Boolean(String(team?.assignedProject?.title || '').trim())

  if (registrationStatus === 'approved') {
    return
  }

  // Compatibility fallback for legacy records that became pending after schema updates.
  if (registrationStatus === 'pending' && hasAssignedProject) {
    return
  }

  if (registrationStatus === 'rejected') {
    throw new ApiError(403, 'Team registration was rejected. Please contact admin.')
  }

  throw new ApiError(403, 'Team registration is pending admin approval.')
}

const sanitizeAdminTeamSecurityRow = (team) => ({
  id: team._id,
  teamNumber: team.teamNumber,
  teamName: team.teamName,
  leadEmail: team.leadEmail,
  isDefaultPassword: Boolean(team.isDefaultPassword),
  passwordChangedAt: team.passwordChangedAt,
  securityActivity: team.securityActivity || {},
  passwordResetState: {
    hasActiveOtp: Boolean(team.passwordReset?.otpHash && team.passwordReset?.otpExpiresAt),
    otpExpiresAt: team.passwordReset?.otpExpiresAt || null,
    otpResendCount: Number(team.passwordReset?.otpResendCount || 0),
    otpVerifyAttempts: Number(team.passwordReset?.otpVerifyAttempts || 0),
    lastOtpSentAt: team.passwordReset?.lastOtpSentAt || null
  }
})

const clearPasswordResetState = (team) => {
  team.passwordReset = {
    otpHash: '',
    otpExpiresAt: null,
    otpVerifyAttempts: 0,
    otpResendCount: 0,
    lastOtpSentAt: null,
    resetTokenHash: '',
    resetTokenExpiresAt: null
  }
}

const bumpSecurityActivity = (team, updater) => {
  const current = team.securityActivity || {}
  team.securityActivity = updater(current)
}

const ensureTeamPasswordHash = async (team) => {
  if (team.passwordHash) {
    return
  }

  const defaultPassword = createDefaultTeamPassword(team.leadUsn)
  if (!defaultPassword) {
    throw new ApiError(500, 'Default credentials could not be prepared for this team')
  }

  team.passwordHash = await hashPassword(defaultPassword)
  team.passwordHistory = []
  team.isDefaultPassword = true
  team.passwordChangedAt = null
  await team.save()
}

const ensureNewPasswordAllowed = async (team, newPassword) => {
  if (String(newPassword || '').length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
  }

  await ensureTeamPasswordHash(team)

  if (await verifyPassword(newPassword, team.passwordHash)) {
    throw new ApiError(400, 'New password must be different from the current password')
  }

  for (const oldHash of team.passwordHistory || []) {
    if (await verifyPassword(newPassword, oldHash)) {
      throw new ApiError(400, 'New password must not match a recently used password')
    }
  }
}

const applyNewPassword = async (team, newPassword) => {
  await ensureNewPasswordAllowed(team, newPassword)

  const nextHistory = [team.passwordHash, ...(team.passwordHistory || [])].filter(Boolean).slice(0, 5)
  team.passwordHash = await hashPassword(newPassword)
  team.passwordHistory = nextHistory
  team.isDefaultPassword = false
  team.passwordChangedAt = new Date()
  bumpSecurityActivity(team, (activity) => ({
    ...activity,
    passwordResetCount: Number(activity.passwordResetCount || 0) + 1,
    lastPasswordResetAt: new Date()
  }))
  clearPasswordResetState(team)
  await team.save()
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

export const loginTeam = asyncHandler(async (req, res) => {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')

  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required')
  }

  const team = await findTeamByUsername(username)
  if (!team) {
    throw new ApiError(401, 'Invalid team credentials')
  }

  ensureApprovedRegistration(team)

  await ensureTeamPasswordHash(team)

  const isValidPassword = await verifyPassword(password, team.passwordHash)
  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid team credentials')
  }

  const token = createTeamToken(team)

  res.json({
    token,
    team: sanitizeTeamAuthPayload(team),
    message: team.isDefaultPassword
      ? 'Login successful. Please change your default password.'
      : 'Login successful'
  })
})

export const changeTeamPassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '')
  const newPassword = String(req.body?.newPassword || '')
  const confirmPassword = String(req.body?.confirmPassword || '')

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, 'Current password, new password, and confirmation are required')
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, 'New password and confirmation do not match')
  }

  const team = await Team.findById(req.team.teamId)
  if (!team) {
    throw new ApiError(404, 'Team account not found')
  }

  await ensureTeamPasswordHash(team)

  const isCurrentPasswordValid = await verifyPassword(currentPassword, team.passwordHash)
  if (!isCurrentPasswordValid) {
    throw new ApiError(401, 'Current password is incorrect')
  }

  await applyNewPassword(team, newPassword)

  res.json({
    message: 'Password updated successfully',
    team: sanitizeTeamAuthPayload(team)
  })
})

export const requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!email) {
    throw new ApiError(400, 'Registered email is required')
  }

  const team = await Team.findOne({ leadEmail: email })
  if (!team) {
    res.json({
      message: 'If the email is registered, an OTP has been sent.'
    })
    return
  }

  const activeResendCount = Number(team.passwordReset?.otpResendCount || 0)
  const otpExpiresAt = team.passwordReset?.otpExpiresAt ? new Date(team.passwordReset.otpExpiresAt) : null
  const isExistingOtpActive = otpExpiresAt && otpExpiresAt.getTime() > Date.now()

  if (isExistingOtpActive && activeResendCount >= env.otpMaxResends) {
    throw new ApiError(429, 'OTP resend limit reached. Please wait for the current OTP to expire.')
  }

  const otp = generateOtp()
  team.passwordReset = {
    otpHash: hashOtp(otp),
    otpExpiresAt: new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000),
    otpVerifyAttempts: 0,
    otpResendCount: isExistingOtpActive ? activeResendCount + 1 : 1,
    lastOtpSentAt: new Date(),
    resetTokenHash: '',
    resetTokenExpiresAt: null
  }
  bumpSecurityActivity(team, (activity) => ({
    ...activity,
    otpRequestCount: Number(activity.otpRequestCount || 0) + 1,
    lastOtpRequestedAt: new Date()
  }))

  await team.save()

  await sendPasswordResetOtpEmail({
    to: team.leadEmail,
    teamName: team.teamName,
    otp,
    expiresInMinutes: env.otpExpiryMinutes
  })

  res.json({
    message: 'OTP sent successfully to your registered email address.'
  })
})

export const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const otp = String(req.body?.otp || '').trim()

  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required')
  }

  const team = await Team.findOne({ leadEmail: email })
  if (!team) {
    throw new ApiError(404, 'Registered team not found for this email')
  }

  const passwordReset = team.passwordReset || {}
  if (!passwordReset.otpHash || !passwordReset.otpExpiresAt) {
    throw new ApiError(400, 'No active OTP found. Please request a new OTP.')
  }

  if (new Date(passwordReset.otpExpiresAt).getTime() < Date.now()) {
    clearPasswordResetState(team)
    await team.save()
    throw new ApiError(400, 'OTP has expired. Please request a new one.')
  }

  if (Number(passwordReset.otpVerifyAttempts || 0) >= env.otpMaxVerifyAttempts) {
    clearPasswordResetState(team)
    await team.save()
    throw new ApiError(429, 'OTP verification limit reached. Please request a new OTP.')
  }

  if (hashOtp(otp) !== passwordReset.otpHash) {
    team.passwordReset.otpVerifyAttempts = Number(passwordReset.otpVerifyAttempts || 0) + 1
    await team.save()
    throw new ApiError(400, 'Invalid OTP')
  }

  const resetToken = generateResetToken()
  team.passwordReset = {
    otpHash: '',
    otpExpiresAt: null,
    otpVerifyAttempts: 0,
    otpResendCount: 0,
    lastOtpSentAt: passwordReset.lastOtpSentAt || new Date(),
    resetTokenHash: hashOtp(resetToken),
    resetTokenExpiresAt: new Date(Date.now() + env.passwordResetSessionMinutes * 60 * 1000)
  }
  bumpSecurityActivity(team, (activity) => ({
    ...activity,
    otpVerifySuccessCount: Number(activity.otpVerifySuccessCount || 0) + 1,
    lastOtpVerifiedAt: new Date()
  }))
  await team.save()

  res.json({
    message: 'OTP verified successfully',
    resetToken
  })
})

export const resetTeamPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const resetToken = String(req.body?.resetToken || '').trim()
  const newPassword = String(req.body?.newPassword || '')
  const confirmPassword = String(req.body?.confirmPassword || '')

  if (!email || !resetToken || !newPassword || !confirmPassword) {
    throw new ApiError(400, 'Email, reset token, and new password are required')
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, 'New password and confirmation do not match')
  }

  const team = await Team.findOne({ leadEmail: email })
  if (!team) {
    throw new ApiError(404, 'Registered team not found for this email')
  }

  const passwordReset = team.passwordReset || {}
  if (!passwordReset.resetTokenHash || !passwordReset.resetTokenExpiresAt) {
    throw new ApiError(400, 'Password reset session is invalid or expired')
  }

  if (new Date(passwordReset.resetTokenExpiresAt).getTime() < Date.now()) {
    clearPasswordResetState(team)
    await team.save()
    throw new ApiError(400, 'Password reset session has expired. Please request a new OTP.')
  }

  if (hashOtp(resetToken) !== passwordReset.resetTokenHash) {
    throw new ApiError(400, 'Password reset session is invalid or expired')
  }

  await applyNewPassword(team, newPassword)

  res.json({
    message: 'Password reset successful. You can now sign in with your new password.'
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

export const getCurrentTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.team.teamId)
  if (!team) {
    throw new ApiError(404, 'Team account not found')
  }

  ensureApprovedRegistration(team)

  res.json({
    team: sanitizeTeamDashboardPayload(team)
  })
})

export const getTeamPasswordResetActivity = asyncHandler(async (req, res) => {
  const teams = await Team.find()
    .select(
      'teamNumber teamName leadEmail isDefaultPassword passwordChangedAt passwordReset securityActivity'
    )
    .sort({ createdAt: -1 })

  res.json({
    teams: teams.map(sanitizeAdminTeamSecurityRow)
  })
})

export const forceResetTeamPassword = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  const defaultPassword = createDefaultTeamPassword(team.leadUsn)
  if (!defaultPassword) {
    throw new ApiError(400, 'Could not derive default password from team lead USN')
  }

  const previousHash = team.passwordHash
  team.passwordHash = await hashPassword(defaultPassword)
  team.passwordHistory = [previousHash, ...(team.passwordHistory || [])].filter(Boolean).slice(0, 5)
  team.isDefaultPassword = true
  team.passwordChangedAt = null
  clearPasswordResetState(team)
  bumpSecurityActivity(team, (activity) => ({
    ...activity,
    adminForceResetCount: Number(activity.adminForceResetCount || 0) + 1,
    lastPasswordResetByAdminAt: new Date(),
    passwordResetCount: Number(activity.passwordResetCount || 0) + 1,
    lastPasswordResetAt: new Date()
  }))
  await team.save()

  res.json({
    message: `Password has been reset to default (lead USN in lowercase) for ${team.teamName}`,
    team: sanitizeAdminTeamSecurityRow(team)
  })
})
