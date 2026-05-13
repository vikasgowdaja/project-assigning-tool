import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Easy', 'Medium', 'Hard']
    },
    domain: {
      type: String,
      required: true,
      trim: true
    },
    technologies: {
      type: [String],
      default: []
    },
    assigned: {
      type: Boolean,
      default: false,
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
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

export const Project = mongoose.model('Project', projectSchema)
