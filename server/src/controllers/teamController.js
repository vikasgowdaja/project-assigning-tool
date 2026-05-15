import { Team } from '../models/Team.js'
import { Project } from '../models/Project.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { getNextTeamNumber } from '../services/teamNumberService.js'
import { assignRandomProject, getProjectStats } from '../services/projectService.js'
import ExcelJS from 'exceljs'

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isPhone = (value) => /^\+?[0-9]{10,15}$/.test(value)
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeMembers = (members = []) => {
  return members
    .map((member) => ({
      name: String(member.name || '').trim(),
      usn: String(member.usn || '').trim().toUpperCase(),
      email: String(member.email || '').trim().toLowerCase()
    }))
    .filter((member) => member.name && member.usn && member.email)
}

const toPlainTeam = (team) => (team.toObject ? team.toObject() : team)

// ADMIN: Delete a team and return project to pool
export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
  if (!team) throw new ApiError(404, 'Team not found')

  if (team.assignedProject?.title) {
    await Project.updateOne(
      { title: team.assignedProject.title },
      { $set: { assigned: false, assignedTo: null, assignedAt: null } }
    )
  }

  await team.deleteOne()
  res.json({ message: 'Team deleted' })
})

// ADMIN: Update team details, including reassignment of project by title
export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
  if (!team) throw new ApiError(404, 'Team not found')

  const updatableFields = [
    'teamName',
    'leadName',
    'leadEmail',
    'leadUsn',
    'leadPhone',
    'college',
    'department'
  ]

  updatableFields.forEach((field) => {
    if (req.body[field] === undefined) return
    const value = String(req.body[field]).trim()

    if (field === 'leadEmail') {
      team[field] = value.toLowerCase()
      return
    }

    if (field === 'leadUsn') {
      team[field] = value.toUpperCase()
      return
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

      if (nextProject.assigned && String(nextProject.assignedTo) !== String(team._id)) {
        throw new ApiError(409, 'Selected project is already assigned to another team')
      }

      if (currentTitle) {
        await Project.updateOne(
          { title: currentTitle },
          { $set: { assigned: false, assignedTo: null, assignedAt: null } }
        )
      }

      const assignedAt = new Date()
      await Project.updateOne(
        { _id: nextProject._id },
        { $set: { assigned: true, assignedTo: team._id, assignedAt } }
      )

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

export const registerTeam = asyncHandler(async (req, res) => {
  const {
    teamName,
    leadName,
    leadEmail,
    leadUsn,
    leadPhone,
    college,
    department,
    members
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
    }),
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
    assignedProject: {
      title: '',
      description: '',
      difficulty: '',
      domain: '',
      technologies: []
    },
    assignedAt: new Date()
  })

  const assignedProject = await assignRandomProject(team._id)
  if (!assignedProject) {
    await Team.deleteOne({ _id: team._id })
    throw new ApiError(409, 'Project assignment failed. Please try again')
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

  const teamData = toPlainTeam(team)

  const [projectStats, totalTeams] = await Promise.all([
    getProjectStats(),
    Team.countDocuments()
  ])

  req.app.get('io').emit('team:registered', {
    team: teamData,
    stats: {
      ...projectStats,
      totalTeams,
      latestTeam: teamData
    }
  })

  res.status(201).json({
    message: 'Registration successful',
    team: teamData
  })
})

export const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find().sort({ createdAt: -1 }).lean()
  res.json(teams)
})

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalTeams, latestTeam, projectStats] = await Promise.all([
    Team.countDocuments(),
    Team.findOne().sort({ createdAt: -1 }).lean(),
    getProjectStats()
  ])

  res.json({
    totalTeams,
    latestTeam,
    ...projectStats
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
