import { RegistrationLookup } from '../models/RegistrationLookup.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'

const LOOKUP_TYPES = new Set(['college', 'department'])

const DEFAULT_LOOKUPS = {
  college: ['PES College of Engineering, Mandya'],
  department: ['Computer Science and Engineering']
}

const normalizeLabel = (value) => String(value || '').trim().replace(/\s+/g, ' ')

const validateType = (value) => {
  const type = String(value || '').trim().toLowerCase()
  if (!LOOKUP_TYPES.has(type)) {
    throw new ApiError(400, 'Invalid lookup type')
  }
  return type
}

const ensureDefaultLookups = async () => {
  const defaults = []

  for (const type of Object.keys(DEFAULT_LOOKUPS)) {
    for (const rawLabel of DEFAULT_LOOKUPS[type]) {
      const label = normalizeLabel(rawLabel)
      if (!label) {
        continue
      }

      defaults.push({
        updateOne: {
          filter: {
            type,
            normalizedLabel: label.toLowerCase()
          },
          update: {
            $setOnInsert: {
              type,
              label,
              normalizedLabel: label.toLowerCase(),
              active: true,
              createdBy: 'system-default',
              updatedBy: 'system-default'
            }
          },
          upsert: true
        }
      })
    }
  }

  if (defaults.length > 0) {
    await RegistrationLookup.bulkWrite(defaults)
  }
}

const getLookupPayload = (rows) => ({
  colleges: rows
    .filter((row) => row.type === 'college' && row.active)
    .map((row) => row.label),
  departments: rows
    .filter((row) => row.type === 'department' && row.active)
    .map((row) => row.label)
})

export const getRegistrationLookups = asyncHandler(async (req, res) => {
  await ensureDefaultLookups()

  const rows = await RegistrationLookup.find({ active: true })
    .sort({ type: 1, label: 1 })
    .lean()

  res.json(getLookupPayload(rows))
})

export const getAdminRegistrationLookups = asyncHandler(async (req, res) => {
  await ensureDefaultLookups()

  const rows = await RegistrationLookup.find()
    .sort({ type: 1, label: 1 })
    .lean()

  res.json({
    colleges: rows.filter((row) => row.type === 'college'),
    departments: rows.filter((row) => row.type === 'department')
  })
})

export const createRegistrationLookup = asyncHandler(async (req, res) => {
  const type = validateType(req.params.type)
  const label = normalizeLabel(req.body?.label)

  if (!label) {
    throw new ApiError(400, 'Label is required')
  }

  try {
    const created = await RegistrationLookup.create({
      type,
      label,
      normalizedLabel: label.toLowerCase(),
      active: true,
      createdBy: String(req.admin?.username || 'admin'),
      updatedBy: String(req.admin?.username || 'admin')
    })

    res.status(201).json({
      message: `${type} added successfully`,
      item: created
    })
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, `${type} already exists`)
    }
    throw error
  }
})

export const updateRegistrationLookup = asyncHandler(async (req, res) => {
  const type = validateType(req.params.type)
  const label = normalizeLabel(req.body?.label)
  const hasActive = Object.prototype.hasOwnProperty.call(req.body || {}, 'active')

  if (!label && !hasActive) {
    throw new ApiError(400, 'Provide label or active status to update')
  }

  const item = await RegistrationLookup.findOne({ _id: req.params.id, type })
  if (!item) {
    throw new ApiError(404, 'Lookup item not found')
  }

  if (label) {
    item.label = label
    item.normalizedLabel = label.toLowerCase()
  }

  if (hasActive) {
    item.active = Boolean(req.body.active)
  }

  item.updatedBy = String(req.admin?.username || 'admin')

  try {
    await item.save()
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, `${type} already exists`)
    }
    throw error
  }

  res.json({
    message: `${type} updated successfully`,
    item
  })
})

export const deleteRegistrationLookup = asyncHandler(async (req, res) => {
  const type = validateType(req.params.type)
  const item = await RegistrationLookup.findOneAndDelete({ _id: req.params.id, type })

  if (!item) {
    throw new ApiError(404, 'Lookup item not found')
  }

  res.json({
    message: `${type} removed successfully`
  })
})
