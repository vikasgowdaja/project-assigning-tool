import ExcelJS from 'exceljs'
import { formatDateTime } from './date'

const deriveBatchYear = (usn) => {
  if (!usn || usn.length < 5) return ''
  const part = usn.substring(3, 5)
  return /^\d{2}$/.test(part) ? `20${part}` : ''
}

export const FIELD_GROUPS = [
  {
    group: 'Team',
    fields: [
      { key: 'teamNumber', label: 'Team Number', defaultOn: true },
      { key: 'teamName', label: 'Team Name', defaultOn: true },
      { key: 'college', label: 'College', defaultOn: true },
      { key: 'department', label: 'Department', defaultOn: true }
    ]
  },
  {
    group: 'Lead',
    fields: [
      { key: 'leadName', label: 'Lead Name', defaultOn: true },
      { key: 'leadEmail', label: 'Lead Email', defaultOn: true },
      { key: 'leadUsn', label: 'Lead USN', defaultOn: true },
      { key: 'leadPhone', label: 'Lead Phone', defaultOn: false }
    ]
  },
  {
    group: 'Project',
    fields: [
      { key: 'assignedProject', label: 'Assigned Project', defaultOn: true },
      { key: 'projectDomain', label: 'Project Domain', defaultOn: false },
      { key: 'projectDifficulty', label: 'Project Difficulty', defaultOn: false },
      { key: 'projectTechnologies', label: 'Project Technologies', defaultOn: false }
    ]
  },
  {
    group: 'Status',
    fields: [
      { key: 'registrationStatus', label: 'Registration Status', defaultOn: true },
      { key: 'collaborationStatus', label: 'Collaboration Status', defaultOn: false },
      { key: 'githubRepoUrl', label: 'GitHub Repo URL', defaultOn: false }
    ]
  },
  {
    group: 'Academic',
    fields: [{ key: 'batchYear', label: 'Batch Year (from USN)', defaultOn: false }]
  },
  {
    group: 'Members',
    fields: Array.from({ length: 6 }, (_, i) => ({
      key: `member${i + 1}`,
      label: `Member ${i + 1}`,
      defaultOn: i < 2
    }))
  },
  {
    group: 'Meta',
    fields: [{ key: 'registeredAt', label: 'Registered At', defaultOn: false }]
  }
]

export const ALL_FIELD_KEYS = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key))

export const DEFAULT_SELECTED = new Set(
  FIELD_GROUPS.flatMap((g) => g.fields.filter((f) => f.defaultOn).map((f) => f.key))
)

export const sanitizeSheetName = (name) => name.replace(/[\\/*?:[\]]/g, '_').substring(0, 31)

export const buildRowForKeys = (team, orderedKeys) => {
  const members = team.members || []
  const row = {}

  for (const key of orderedKeys) {
    switch (key) {
      case 'teamNumber':
        row['Team Number'] = team.teamNumber || ''
        break
      case 'teamName':
        row['Team Name'] = team.teamName || ''
        break
      case 'college':
        row['College'] = team.college || ''
        break
      case 'department':
        row['Department'] = team.department || ''
        break
      case 'leadName':
        row['Lead Name'] = team.leadName || ''
        break
      case 'leadEmail':
        row['Lead Email'] = team.leadEmail || ''
        break
      case 'leadUsn':
        row['Lead USN'] = team.leadUsn || ''
        break
      case 'leadPhone':
        row['Lead Phone'] = team.leadPhone || ''
        break
      case 'registrationStatus':
        row['Registration Status'] = team.registrationStatus || ''
        break
      case 'collaborationStatus':
        row['Collaboration Status'] = team.collaborationStatus || ''
        break
      case 'githubRepoUrl':
        row['GitHub Repo URL'] = team.githubRepoUrl || ''
        break
      case 'assignedProject':
        row['Assigned Project'] =
          team.assignedProject?.title ||
          (team.customProjectIdea?.title ? `${team.customProjectIdea.title} (Pending)` : '')
        break
      case 'projectDomain':
        row['Project Domain'] = team.assignedProject?.domain || ''
        break
      case 'projectDifficulty':
        row['Project Difficulty'] = team.assignedProject?.difficulty || ''
        break
      case 'projectTechnologies':
        row['Project Technologies'] = (team.assignedProject?.technologies || []).join(', ')
        break
      case 'batchYear':
        row['Batch Year'] = deriveBatchYear(team.leadUsn)
        break
      case 'registeredAt':
        row['Registered At'] = formatDateTime(team.createdAt)
        break
      default: {
        const memberMatch = key.match(/^member(\d+)$/)
        if (memberMatch) {
          const idx = parseInt(memberMatch[1], 10) - 1
          const m = members[idx]
          row[`Member ${idx + 1} Name`] = m?.name || ''
          row[`Member ${idx + 1} USN`] = m?.usn || ''
          row[`Member ${idx + 1} Email`] = m?.email || ''
        }
      }
    }
  }

  return row
}

export const STYLED_TEMPLATE_FIELDS = [
  { key: 'teamId', header: 'Team ID', width: 12, common: true, align: 'center' },
  { key: 'teamName', header: 'Team Name', width: 22, common: true, align: 'left' },
  { key: 'teamLead', header: 'Team Lead', width: 20, common: true, align: 'left' },
  { key: 'projectName', header: 'Project Name', width: 32, common: true, align: 'left' },
  { key: 'teamGithub', header: 'GitHub URL', width: 30, common: true, align: 'left' },
  { key: 'college', header: 'College', width: 28, common: true, align: 'left' },
  { key: 'department', header: 'Department', width: 18, common: true, align: 'center' },
  { key: 'mentor', header: 'Mentor', width: 18, common: true, align: 'left' },
  { key: 'submissionDate', header: 'Submission Date', width: 18, common: true, align: 'center' },
  { key: 'role', header: 'Role', width: 12, common: false, align: 'center' },
  { key: 'memberName', header: 'Member Name', width: 22, common: false, align: 'left' },
  { key: 'usn', header: 'USN / Roll No', width: 16, common: false, align: 'center' },
  { key: 'memberEmail', header: 'Member Email', width: 30, common: false, align: 'left' },
  { key: 'phone', header: 'Phone', width: 16, common: false, align: 'center' },
  { key: 'individualGithub', header: 'Individual GitHub', width: 30, common: false, align: 'left' }
]

export const STYLED_TEMPLATE_DEFAULT_SELECTED = STYLED_TEMPLATE_FIELDS.map((field) => field.key)
export const STYLED_TEMPLATE_DEFAULT_COMMON = STYLED_TEMPLATE_FIELDS
  .filter((field) => field.common)
  .map((field) => field.key)

const toTitleCase = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, (ch) => ch.toUpperCase())

const normalizeCollege = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '')
  const pesAliases = [
    'pesce',
    'pescollegeofengineering',
    'pcollegeofengineering',
    'pescollege',
    'pescemandya',
    'pescollegeengineering'
  ]

  if (pesAliases.some((alias) => compact.includes(alias)) || compact.startsWith('pes')) {
    return 'PES College of Engineering, Mandya'
  }

  return toTitleCase(raw)
}

const normalizeDepartment = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (['cse', 'cs', 'csande', 'computerscience', 'computerscienceengineering'].includes(compact)) {
    return 'Computer Science and Engineering'
  }
  if (['ise', 'information science', 'informationscienceengineering', 'it'].includes(compact)) {
    return 'Information Science and Engineering'
  }

  return toTitleCase(raw)
}

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase()

const resolveTeamMentor = (team) => {
  const mentor =
    team.mentorName || team.mentor || team.projectMentor || team.assignedProject?.mentor || team.guide
  return mentor ? toTitleCase(mentor) : ''
}

const resolveSubmissionDate = (team) => {
  const dateValue = team.submissionDate || team.assignedAt || team.updatedAt || team.createdAt
  return dateValue ? formatDateTime(dateValue) : ''
}

const resolveProjectTitle = (team) =>
  team.assignedProject?.title ||
  (team.customProjectIdea?.title ? `${team.customProjectIdea.title} (Pending)` : '-')

const toMemberRows = (team) => {
  const lead = {
    role: 'Team Lead',
    memberName: toTitleCase(team.leadName || ''),
    usn: String(team.leadUsn || '').toUpperCase(),
    memberEmail: normalizeEmail(team.leadEmail || ''),
    phone: String(team.leadPhone || ''),
    individualGithub: String(team.leadGithubUrl || team.leadGithub || '')
  }

  const leadUsn = lead.usn
  const members = (team.members || [])
    .filter((m) => String(m?.usn || '').toUpperCase() !== leadUsn)
    .map((m) => ({
      role: 'Member',
      memberName: toTitleCase(m?.name || ''),
      usn: String(m?.usn || '').toUpperCase(),
      memberEmail: normalizeEmail(m?.email || ''),
      phone: String(m?.phone || ''),
      individualGithub: String(m?.githubUrl || m?.github || '')
    }))

  return [lead, ...(members.length ? members : [{ role: 'Member', memberName: '', usn: '', memberEmail: '', phone: '', individualGithub: '' }])]
}

const ACCENT_PALETTE = [
  { accent: 'FF1D4ED8', light: 'FFEAF1FF' },
  { accent: 'FF7C3AED', light: 'FFF1EBFF' },
  { accent: 'FF0F766E', light: 'FFE8F8F6' },
  { accent: 'FFB45309', light: 'FFFFF5E9' },
  { accent: 'FFBE123C', light: 'FFFFEBEF' },
  { accent: 'FF0369A1', light: 'FFE9F6FF' },
  { accent: 'FF15803D', light: 'FFEAF9ED' },
  { accent: 'FFC2410C', light: 'FFFFF0E8' }
]

const baseFont = { name: 'Calibri', size: 10, color: { argb: 'FF111827' } }
const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
const titleFont = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }

const buildBorder = (argb) => ({
  top: { style: 'thin', color: { argb } },
  left: { style: 'thin', color: { argb } },
  bottom: { style: 'thin', color: { argb } },
  right: { style: 'thin', color: { argb } }
})

const setColumnWidths = (worksheet, columns) => {
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width
  })
}

const addTitleAndHeaderRows = (worksheet, columns) => {
  const title = 'Innovation Project Teams - Consolidated Member Sheet'
  const lastColumn = columns.length

  worksheet.mergeCells(1, 1, 1, lastColumn)
  const titleCell = worksheet.getCell(1, 1)
  titleCell.value = title
  titleCell.font = titleFont
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.border = buildBorder('FF334155')
  worksheet.getRow(1).height = 24

  columns.forEach((col, idx) => {
    const cell = worksheet.getCell(2, idx + 1)
    cell.value = col.header
    cell.font = headerFont
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = buildBorder('FF314774')
  })
  worksheet.getRow(2).height = 22
}

const getTeamLevelValue = (team, key) => {
  switch (key) {
    case 'teamId':
      return team.teamNumber || ''
    case 'teamName':
      return toTitleCase(team.teamName || '')
    case 'teamLead':
      return toTitleCase(team.leadName || '')
    case 'projectName':
      return resolveProjectTitle(team)
    case 'teamGithub':
      return String(team.githubRepoUrl || '').trim()
    case 'college':
      return normalizeCollege(team.college || '')
    case 'department':
      return normalizeDepartment(team.department || '')
    case 'mentor':
      return resolveTeamMentor(team)
    case 'submissionDate':
      return resolveSubmissionDate(team)
    default:
      return ''
  }
}

const getMemberLevelValue = (member, key) => {
  switch (key) {
    case 'role':
      return member.role || ''
    case 'memberName':
      return member.memberName || ''
    case 'usn':
      return member.usn || ''
    case 'memberEmail':
      return member.memberEmail || ''
    case 'phone':
      return member.phone || ''
    case 'individualGithub':
      return member.individualGithub || ''
    default:
      return ''
  }
}

const getValueForField = (team, member, key) => {
  const teamValue = getTeamLevelValue(team, key)
  if (teamValue !== '') {
    return teamValue
  }
  return getMemberLevelValue(member, key)
}

const applyCellBaseStyle = (cell, fillColor, borderColor, align = 'center') => {
  cell.font = baseFont
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
  cell.border = buildBorder(borderColor)
  cell.alignment = { horizontal: align, vertical: 'middle', wrapText: true }
}

const applyMergedCommonCells = (worksheet, startRow, endRow, commonColumnIndexes) => {
  if (endRow <= startRow) return
  commonColumnIndexes.forEach((colIdx) => {
    worksheet.mergeCells(startRow, colIdx, endRow, colIdx)
  })
}

const populateStyledRows = (worksheet, teams, columns, commonFieldKeys) => {
  const commonSet = new Set(commonFieldKeys)
  const commonColumnIndexes = columns
    .map((col, idx) => (commonSet.has(col.key) ? idx + 1 : -1))
    .filter((idx) => idx !== -1)

  let rowPointer = 3

  teams.forEach((team, teamIndex) => {
    const palette = ACCENT_PALETTE[teamIndex % ACCENT_PALETTE.length]
    const members = toMemberRows(team)
    const leadMember = members[0] || {
      role: 'Team Lead',
      memberName: '',
      usn: '',
      memberEmail: '',
      phone: '',
      individualGithub: ''
    }
    const teamStartRow = rowPointer

    members.forEach((member, memberIndex) => {
      const rowNum = rowPointer
      const isLead = member.role === 'Team Lead'
      const background = isLead
        ? palette.light
        : memberIndex % 2 === 0
          ? 'FFFFFFFF'
          : palette.light

      columns.forEach((col, colIndex) => {
        const colNum = colIndex + 1
        const cell = worksheet.getCell(rowNum, colNum)
        const isCommon = commonSet.has(col.key)

        if (isCommon) {
          cell.value = getValueForField(team, leadMember, col.key)
          applyCellBaseStyle(cell, palette.light, palette.accent, 'center')
        } else {
          cell.value = getValueForField(team, member, col.key)
          const align = col.align || 'left'
          applyCellBaseStyle(cell, background, palette.accent, align)

          if (col.key === 'role') {
            if (isLead) {
              cell.font = { ...baseFont, bold: true, color: { argb: 'FFFFFFFF' } }
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.accent } }
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
            } else {
              cell.font = { ...baseFont, bold: true, color: { argb: 'FF374151' } }
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
            }
          }

          if (col.key === 'memberName' && isLead) {
            cell.font = { ...baseFont, bold: true, color: { argb: 'FF111827' } }
          }
        }
      })

      worksheet.getRow(rowNum).height = 20
      rowPointer += 1
    })

    applyMergedCommonCells(worksheet, teamStartRow, rowPointer - 1, commonColumnIndexes)
  })
}

const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export const exportStyledTemplateWorkbook = async ({
  teams,
  sheetName = 'Innovation Teams',
  selectedFieldKeys = STYLED_TEMPLATE_DEFAULT_SELECTED,
  commonFieldKeys = STYLED_TEMPLATE_DEFAULT_COMMON
}) => {
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.creator = 'Innovation Project Allocation Portal'

  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName))
  const selectedSet = new Set(selectedFieldKeys)
  const columns = STYLED_TEMPLATE_FIELDS.filter((field) => selectedSet.has(field.key))
  const scopedCommon = commonFieldKeys.filter((key) => selectedSet.has(key))

  if (columns.length === 0) {
    return
  }

  setColumnWidths(worksheet, columns)
  addTitleAndHeaderRows(worksheet, columns)
  populateStyledRows(worksheet, teams, columns, scopedCommon)

  worksheet.views = [{ state: 'frozen', ySplit: 2 }]
  worksheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: columns.length }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  triggerBlobDownload(blob, `innovation_teams_styled_${datePart}.xlsx`)
}

export const getGroupValue = (team, groupBy) => {
  if (groupBy === 'college') return team.college || 'Unknown'
  if (groupBy === 'department') return team.department || 'Unknown'
  if (groupBy === 'batchYear') return deriveBatchYear(team.leadUsn) || 'Unknown'
  return 'All'
}

export const getBatchYear = deriveBatchYear
