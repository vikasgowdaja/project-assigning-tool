import { Router } from 'express'
import {
  exportTeamsExcel,
  getDashboardStats,
  getTeams,
  registerTeam,
  deleteTeam,
  updateTeam,
  reconcileProjectAssignments
} from '../controllers/teamController.js'
import { requireAdminAuth } from '../middleware/auth.js'

const router = Router()


// Admin CRUD
router.delete('/:id', requireAdminAuth, deleteTeam)
router.patch('/:id', requireAdminAuth, updateTeam)
router.post('/admin/reconcile-projects', requireAdminAuth, reconcileProjectAssignments)

router.post('/register', registerTeam)
router.get('/export', exportTeamsExcel)
router.get('/', getTeams)
router.get('/stats', getDashboardStats)

export default router
