import { Router } from 'express'
import {
  exportTeamsExcel,
  getDashboardStats,
  getTeams,
  registerTeam,
  deleteTeam,
  updateTeam,
  reconcileProjectAssignments,
  submitProfileUpdateRequest,
  recallProfileUpdateRequest,
  reviewProfileUpdateRequest,
  reviewCustomProjectIdeaRequest
} from '../controllers/teamController.js'
import { requireAdminAuth, requireTeamAuth } from '../middleware/auth.js'

const router = Router()


// Admin CRUD
router.post('/admin/:teamId/update-request/review', requireAdminAuth, reviewProfileUpdateRequest)
router.post('/admin/:teamId/custom-idea/review', requireAdminAuth, reviewCustomProjectIdeaRequest)
router.delete('/:id', requireAdminAuth, deleteTeam)
router.patch('/:id', requireAdminAuth, updateTeam)
router.post('/admin/reconcile-projects', requireAdminAuth, reconcileProjectAssignments)

router.post('/team/update-request', requireTeamAuth, submitProfileUpdateRequest)
router.post('/team/update-request/recall', requireTeamAuth, recallProfileUpdateRequest)

router.post('/register', registerTeam)
router.get('/export', exportTeamsExcel)
router.get('/', getTeams)
router.get('/stats', getDashboardStats)

export default router
