import { uploadProjectFile } from '../middleware/upload.js'
import ExcelJS from 'exceljs'
// Helpers for bulk custom project idea upload/preview (Excel/PDF)
const parseCustomIdeaUploadFile = async (file) => {
  if (!file) throw new ApiError(400, 'Upload file is required')
  const fileName = String(file.originalname || '').toLowerCase()
  if (fileName.endsWith('.xlsx')) return parseCustomIdeaExcelBuffer(file.buffer)
  if (fileName.endsWith('.pdf')) return parseCustomIdeaPdfBuffer(file.buffer)
  throw new ApiError(400, 'Unsupported file type. Use .xlsx or .pdf')
}

const parseCustomIdeaExcelBuffer = async (buffer) => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new ApiError(400, 'Excel file does not contain any worksheet')
  const rows = []
  const headerRow = worksheet.getRow(1)
  const headers = headerRow.values.slice(1).map((header) => String(header || '').trim().toLowerCase())
  const keyByIndex = headers.map((h) => {
    if (h.includes('title')) return 'title'
    if (h.includes('desc')) return 'description'
    if (h.includes('diffic')) return 'difficulty'
    if (h.includes('domain') || h.includes('category')) return 'domain'
    if (h.includes('tech')) return 'technologies'
    return null
  })
  if (!keyByIndex.includes('title')) throw new ApiError(400, 'Excel headers must include a title column')
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const values = row.values.slice(1)
    const record = {}
    values.forEach((value, index) => {
      const key = keyByIndex[index]
      if (!key) return
      record[key] = typeof value === 'object' && value?.text ? value.text : String(value || '').trim()
    })
    const isRowEmpty = Object.values(record).every((v) => !String(v || '').trim())
    if (!isRowEmpty) rows.push(record)
  })
  return rows
}

const parseCustomIdeaPdfBuffer = async (buffer) => {
  const PDFParse = (await import('pdf-parse')).default
  const result = await PDFParse(buffer)
  const lines = String(result.text || '').split('\n').map((line) => line.trim()).filter(Boolean)
  return lines.map((line) => {
    const [title, description, difficulty, domain, technologies] = line.split('|').map((part) => part?.trim() || '')
    return { title, description, difficulty, domain, technologies }
  })
}

const buildCustomIdeaUploadPreview = (rawRecords = []) => {
  const validRows = []
  const invalidRows = []
  rawRecords.forEach((row, index) => {
    const rowNumber = index + 2
    try {
      const candidate = normalizeCustomProjectIdea(row)
      validRows.push({ rowNumber, idea: candidate })
    } catch (err) {
      invalidRows.push({ rowNumber, title: String(row.title || ''), errors: [err.message || 'invalid row'] })
    }
  })
  return {
    totalRows: rawRecords.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows
  }
}

export const previewTeamCustomIdeaUpload = asyncHandler(async (req, res) => {
  const records = await parseCustomIdeaUploadFile(req.file)
  const preview = buildCustomIdeaUploadPreview(records)
  res.json({
    message: 'Upload preview generated',
    totalRows: preview.totalRows,
    validCount: preview.validCount,
    invalidCount: preview.invalidCount,
    invalidRows: preview.invalidRows.slice(0, 100),
    validRows: preview.validRows.slice(0, 200).map((row) => ({ rowNumber: row.rowNumber, ...row.idea }))
  })
})

export const uploadTeamCustomIdeaBulk = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.team.teamId)
  if (!team) throw new ApiError(404, 'Team not found')
  const records = await parseCustomIdeaUploadFile(req.file)
  const preview = buildCustomIdeaUploadPreview(records)
  if (preview.validCount === 0) {
    res.status(400).json({
      message: 'No valid rows found in upload. Please correct errors and try again.',
      totalRows: preview.totalRows,
      validCount: preview.validCount,
      invalidCount: preview.invalidCount,
      invalidRows: preview.invalidRows.slice(0, 100)
    })
    return
  }
  // For now, only allow one pending idea at a time (like UI). If multiple, take first valid.
  if (team.customProjectIdea?.status === 'pending') {
    throw new ApiError(409, 'A custom project idea is already pending approval')
  }
  // Use first valid idea
  const firstIdea = preview.validRows[0].idea
  team.customProjectIdea = firstIdea
  await team.save()
  res.status(201).json({
    message: 'Custom project idea submitted for admin approval',
    team: toPlainTeam(team),
    loadedIdeas: [firstIdea],
    totalRows: preview.totalRows,
    validCount: preview.validCount,
    invalidCount: preview.invalidCount,
    invalidRows: preview.invalidRows.slice(0, 50)
  })
})
import { Team } from '../models/Team.js'
import { Project } from '../models/Project.js'
import { RegistrationLookup } from '../models/RegistrationLookup.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { getNextTeamNumber } from '../services/teamNumberService.js'
import { assignRandomProject, getProjectStats } from '../services/projectService.js'
import { createDefaultTeamPassword, hashPassword } from '../utils/password.js'

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isPhone = (value) => /^\+?[0-9]{10,15}$/.test(value)
const isGithubRepoUrl = (value) => /^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s#?]+\/?$/i.test(value)
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard'])

const normalizeMembers = (members = []) => {
  return members
    .map((member) => ({
      name: String(member.name || '').trim(),
      usn: String(member.usn || '').trim().toUpperCase(),
      email: String(member.email || '').trim().toLowerCase()
    }))
    .filter((member) => member.name && member.usn && member.email)
}

const normalizeTechnologies = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeCustomProjectIdea = (customProjectIdea) => {
  if (!customProjectIdea || typeof customProjectIdea !== 'object') {
    return null
  }

  const normalized = {
    title: String(customProjectIdea.title || '').trim(),
    description: String(customProjectIdea.description || '').trim(),
    difficulty: String(customProjectIdea.difficulty || '').trim(),
    domain: String(customProjectIdea.domain || '').trim(),
    technologies: normalizeTechnologies(customProjectIdea.technologies)
  }

  const hasAnyData =
    normalized.title ||
    normalized.description ||
    normalized.difficulty ||
    normalized.domain ||
    normalized.technologies.length

  if (!hasAnyData) {
    return null
  }

  if (
    !normalized.title ||
    !normalized.description ||
    !normalized.difficulty ||
    !normalized.domain ||
    normalized.technologies.length === 0
  ) {
    throw new ApiError(
      400,
      'Custom project idea requires title, description, difficulty, domain, and technologies'
    )
  }

  if (!ALLOWED_DIFFICULTIES.has(normalized.difficulty)) {
    throw new ApiError(400, 'Custom project difficulty must be one of Easy, Medium, or Hard')
  }

  return {
    ...normalized,
    status: 'pending',
    submittedAt: new Date()
  }
}

const normalizeProfileUpdatePayload = (payload = {}) => {
  const normalized = {
    teamName: String(payload.teamName || '').trim(),
    leadName: String(payload.leadName || '').trim(),
    leadEmail: String(payload.leadEmail || '').trim().toLowerCase(),
    leadUsn: String(payload.leadUsn || '').trim().toUpperCase(),
    leadPhone: String(payload.leadPhone || '').trim(),
    college: String(payload.college || '').trim(),
    department: String(payload.department || '').trim(),
    members: normalizeMembers(payload.members),
    requestNote: String(payload.requestNote || '').trim()
  }

  if (
    !normalized.teamName ||
    !normalized.leadName ||
    !normalized.leadEmail ||
    !normalized.leadUsn ||
    !normalized.leadPhone ||
    !normalized.college ||
    !normalized.department
  ) {
    throw new ApiError(400, 'Please fill all required fields in the update request')
  }

  if (!isEmail(normalized.leadEmail)) {
    throw new ApiError(400, 'Invalid lead email in update request')
  }

  if (!isPhone(normalized.leadPhone)) {
    throw new ApiError(400, 'Invalid lead phone number in update request')
  }

  if (normalized.members.length < 2 || normalized.members.length > 6) {
    throw new ApiError(400, 'Team members must be between 2 and 6')
  }

  const memberEmails = normalized.members.map((member) => member.email)
  const memberUsns = normalized.members.map((member) => member.usn)

  const duplicateEmails = new Set(memberEmails)
  if (duplicateEmails.size !== memberEmails.length) {
    throw new ApiError(400, 'Duplicate member emails are not allowed')
  }

  const duplicateUsns = new Set(memberUsns)
  if (duplicateUsns.size !== memberUsns.length) {
    throw new ApiError(400, 'Duplicate member USNs are not allowed')
  }

  return normalized
}

const assertProfileUpdateUniqueness = async (teamId, normalizedProfile) => {
  const safeTeamName = escapeRegex(normalizedProfile.teamName)
  const memberEmails = normalizedProfile.members.map((member) => member.email)
  const memberUsns = normalizedProfile.members.map((member) => member.usn)
  const usnCheckSet = Array.from(new Set([normalizedProfile.leadUsn, ...memberUsns]))

  const [
    existingTeamName,
    existingLeadEmail,
    existingLeadUsn,
    existingMemberEmail,
    existingMemberUsn
  ] = await Promise.all([
    Team.findOne({
      _id: { $ne: teamId },
      teamName: { $regex: new RegExp(`^${safeTeamName}$`, 'i') }
    }),
    Team.findOne({
      _id: { $ne: teamId },
      leadEmail: normalizedProfile.leadEmail
    }),
    Team.findOne({
      _id: { $ne: teamId },
      leadUsn: normalizedProfile.leadUsn
    }),
    Team.findOne({
      _id: { $ne: teamId },
      'members.email': { $in: memberEmails }
    }),
    Team.findOne({
      _id: { $ne: teamId },
      $or: [
        { leadUsn: { $in: usnCheckSet } },
        { 'members.usn': { $in: usnCheckSet } }
      ]
    })
  ])

  if (existingTeamName) {
    throw new ApiError(409, 'Team name is already in use')
  }

  if (existingLeadEmail) {
    throw new ApiError(409, 'Lead email is already in use')
  }

  if (existingLeadUsn) {
    throw new ApiError(409, 'Lead USN is already in use')
  }

  if (existingMemberEmail) {
    throw new ApiError(409, 'One or more member emails already exist in another team')
  }

  if (existingMemberUsn) {
    throw new ApiError(409, 'One or more member USNs already exist in another team')
  }
}

const toPlainTeam = (team) => (team.toObject ? team.toObject() : team)

const publicApprovedTeamsQuery = {
  $or: [
    { registrationStatus: 'approved' },
    { registrationStatus: { $exists: false } },
    {
      registrationStatus: 'pending',
      'assignedProject.title': { $exists: true, $ne: '' }
    }
  ]
}

const escapeForRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const upsertApprovedIdeaIntoProjectPool = async (idea) => {
  const normalizedTitle = String(idea?.title || '').trim()
  if (!normalizedTitle) {
    return null
  }

  const query = {
    title: {
      $regex: new RegExp(`^${escapeForRegex(normalizedTitle)}$`, 'i')
    }
  }

  const update = {
    $set: {
      title: normalizedTitle,
      description: String(idea?.description || '').trim(),
      difficulty: String(idea?.difficulty || 'Medium').trim(),
      domain: String(idea?.domain || '').trim(),
      technologies: Array.isArray(idea?.technologies)
        ? idea.technologies.map((item) => String(item || '').trim()).filter(Boolean)
        : []
    },
    $setOnInsert: {
      assigned: false,
      assignedTo: null,
      assignedAt: null
    }
  }

  return Project.findOneAndUpdate(query, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  })
}

// ADMIN: Delete a team and return project to pool
export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
  if (!team) throw new ApiError(404, 'Team not found')

  const currentTitle = String(team.assignedProject?.title || '').trim()

  await team.deleteOne()

  if (currentTitle) {
    const stillUsedByOtherTeam = await Team.exists({ 'assignedProject.title': currentTitle })
    if (!stillUsedByOtherTeam) {
      await Project.updateOne(
        { title: currentTitle },
        { $set: { assigned: false, assignedTo: null, assignedAt: null } }
      )
    }
  }

  res.json({ message: 'Team deleted' })
})

// ADMIN: Update team details, including reassignment of project by title
export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
  if (!team) throw new ApiError(404, 'Team not found')

  if (req.body.teamNumber !== undefined) {
    const normalizedTeamNumber = String(req.body.teamNumber || '').trim().toUpperCase()
    if (!/^TEAM-\d{3,}$/.test(normalizedTeamNumber)) {
      throw new ApiError(400, 'Team number format must be like TEAM-001')
    }

    const existingTeamNumber = await Team.findOne({
      _id: { $ne: team._id },
      teamNumber: normalizedTeamNumber
    })

    if (existingTeamNumber) {
      throw new ApiError(409, 'Team number is already in use')
    }

    team.teamNumber = normalizedTeamNumber
  }

  if (req.body.teamName !== undefined) {
    const normalizedTeamName = String(req.body.teamName || '').trim()
    if (!normalizedTeamName) {
      throw new ApiError(400, 'Team name is required')
    }

    const safeTeamName = escapeRegex(normalizedTeamName)
    const existingTeamName = await Team.findOne({
      _id: { $ne: team._id },
      teamName: { $regex: new RegExp(`^${safeTeamName}$`, 'i') }
    })

    if (existingTeamName) {
      throw new ApiError(409, 'Team name is already in use')
    }

    team.teamName = normalizedTeamName
  }

  if (req.body.leadEmail !== undefined) {
    const normalizedLeadEmail = String(req.body.leadEmail || '').trim().toLowerCase()
    if (!isEmail(normalizedLeadEmail)) {
      throw new ApiError(400, 'Invalid lead email')
    }

    const existingLeadEmail = await Team.findOne({
      _id: { $ne: team._id },
      leadEmail: normalizedLeadEmail
    })

    if (existingLeadEmail) {
      throw new ApiError(409, 'Lead email is already in use')
    }

    team.leadEmail = normalizedLeadEmail
  }

  if (req.body.leadUsn !== undefined) {
    const normalizedLeadUsn = String(req.body.leadUsn || '').trim().toUpperCase()
    if (!normalizedLeadUsn) {
      throw new ApiError(400, 'Lead USN is required')
    }

    const existingLeadUsn = await Team.findOne({
      _id: { $ne: team._id },
      leadUsn: normalizedLeadUsn
    })

    if (existingLeadUsn) {
      throw new ApiError(409, 'Lead USN is already in use')
    }

    team.leadUsn = normalizedLeadUsn

    if (team.isDefaultPassword) {
      const nextDefaultPassword = createDefaultTeamPassword(normalizedLeadUsn)
      team.passwordHash = await hashPassword(nextDefaultPassword)
      team.passwordHistory = []
      team.passwordChangedAt = null
    }
  }

  const simpleUpdatableFields = [
    'leadName',
    'leadPhone',
    'college',
    'department'
  ]

  simpleUpdatableFields.forEach((field) => {
    if (req.body[field] === undefined) return
    if (field === 'leadPhone') {
      const value = String(req.body[field] || '').trim()
      if (!isPhone(value)) {
        throw new ApiError(400, 'Invalid lead phone number')
      }
      team[field] = value
      return
    }

    const value = String(req.body[field]).trim()
    if (!value) {
      throw new ApiError(400, `${field} is required`)
    }
    team[field] = value
  })

  if (req.body.members !== undefined) {
    const normalizedMembers = normalizeMembers(req.body.members)
    if (normalizedMembers.length < 2 || normalizedMembers.length > 6) {
      throw new ApiError(400, 'Team members must be between 2 and 6')
    }
    team.members = normalizedMembers
  }

  if (req.body.projectTitle !== undefined) {
    const requestedTitle = String(req.body.projectTitle || '').trim()
    if (!requestedTitle) {
      throw new ApiError(400, 'Project title is required')
    }

    const currentTitle = team.assignedProject?.title || ''
    if (requestedTitle !== currentTitle) {
      const nextProject = await Project.findOne({ title: requestedTitle })
      if (!nextProject) {
        throw new ApiError(404, 'Selected project not found')
      }

      if (currentTitle) {
        const sameTitleTeamCount = await Team.countDocuments({
          _id: { $ne: team._id },
          'assignedProject.title': currentTitle
        })

        if (sameTitleTeamCount === 0) {
          await Project.updateOne(
            { title: currentTitle },
            { $set: { assigned: false, assignedTo: null, assignedAt: null } }
          )
        }
      }

      const assignedAt = new Date()
      if (!nextProject.assigned || String(nextProject.assignedTo || '') === String(team._id)) {
        await Project.updateOne(
          { _id: nextProject._id },
          { $set: { assigned: true, assignedTo: team._id, assignedAt } }
        )
      }

      team.assignedProject = {
        title: nextProject.title,
        description: nextProject.description,
        difficulty: nextProject.difficulty,
        domain: nextProject.domain,
        technologies: nextProject.technologies
      }
      team.assignedAt = assignedAt
    }
  }

  await team.save()
  res.json(team)
})

// ADMIN: Reconcile project assignment flags based on current teams
export const reconcileProjectAssignments = asyncHandler(async (req, res) => {
  const teams = await Team.find().lean()
  const activeTitles = new Set(
    teams
      .map((team) => String(team.assignedProject?.title || '').trim())
      .filter(Boolean)
  )

  await Project.updateMany(
    { title: { $nin: Array.from(activeTitles) } },
    { $set: { assigned: false, assignedTo: null, assignedAt: null } }
  )

  const projects = await Project.find({ title: { $in: Array.from(activeTitles) } })
  const projectByTitle = new Map(projects.map((project) => [project.title, project]))

  for (const team of teams) {
    const title = String(team.assignedProject?.title || '').trim()
    if (!title) {
      continue
    }

    const project = projectByTitle.get(title)
    if (!project) {
      continue
    }

    if (!project.assigned) {
      project.assigned = true
      project.assignedTo = team._id
      project.assignedAt = team.assignedAt || team.updatedAt || new Date()
      await project.save()
    }
  }

  const [projectStats, totalTeams] = await Promise.all([
    getProjectStats(),
    Team.countDocuments()
  ])

  res.json({
    message: 'Project assignments reconciled successfully',
    stats: {
      ...projectStats,
      totalTeams
    }
  })
})

export const registerTeam = asyncHandler(async (req, res) => {
  const {
    teamName,
    leadName,
    leadEmail,
    leadUsn,
    leadPhone,
    college,
    department,
    members,
    customProjectIdea
  } = req.body

  if (
    !teamName ||
    !leadName ||
    !leadEmail ||
    !leadUsn ||
    !leadPhone ||
    !college ||
    !department
  ) {
    throw new ApiError(400, 'Please fill all required fields')
  }

  if (!isEmail(leadEmail)) {
    throw new ApiError(400, 'Invalid lead email')
  }

  if (!isPhone(leadPhone)) {
    throw new ApiError(400, 'Invalid lead phone number')
  }

  const normalizedMembers = normalizeMembers(members)
  const normalizedCustomProjectIdea = normalizeCustomProjectIdea(customProjectIdea)
  if (normalizedMembers.length < 2 || normalizedMembers.length > 6) {
    throw new ApiError(400, 'Team members must be between 2 and 6')
  }

  if (normalizedMembers.some((member) => !member.usn)) {
    throw new ApiError(400, 'Each team member must have a USN')
  }

  const duplicateInPayload = new Set(normalizedMembers.map((m) => m.email))
  if (duplicateInPayload.size !== normalizedMembers.length) {
    throw new ApiError(400, 'Duplicate member emails are not allowed')
  }

  const duplicateUsnInPayload = new Set(normalizedMembers.map((m) => m.usn))
  if (duplicateUsnInPayload.size !== normalizedMembers.length) {
    throw new ApiError(400, 'Duplicate member USNs are not allowed')
  }

  const normalizedTeamName = String(teamName).trim()
  const normalizedLeadEmail = String(leadEmail).trim().toLowerCase()
  const normalizedLeadUsn = String(leadUsn).trim().toUpperCase()
  const safeTeamName = escapeRegex(normalizedTeamName)

  const [
    existingTeamName,
    existingLeadEmail,
    existingLeadUsn,
    existingMemberEmail,
    existingMemberUsn
  ] = await Promise.all([
    Team.findOne({ teamName: { $regex: new RegExp(`^${safeTeamName}$`, 'i') } }),
    Team.findOne({ leadEmail: normalizedLeadEmail }),
    Team.findOne({ leadUsn: normalizedLeadUsn }),
    Team.findOne({ 'members.email': { $in: normalizedMembers.map((m) => m.email) } }),
    Team.findOne({
      $or: [
        { leadUsn: { $in: normalizedMembers.map((m) => m.usn) } },
        { 'members.usn': { $in: normalizedMembers.map((m) => m.usn) } }
      ]
    })
  ])

  if (existingTeamName) {
    throw new ApiError(409, 'Team name is already registered')
  }

  if (existingLeadEmail) {
    throw new ApiError(409, 'Lead email is already registered')
  }

  if (existingLeadUsn) {
    throw new ApiError(409, 'Lead USN is already registered')
  }

  if (existingMemberEmail) {
    throw new ApiError(409, 'One or more member emails already exist in another team')
  }

  if (existingMemberUsn) {
    throw new ApiError(409, 'One or more member USNs already exist in another team')
  }

  const teamNumber = await getNextTeamNumber()
  const defaultPassword = createDefaultTeamPassword(normalizedLeadUsn)
  const passwordHash = await hashPassword(defaultPassword)

  const team = await Team.create({
    teamNumber,
    teamName: normalizedTeamName,
    leadName: String(leadName).trim(),
    leadEmail: normalizedLeadEmail,
    leadUsn: normalizedLeadUsn,
    leadPhone: String(leadPhone).trim(),
    college: String(college).trim(),
    department: String(department).trim(),
    members: normalizedMembers,
    passwordHash,
    passwordHistory: [],
    isDefaultPassword: true,
    passwordChangedAt: null,
    assignedProject: {
      title: '',
      description: '',
      difficulty: '',
      domain: '',
      technologies: []
    },
    customProjectIdea: normalizedCustomProjectIdea,
    profileUpdateRequest: {
      status: 'none'
    },
    registrationStatus: 'pending',
    registrationReviewedAt: null,
    registrationReviewedBy: '',
    registrationReviewNote: '',
    assignedAt: null
  })

  res.status(201).json({
    message: normalizedCustomProjectIdea
      ? 'Registration submitted and custom project idea sent for approval. Wait for admin approval to login.'
      : 'Registration submitted successfully. Wait for admin approval to login.',
    team: toPlainTeam(team)
  })
})

export const reviewTeamRegistrationRequest = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  const action = String(req.body?.action || '').trim().toLowerCase()
  const reviewNote = String(req.body?.reviewNote || '').trim()

  if (!['approve', 'reject'].includes(action)) {
    throw new ApiError(400, 'Action must be approve or reject')
  }

  if (action === 'approve') {
    if (team.registrationStatus === 'approved') {
      throw new ApiError(400, 'Team registration is already approved')
    }

    team.registrationStatus = 'approved'
    team.registrationReviewedAt = new Date()
    team.registrationReviewedBy = String(req.admin?.username || 'admin')
    team.registrationReviewNote = reviewNote

    if (!team.assignedProject?.title && team.customProjectIdea?.status !== 'pending') {
      const assignedProject = await assignRandomProject(team._id)
      if (!assignedProject) {
        throw new ApiError(409, 'Registration approved, but project assignment failed. Please try again')
      }

      team.assignedProject = {
        title: assignedProject.title,
        description: assignedProject.description,
        difficulty: assignedProject.difficulty,
        domain: assignedProject.domain,
        technologies: assignedProject.technologies
      }
      team.assignedAt = assignedProject.assignedAt
    }

    await team.save()

    const approvedTeams = await Team.find(publicApprovedTeamsQuery).sort({ createdAt: -1 }).lean()
    const latestApprovedTeam = approvedTeams[0] || null

    req.app.get('io').emit('team:registered', {
      team: toPlainTeam(team),
      stats: {
        totalTeams: approvedTeams.length,
        latestTeam: latestApprovedTeam
      }
    })

    res.json({
      message: 'Team registration approved',
      team: toPlainTeam(team)
    })
    return
  }

  team.registrationStatus = 'rejected'
  team.registrationReviewedAt = new Date()
  team.registrationReviewedBy = String(req.admin?.username || 'admin')
  team.registrationReviewNote = reviewNote
  await team.save()

  res.json({
    message: 'Team registration rejected',
    team: toPlainTeam(team)
  })
})

export const getAdminTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find().sort({ createdAt: -1 }).lean()
  res.json(teams)
})

export const getRegistrationMigrationSummary = asyncHandler(async (req, res) => {
  const [
    totalTeams,
    approved,
    pending,
    rejected,
    missingStatus,
    pendingWithAssignedProject,
    pendingWithCustomIdea
  ] = await Promise.all([
    Team.countDocuments(),
    Team.countDocuments({ registrationStatus: 'approved' }),
    Team.countDocuments({ registrationStatus: 'pending' }),
    Team.countDocuments({ registrationStatus: 'rejected' }),
    Team.countDocuments({ registrationStatus: { $exists: false } }),
    Team.countDocuments({
      registrationStatus: 'pending',
      'assignedProject.title': { $exists: true, $ne: '' }
    }),
    Team.countDocuments({
      registrationStatus: 'pending',
      'customProjectIdea.status': { $in: ['approved', 'pending'] }
    })
  ])

  res.json({
    totalTeams,
    approved,
    pending,
    rejected,
    missingStatus,
    pendingWithAssignedProject,
    pendingWithCustomIdea
  })
})

export const runRegistrationMigration = asyncHandler(async (req, res) => {
  const mode = String(req.body?.mode || 'missing-only').trim().toLowerCase()
  const targetStatus = String(req.body?.targetStatus || 'approved').trim().toLowerCase()
  const reviewNote = String(req.body?.reviewNote || 'Bulk migration').trim()
  const reviewedBy = String(req.admin?.username || 'admin')

  if (!['approved', 'pending', 'rejected'].includes(targetStatus)) {
    throw new ApiError(400, 'Invalid target status. Use approved, pending, or rejected')
  }

  let filter = { registrationStatus: { $exists: false } }

  if (mode === 'pending-with-assigned') {
    filter = {
      registrationStatus: 'pending',
      'assignedProject.title': { $exists: true, $ne: '' }
    }
  } else if (mode === 'pending-all') {
    filter = { registrationStatus: 'pending' }
  } else if (mode !== 'missing-only') {
    throw new ApiError(400, 'Invalid migration mode')
  }

  const reviewedAt = new Date()
  const update = {
    $set: {
      registrationStatus: targetStatus,
      registrationReviewedAt: reviewedAt,
      registrationReviewedBy: reviewedBy,
      registrationReviewNote: reviewNote || 'Bulk migration'
    }
  }

  const result = await Team.updateMany(filter, update)

  const summary = await Team.countDocuments(publicApprovedTeamsQuery)

  res.json({
    message: 'Registration migration executed',
    mode,
    targetStatus,
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
    approvedVisibleTeams: summary,
    updatedFields: {
      registrationStatus: targetStatus,
      registrationReviewedAt: reviewedAt,
      registrationReviewedBy: reviewedBy,
      registrationReviewNote: reviewNote || 'Bulk migration'
    }
  })
})

export const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find(publicApprovedTeamsQuery).sort({ createdAt: -1 }).lean()
  res.json(teams)
})

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalTeams, latestTeam] = await Promise.all([
    Team.countDocuments(publicApprovedTeamsQuery),
    Team.findOne(publicApprovedTeamsQuery).sort({ createdAt: -1 }).lean()
  ])

  res.json({
    totalTeams,
    latestTeam
  })
})

export const exportTeamsExcel = asyncHandler(async (req, res) => {
  const teams = await Team.find().sort({ createdAt: -1 }).lean()

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Innovation Project Allocation Portal'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Registered Teams')
  worksheet.columns = [
    { header: 'Team Number', key: 'teamNumber', width: 16 },
    { header: 'Team Name', key: 'teamName', width: 24 },
    { header: 'Lead Name', key: 'leadName', width: 24 },
    { header: 'Lead USN', key: 'leadUsn', width: 18 },
    { header: 'Lead Email', key: 'leadEmail', width: 28 },
    { header: 'Lead Phone', key: 'leadPhone', width: 18 },
    { header: 'College', key: 'college', width: 24 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Members', key: 'members', width: 42 },
    { header: 'Assigned Project', key: 'assignedProject', width: 32 },
    { header: 'Custom Idea Title', key: 'customIdeaTitle', width: 28 },
    { header: 'Custom Idea Status', key: 'customIdeaStatus', width: 20 },
    { header: 'Custom Idea Domain', key: 'customIdeaDomain', width: 22 },
    { header: 'Custom Idea Difficulty', key: 'customIdeaDifficulty', width: 20 },
    { header: 'Custom Idea Technologies', key: 'customIdeaTechnologies', width: 34 },
    { header: 'Assigned At', key: 'assignedAt', width: 24 },
    { header: 'Registered At', key: 'createdAt', width: 24 }
  ]

  worksheet.getRow(1).font = { bold: true }

  teams.forEach((team) => {
    worksheet.addRow({
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      leadName: team.leadName,
      leadUsn: team.leadUsn,
      leadEmail: team.leadEmail,
      leadPhone: team.leadPhone,
      college: team.college,
      department: team.department,
      members: team.members
        .map((member) => `${member.name} (${member.usn}) <${member.email}>`)
        .join('; '),
      assignedProject: team.assignedProject?.title || '-',
      customIdeaTitle: team.customProjectIdea?.title || '-',
      customIdeaStatus: team.customProjectIdea?.status || '-',
      customIdeaDomain: team.customProjectIdea?.domain || '-',
      customIdeaDifficulty: team.customProjectIdea?.difficulty || '-',
      customIdeaTechnologies: Array.isArray(team.customProjectIdea?.technologies)
        ? team.customProjectIdea.technologies.join(', ')
        : '-',
      assignedAt: team.assignedAt ? new Date(team.assignedAt).toLocaleString() : '-',
      createdAt: team.createdAt ? new Date(team.createdAt).toLocaleString() : '-'
    })
  })

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', 'attachment; filename=innovation-project-teams.xlsx')

  await workbook.xlsx.write(res)
  res.end()
})

export const submitProfileUpdateRequest = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.team.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  if (team.profileUpdateRequest?.status === 'pending') {
    throw new ApiError(409, 'A profile update request is already pending approval')
  }

  const normalizedProfile = normalizeProfileUpdatePayload(req.body)
  await assertProfileUpdateUniqueness(team._id, normalizedProfile)

  team.profileUpdateRequest = {
    status: 'pending',
    payload: normalizedProfile,
    requestedAt: new Date(),
    recalledAt: null,
    reviewedAt: null,
    reviewedBy: '',
    reviewNote: ''
  }

  await team.save()

  res.json({
    message: 'Profile update request submitted for admin approval',
    team: toPlainTeam(team)
  })
})

export const recallProfileUpdateRequest = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.team.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  if (team.profileUpdateRequest?.status !== 'pending') {
    throw new ApiError(400, 'No pending profile update request to recall')
  }

  team.profileUpdateRequest.status = 'recalled'
  team.profileUpdateRequest.recalledAt = new Date()
  team.profileUpdateRequest.reviewedAt = null
  team.profileUpdateRequest.reviewedBy = ''
  await team.save()

  res.json({
    message: 'Profile update request recalled successfully',
    team: toPlainTeam(team)
  })
})

export const submitCustomProjectIdeaRequest = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.team.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  if (team.customProjectIdea?.status === 'pending') {
    throw new ApiError(409, 'A custom project idea is already pending approval')
  }

  const normalizedCustomProjectIdea = normalizeCustomProjectIdea(req.body)
  if (!normalizedCustomProjectIdea) {
    throw new ApiError(
      400,
      'Custom project idea requires title, description, difficulty, domain, and technologies'
    )
  }

  team.customProjectIdea = normalizedCustomProjectIdea
  await team.save()

  res.json({
    message: 'Custom project idea submitted for admin approval',
    team: toPlainTeam(team)
  })
})

export const submitTeamGithubRepository = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.team.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  const githubRepoUrl = String(req.body?.githubRepoUrl || '').trim()
  if (!githubRepoUrl) {
    throw new ApiError(400, 'GitHub repository URL is required')
  }

  if (!isGithubRepoUrl(githubRepoUrl)) {
    throw new ApiError(400, 'Enter a valid GitHub repository URL')
  }

  const previousUrl = String(team.githubRepoUrl || '').trim()
  team.githubRepoUrl = githubRepoUrl

  if (!previousUrl || previousUrl.toLowerCase() !== githubRepoUrl.toLowerCase()) {
    team.collaborationStatus = 'pending'
    team.collaborationMarkedAt = null
    team.collaborationMarkedBy = ''
  }

  await team.save()

  res.json({
    message: 'GitHub repository URL saved. Collaboration status is pending until admin confirms.',
    team: toPlainTeam(team)
  })
})

export const reviewTeamGithubCollaboration = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  const status = String(req.body?.status || '').trim().toLowerCase()
  if (!['pending', 'collaborated'].includes(status)) {
    throw new ApiError(400, 'Status must be pending or collaborated')
  }

  if (team.collaborationStatus === status) {
    throw new ApiError(
      400,
      status === 'collaborated'
        ? 'Team is already marked as collaborated. Ask team to resubmit URL to review again.'
        : 'Team is already in pending collaboration state'
    )
  }

  team.collaborationStatus = status
  team.collaborationMarkedAt = new Date()
  team.collaborationMarkedBy = String(req.admin?.username || 'admin')
  await team.save()

  res.json({
    message: status === 'collaborated'
      ? 'Team marked as collaborated'
      : 'Team moved back to pending collaboration',
    team: toPlainTeam(team)
  })
})

export const reviewProfileUpdateRequest = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  const action = String(req.body?.action || '').trim().toLowerCase()
  const reviewNote = String(req.body?.reviewNote || '').trim()

  if (!['approve', 'reject'].includes(action)) {
    throw new ApiError(400, 'Action must be approve or reject')
  }

  if (team.profileUpdateRequest?.status !== 'pending') {
    throw new ApiError(400, 'There is no pending profile update request for this team')
  }

  const requestedPayload = normalizeProfileUpdatePayload(team.profileUpdateRequest.payload || {})

  if (action === 'approve') {
    await assertProfileUpdateUniqueness(team._id, requestedPayload)

    const previousLeadUsn = String(team.leadUsn || '').trim().toUpperCase()
    const nextLeadUsn = requestedPayload.leadUsn

    team.teamName = requestedPayload.teamName
    team.leadName = requestedPayload.leadName
    team.leadEmail = requestedPayload.leadEmail
    team.leadUsn = requestedPayload.leadUsn
    team.leadPhone = requestedPayload.leadPhone
    team.college = requestedPayload.college
    team.department = requestedPayload.department
    team.members = requestedPayload.members

    if (team.isDefaultPassword && previousLeadUsn !== nextLeadUsn) {
      const nextDefaultPassword = createDefaultTeamPassword(nextLeadUsn)
      team.passwordHash = await hashPassword(nextDefaultPassword)
      team.passwordHistory = []
      team.passwordChangedAt = null
    }

    team.profileUpdateRequest.status = 'approved'
    team.profileUpdateRequest.reviewedAt = new Date()
    team.profileUpdateRequest.reviewedBy = String(req.admin?.username || 'admin')
    team.profileUpdateRequest.reviewNote = reviewNote

    await team.save()

    res.json({
      message: 'Profile update request approved and applied',
      team: toPlainTeam(team)
    })
    return
  }

  team.profileUpdateRequest.status = 'rejected'
  team.profileUpdateRequest.reviewedAt = new Date()
  team.profileUpdateRequest.reviewedBy = String(req.admin?.username || 'admin')
  team.profileUpdateRequest.reviewNote = reviewNote
  await team.save()

  res.json({
    message: 'Profile update request rejected',
    team: toPlainTeam(team)
  })
})

export const reviewCustomProjectIdeaRequest = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId)
  if (!team) {
    throw new ApiError(404, 'Team not found')
  }

  const action = String(req.body?.action || '').trim().toLowerCase()
  if (!['approve', 'reject'].includes(action)) {
    throw new ApiError(400, 'Action must be approve or reject')
  }

  const customIdea = team.customProjectIdea || null
  if (!customIdea?.title) {
    throw new ApiError(400, 'This team has not submitted a custom project idea')
  }

  if (customIdea.status !== 'pending') {
    throw new ApiError(400, 'There is no pending custom project idea for this team')
  }

  if (action === 'approve') {
    await upsertApprovedIdeaIntoProjectPool(customIdea)

    team.customProjectIdea.status = 'approved'
    team.assignedProject = {
      title: customIdea.title,
      description: customIdea.description,
      difficulty: customIdea.difficulty,
      domain: customIdea.domain,
      technologies: Array.isArray(customIdea.technologies)
        ? customIdea.technologies
        : []
    }
    team.assignedAt = new Date()
    await team.save()

    res.json({
      message: 'Custom project idea approved and assigned to team',
      team: toPlainTeam(team)
    })
    return
  }

  team.customProjectIdea.status = 'rejected'

  // On rejection, assign a random project so the team can proceed.
  const assignedProject = await assignRandomProject(team._id)
  if (!assignedProject) {
    throw new ApiError(409, 'Custom idea rejected, but project assignment failed. Please try again')
  }

  team.assignedProject = {
    title: assignedProject.title,
    description: assignedProject.description,
    difficulty: assignedProject.difficulty,
    domain: assignedProject.domain,
    technologies: assignedProject.technologies
  }
  team.assignedAt = assignedProject.assignedAt
  await team.save()

  res.json({
    message: 'Custom project idea rejected and random project assigned',
    team: toPlainTeam(team)
  })
})

/**
 * Bulk update College values for selected teams
 */
export const bulkUpdateTeams = asyncHandler(async (req, res) => {
  const { teamIds, field, value, college, department } = req.body

  const normalizedField = String(field || '').trim().toLowerCase()
  const targetField = normalizedField || (String(department || '').trim() ? 'department' : 'college')
  const allowedFields = new Set(['college', 'department'])

  if (!allowedFields.has(targetField)) {
    throw new ApiError(400, 'Field must be either college or department.')
  }

  const rawValue = value || (targetField === 'department' ? department : college)
  const normalizedValue = String(rawValue || '').trim()

  if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
    throw new ApiError(400, 'Team IDs are required and must be an array.')
  }

  if (!normalizedValue) {
    throw new ApiError(400, `${targetField} value is required and must be a string.`)
  }

  const allowedValue = await RegistrationLookup.findOne({
    type: targetField,
    normalizedLabel: normalizedValue.toLowerCase(),
    active: true
  })
    .select({ label: 1 })
    .lean()

  if (!allowedValue?.label) {
    throw new ApiError(400, `${targetField} must be selected from Directory values only.`)
  }

  const updatedTeams = await Team.updateMany(
    { _id: { $in: teamIds } },
    { $set: { [targetField]: allowedValue.label } },
    { multi: true }
  )

  const modifiedCount = Number(updatedTeams?.modifiedCount || updatedTeams?.nModified || 0)

  res.status(200).json({
    message: `${modifiedCount} teams updated successfully for ${targetField}.`
  })
})
