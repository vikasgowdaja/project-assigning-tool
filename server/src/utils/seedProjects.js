import { connectDb } from '../config/db.js'
import { Project } from '../models/Project.js'
import { PROJECT_POOL } from '../data/projects.js'

const seed = async () => {
  await connectDb()

  await Project.deleteMany({})
  await Project.insertMany(PROJECT_POOL)

  console.log(`Seeded ${PROJECT_POOL.length} projects successfully.`)
  process.exit(0)
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
