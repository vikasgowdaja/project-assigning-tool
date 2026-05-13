import { PROJECT_POOL } from '../data/projects.js'
import { Project } from '../models/Project.js'

export const ensureProjectPool = async () => {
  const operations = PROJECT_POOL.map((project) => ({
    updateOne: {
      filter: { title: project.title },
      update: { $setOnInsert: project },
      upsert: true
    }
  }))

  if (!operations.length) {
    return
  }

  await Project.bulkWrite(operations)
}
