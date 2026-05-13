import { Router } from 'express'
import {
  exportTeamsExcel,
  getDashboardStats,
  getTeams,
  registerTeam
} from '../controllers/teamController.js'

const router = Router()

router.post('/register', registerTeam)
router.get('/export', exportTeamsExcel)
router.get('/', getTeams)
router.get('/stats', getDashboardStats)

export default router
