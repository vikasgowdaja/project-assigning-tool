import { Project } from '../models/Project.js'
import { Team } from '../models/Team.js'

export const assignRandomProject = async (teamId) => {
  const activeAssignedTitles = await Team.distinct('assignedProject.title', {
    'assignedProject.title': { $exists: true, $ne: '' }
  })

  // Round 1: unique allocation from titles not currently used by active teams.
  const uniquePipeline = activeAssignedTitles.length > 0
    ? [
        { $match: { title: { $nin: activeAssignedTitles } } },
        { $sample: { size: 1 } }
      ]
    : [{ $sample: { size: 1 } }]

  const [uniqueProject] = await Project.aggregate(uniquePipeline)

  if (uniqueProject) {
    const assignedAt = new Date()
    await Project.updateOne(
      { _id: uniqueProject._id },
      {
        $set: {
          assigned: true,
          assignedTo: teamId,
          assignedAt
        }
      }
    )

    return {
      title: uniqueProject.title,
      description: uniqueProject.description,
      difficulty: uniqueProject.difficulty,
      domain: uniqueProject.domain,
      technologies: uniqueProject.technologies,
      assignedAt
    }
  }

  // Round 2+: pool exhausted, allow random reuse to keep assignment running.
  const [reusedProject] = await Project.aggregate([{ $sample: { size: 1 } }])
  if (!reusedProject) {
    return null
  }

  return {
    title: reusedProject.title,
    description: reusedProject.description,
    difficulty: reusedProject.difficulty,
    domain: reusedProject.domain,
    technologies: reusedProject.technologies,
    assignedAt: new Date()
  }
}

export const getProjectStats = async () => {
  const [projects, activeAssignedTitles] = await Promise.all([
    Project.find().select('title').lean(),
    Team.distinct('assignedProject.title', {
      'assignedProject.title': { $exists: true, $ne: '' }
    })
  ])

  const totalProjects = projects.length
  const projectTitleSet = new Set(projects.map((project) => String(project.title).toLowerCase()))
  const assignedProjects = activeAssignedTitles.reduce((count, title) => {
    return projectTitleSet.has(String(title).toLowerCase()) ? count + 1 : count
  }, 0)

  return {
    totalProjects,
    assignedProjects,
    remainingProjects: totalProjects - assignedProjects
  }
}
