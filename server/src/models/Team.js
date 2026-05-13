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
    assignedProject: {
      title: String,
      description: String,
      difficulty: String,
      domain: String,
      technologies: [String]
    },
    assignedAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
)

export const Team = mongoose.model('Team', teamSchema)
