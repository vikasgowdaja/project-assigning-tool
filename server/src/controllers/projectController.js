import { Project } from '../models/Project.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { getProjectStats } from '../services/projectService.js'
import ExcelJS from 'exceljs'
import { PDFParse } from 'pdf-parse'

const allowedDifficulties = new Set(['easy', 'medium', 'hard'])

const normalizeHeader = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const resolveHeaderKey = (rawHeader) => {
  const header = normalizeHeader(rawHeader)
  if (!header) return null

  if (['title', 'projecttitle', 'projectname', 'name'].includes(header)) return 'title'
  if (['description', 'desc', 'projectdescription'].includes(header)) return 'description'
  if (['difficulty', 'level', 'difficultylevel'].includes(header)) return 'difficulty'
  if (['domain', 'category', 'problemdomain'].includes(header)) return 'domain'
  if (['technologies', 'technology', 'tech', 'techstack', 'stack'].includes(header)) {
    return 'technologies'
  }

  return null
}

const normalizeTechnologies = (technologies = []) => {
  if (!Array.isArray(technologies)) {
    return []
  }

  return technologies
    .map((technology) => String(technology || '').trim())
    .filter(Boolean)
}

const normalizeDifficulty = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'easy') return 'Easy'
  if (normalized === 'hard') return 'Hard'
  return 'Medium'
}

const validateRecord = (record = {}) => {
  const title = String(record.title || '').trim()
  const description = String(record.description || '').trim()
  const domain = String(record.domain || '').trim()
  const difficultyRaw = String(record.difficulty || '').trim().toLowerCase()
  const errors = []

  if (!title) {
    errors.push('title is required')
  }

  if (!description) {
    errors.push('description is required')
  }

  if (!domain) {
    errors.push('domain is required')
  }

  if (difficultyRaw && !allowedDifficulties.has(difficultyRaw)) {
    errors.push('difficulty must be Easy, Medium, or Hard')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

const normalizeRecord = (record = {}) => {
  const title = String(record.title || '').trim()
  const description = String(record.description || '').trim() || 'Project imported by admin.'
  const domain = String(record.domain || '').trim() || 'General'

  if (!title) {
    return null
  }

  return {
    title,
    description,
    difficulty: normalizeDifficulty(record.difficulty),
    domain,
    technologies: Array.isArray(record.technologies)
      ? normalizeTechnologies(record.technologies)
      : normalizeTechnologies(String(record.technologies || '').split(',')),
    assigned: false,
    assignedTo: null,
    assignedAt: null
  }
}

const insertUniqueProjects = async (rawRecords = []) => {
  const normalized = rawRecords.map(normalizeRecord).filter(Boolean)
  if (normalized.length === 0) {
    return { insertedCount: 0, skippedCount: 0, projects: [] }
  }

  const existingProjects = await Project.find().select('title').lean()
  const existingTitles = new Set(existingProjects.map((project) => project.title.toLowerCase()))

  const incomingUnique = []
  const incomingTitles = new Set()

  for (const project of normalized) {
    const key = project.title.toLowerCase()
    if (existingTitles.has(key) || incomingTitles.has(key)) {
      continue
    }

    incomingTitles.add(key)
    incomingUnique.push(project)
  }

  if (incomingUnique.length === 0) {
    return { insertedCount: 0, skippedCount: normalized.length, projects: [] }
  }

  const inserted = await Project.insertMany(incomingUnique)
  return {
    insertedCount: inserted.length,
    skippedCount: normalized.length - inserted.length,
    projects: inserted
  }
}

const parseUploadFile = async (file) => {
  if (!file) {
    throw new ApiError(400, 'Upload file is required')
  }

  const fileName = String(file.originalname || '').toLowerCase()

  if (fileName.endsWith('.xlsx')) {
    return parseExcelBuffer(file.buffer)
  }

  if (fileName.endsWith('.pdf')) {
    return parsePdfBuffer(file.buffer)
  }

  throw new ApiError(400, 'Unsupported file type. Use .xlsx or .pdf')
}

const buildUploadPreview = async (rawRecords = []) => {
  const existingProjects = await Project.find().select('title').lean()
  const existingTitles = new Set(existingProjects.map((project) => project.title.toLowerCase()))
  const seenIncoming = new Set()

  const validRows = []
  const invalidRows = []

  rawRecords.forEach((row, index) => {
    const rowNumber = index + 2
    const candidate = normalizeRecord(row)
    const validation = validateRecord(row)

    if (!validation.isValid || !candidate) {
      invalidRows.push({
        rowNumber,
        title: String(row.title || ''),
        errors: validation.errors.length > 0 ? validation.errors : ['invalid row']
      })
      return
    }

    const key = candidate.title.toLowerCase()
    if (existingTitles.has(key)) {
      invalidRows.push({
        rowNumber,
        title: candidate.title,
        errors: ['title already exists in database']
      })
      return
    }

    if (seenIncoming.has(key)) {
      invalidRows.push({
        rowNumber,
        title: candidate.title,
        errors: ['duplicate title in uploaded file']
      })
      return
    }

    seenIncoming.add(key)
    validRows.push({
      rowNumber,
      project: candidate
    })
  })

  return {
    totalRows: rawRecords.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows
  }
}

const parseExcelBuffer = async (buffer) => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new ApiError(400, 'Excel file does not contain any worksheet')
  }

  const rows = []
  const headerRow = worksheet.getRow(1)
  const headers = headerRow.values
    .slice(1)
    .map((header) => String(header || '').trim())

  const keyByIndex = headers.map(resolveHeaderKey)

  if (!keyByIndex.includes('title')) {
    throw new ApiError(
      400,
      'Excel headers are invalid. Include at least a title column (for example: title, project title).'
    )
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const values = row.values.slice(1)
    const record = {}
    values.forEach((value, index) => {
      const key = keyByIndex[index]
      if (!key) return
      record[key] = typeof value === 'object' && value?.text ? value.text : String(value || '').trim()
    })

    const isRowEmpty = Object.values(record).every((value) => !String(value || '').trim())
    if (isRowEmpty) {
      return
    }

    rows.push(record)
  })

  return rows
}

const parsePdfBuffer = async (buffer) => {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()

  const lines = String(result.text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  // Expected format per line:
  // title | description | difficulty | domain | tech1,tech2
  return lines.map((line) => {
    const [title, description, difficulty, domain, technologies] = line.split('|').map((part) => part?.trim() || '')
    return {
      title,
      description,
      difficulty,
      domain,
      technologies
    }
  })
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

export const bulkUploadProjects = asyncHandler(async (req, res) => {
  const records = await parseUploadFile(req.file)
  const preview = await buildUploadPreview(records)

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

  const result = await insertUniqueProjects(preview.validRows.map((row) => row.project))
  const sourceRowByTitle = new Map(
    preview.validRows.map((row) => [String(row.project.title || '').toLowerCase(), row.rowNumber])
  )
  const loadedProjects = (result.projects || []).map((project) => ({
    rowNumber: sourceRowByTitle.get(String(project.title || '').toLowerCase()) || null,
    title: project.title,
    description: project.description,
    difficulty: project.difficulty,
    domain: project.domain,
    technologies: project.technologies || []
  }))

  res.status(201).json({
    message: 'Project upload processed successfully',
    totalRows: preview.totalRows,
    validCount: preview.validCount,
    invalidCount: preview.invalidCount,
    invalidRows: preview.invalidRows.slice(0, 50),
    loadedProjects,
    ...result
  })
})

export const previewProjectsUpload = asyncHandler(async (req, res) => {
  const records = await parseUploadFile(req.file)
  const preview = await buildUploadPreview(records)

  res.json({
    message: 'Upload preview generated',
    totalRows: preview.totalRows,
    validCount: preview.validCount,
    invalidCount: preview.invalidCount,
    invalidRows: preview.invalidRows.slice(0, 100),
    validRows: preview.validRows.slice(0, 200).map((row) => ({
      rowNumber: row.rowNumber,
      ...row.project
    }))
  })
})

export const downloadProjectTemplate = asyncHandler(async (req, res) => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Projects')

  worksheet.columns = [
    { header: 'title', key: 'title', width: 40 },
    { header: 'description', key: 'description', width: 60 },
    { header: 'difficulty', key: 'difficulty', width: 14 },
    { header: 'domain', key: 'domain', width: 22 },
    { header: 'technologies', key: 'technologies', width: 35 }
  ]

  worksheet.getRow(1).font = { bold: true }
  worksheet.addRow({
    title: 'AI Career Mentor',
    description: 'Guides students with career path recommendations.',
    difficulty: 'Medium',
    domain: 'Education',
    technologies: 'React,Node.js,MongoDB'
  })
  worksheet.addRow({
    title: 'Rural Health Assistant',
    description: 'Helps identify symptoms and nearby clinics.',
    difficulty: 'Easy',
    domain: 'Healthcare',
    technologies: 'Python,FastAPI,PostgreSQL'
  })

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', 'attachment; filename=project-upload-template.xlsx')
  await workbook.xlsx.write(res)
  res.end()
})

export const getProjectSummary = asyncHandler(async (req, res) => {
  const summary = await getProjectStats()
  res.json(summary)
})
