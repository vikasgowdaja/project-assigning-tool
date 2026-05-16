import mongoose from 'mongoose'

const registrationLookupSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['college', 'department'],
      required: true,
      index: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    normalizedLabel: {
      type: String,
      required: true,
      trim: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
)

registrationLookupSchema.index({ type: 1, normalizedLabel: 1 }, { unique: true })

export const RegistrationLookup = mongoose.model('RegistrationLookup', registrationLookupSchema)
