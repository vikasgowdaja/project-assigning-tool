import { Router } from 'express'
import {
  exportTeamsExcel,
  getDashboardStats,
  getTeams,
  registerTeam,
  deleteTeam,
  updateTeam
} from '../controllers/teamController.js'

const router = Router()


// Admin CRUD
router.delete('/:id', deleteTeam)
router.patch('/:id', updateTeam)

router.post('/register', registerTeam)
router.get('/export', exportTeamsExcel)
router.get('/', getTeams)
router.get('/stats', getDashboardStats)

export default router
