import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    usn: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    }
  },
  { _id: false }
)

const passwordResetSchema = new mongoose.Schema(
  {
    otpHash: String,
    otpExpiresAt: Date,
    otpVerifyAttempts: {
      type: Number,
      default: 0
    },
    otpResendCount: {
      type: Number,
      default: 0
    },
    lastOtpSentAt: Date,
    resetTokenHash: String,
    resetTokenExpiresAt: Date
  },
  { _id: false }
)

const securityActivitySchema = new mongoose.Schema(
  {
    otpRequestCount: {
      type: Number,
      default: 0
    },
    lastOtpRequestedAt: Date,
    otpVerifySuccessCount: {
      type: Number,
      default: 0
    },
    lastOtpVerifiedAt: Date,
    passwordResetCount: {
      type: Number,
      default: 0
    },
    lastPasswordResetAt: Date,
    adminForceResetCount: {
      type: Number,
      default: 0
    },
    lastPasswordResetByAdminAt: Date
  },
  { _id: false }
)

const profileUpdatePayloadSchema = new mongoose.Schema(
  {
    teamName: String,
    leadName: String,
    leadEmail: String,
    leadUsn: String,
    leadPhone: String,
    college: String,
    department: String,
    members: {
      type: [memberSchema],
      default: []
    },
    requestNote: String
  },
  { _id: false }
)

const profileUpdateRequestSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected', 'recalled'],
      default: 'none'
    },
    payload: {
      type: profileUpdatePayloadSchema,
      default: () => ({})
    },
    requestedAt: Date,
    recalledAt: Date,
    reviewedAt: Date,
    reviewedBy: String,
    reviewNote: String
  },
  { _id: false }
)

const teamSchema = new mongoose.Schema(
  {
    teamNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    teamName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    leadName: {
      type: String,
      required: true,
      trim: true
    },
    leadEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    leadUsn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    leadPhone: {
      type: String,
      required: true,
      trim: true
    },
    college: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    members: {
      type: [memberSchema],
      validate: {
        validator(value) {
          return value.length >= 2 && value.length <= 6
        },
        message: 'Members must be between 2 and 6'
      }
    },
    passwordHash: {
      type: String,
      default: ''
    },
    passwordHistory: {
      type: [String],
      default: []
    },
    isDefaultPassword: {
      type: Boolean,
      default: true
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    assignedProject: {
      title: String,
      description: String,
      difficulty: String,
      domain: String,
      technologies: [String]
    },
    customProjectIdea: {
      title: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard']
      },
      domain: {
        type: String,
        trim: true
      },
      technologies: {
        type: [String],
        default: []
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      submittedAt: Date
    },
    githubRepoUrl: {
      type: String,
      trim: true,
      default: ''
    },
    collaborationStatus: {
      type: String,
      enum: ['pending', 'collaborated'],
      default: 'pending',
      index: true
    },
    collaborationMarkedAt: {
      type: Date,
      default: null
    },
    collaborationMarkedBy: {
      type: String,
      default: ''
    },
    passwordReset: {
      type: passwordResetSchema,
      default: () => ({})
    },
    securityActivity: {
      type: securityActivitySchema,
      default: () => ({})
    },
    profileUpdateRequest: {
      type: profileUpdateRequestSchema,
      default: () => ({ status: 'none' })
    },
    registrationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    registrationReviewedAt: {
      type: Date,
      default: null
    },
    registrationReviewedBy: {
      type: String,
      default: ''
    },
    registrationReviewNote: {
      type: String,
      default: ''
    },
    assignedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
)

export const Team = mongoose.model('Team', teamSchema)
