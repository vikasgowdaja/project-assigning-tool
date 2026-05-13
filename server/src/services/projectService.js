import { Project } from '../models/Project.js'

export const assignRandomProject = async (teamId) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const unassignedCount = await Project.countDocuments({ assigned: false })
    const pipeline = unassignedCount > 0
      ? [
          { $match: { assigned: false } },
          { $sample: { size: 1 } }
        ]
      : [{ $sample: { size: 1 } }]

    const [project] = await Project.aggregate(pipeline)

    if (!project) {
      return null
    }

    const assignedAt = new Date()
    const updated = await Project.findOneAndUpdate(
      { _id: project._id, assigned: false },
      {
        $set: {
          assigned: true,
          assignedTo: teamId,
          assignedAt
        }
      },
      { new: true }
    )

    if (updated) {
      return {
        title: updated.title,
        description: updated.description,
        difficulty: updated.difficulty,
        domain: updated.domain,
        technologies: updated.technologies,
        assignedAt
      }
    }
  }

  return null
}

export const getProjectStats = async () => {
  const [totalProjects, assignedProjects] = await Promise.all([
    Project.countDocuments(),
    Project.countDocuments({ assigned: true })
  ])

  return {
    totalProjects,
    assignedProjects,
    remainingProjects: totalProjects - assignedProjects
  }
}
