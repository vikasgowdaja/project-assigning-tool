import { Router } from 'express'
import {
  createProject,
  getProjects,
  getProjectSummary
} from '../controllers/projectController.js'

const router = Router()

router.post('/', createProject)
router.get('/', getProjects)
router.get('/summary', getProjectSummary)

export default router
