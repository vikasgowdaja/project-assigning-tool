import { Project } from '../models/Project.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { getProjectStats } from '../services/projectService.js'

const normalizeTechnologies = (technologies = []) => {
  if (!Array.isArray(technologies)) {
    return []
  }

  return technologies
    .map((technology) => String(technology || '').trim())
    .filter(Boolean)
}

export const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find().sort({ title: 1 }).lean()
  res.json(projects)
})

export const createProject = asyncHandler(async (req, res) => {
  const { title, description, difficulty, domain, technologies } = req.body

  if (!title || !description || !difficulty || !domain) {
    throw new ApiError(400, 'Please fill all required project fields')
  }

  const normalizedTitle = String(title).trim()
  const existingProject = await Project.findOne({
    title: { $regex: new RegExp(`^${normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
  })

  if (existingProject) {
    throw new ApiError(409, 'Project title already exists')
  }

  const project = await Project.create({
    title: normalizedTitle,
    description: String(description).trim(),
    difficulty: String(difficulty).trim(),
    domain: String(domain).trim(),
    technologies: normalizeTechnologies(technologies),
    assigned: false,
    assignedTo: null,
    assignedAt: null
  })

  res.status(201).json({
    message: 'Project stored in database',
    project
  })
})

export const getProjectSummary = asyncHandler(async (req, res) => {
  const summary = await getProjectStats()
  res.json(summary)
})
