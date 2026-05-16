import { Router } from 'express'
import {
  exportTeamsExcel,
  getDashboardStats,
  getAdminTeams,
  getRegistrationMigrationSummary,
  getTeams,
  registerTeam,
  deleteTeam,
  updateTeam,
  runRegistrationMigration,
  reconcileProjectAssignments,
  submitProfileUpdateRequest,
  recallProfileUpdateRequest,
  reviewProfileUpdateRequest,
  submitCustomProjectIdeaRequest,
  reviewCustomProjectIdeaRequest,
  reviewTeamRegistrationRequest,
  previewTeamCustomIdeaUpload,
  uploadTeamCustomIdeaBulk
} from '../controllers/teamController.js'
import { uploadProjectFile } from '../middleware/upload.js'
import { requireAdminAuth, requireTeamAuth } from '../middleware/auth.js'

const router = Router()


// Admin CRUD
router.post('/admin/:teamId/update-request/review', requireAdminAuth, reviewProfileUpdateRequest)
router.post('/admin/:teamId/custom-idea/review', requireAdminAuth, reviewCustomProjectIdeaRequest)
router.post('/admin/:teamId/registration/review', requireAdminAuth, reviewTeamRegistrationRequest)
router.get('/admin', requireAdminAuth, getAdminTeams)
router.get('/admin/migration/registration-summary', requireAdminAuth, getRegistrationMigrationSummary)
router.post('/admin/migration/registration', requireAdminAuth, runRegistrationMigration)
router.delete('/:id', requireAdminAuth, deleteTeam)
router.patch('/:id', requireAdminAuth, updateTeam)
router.post('/admin/reconcile-projects', requireAdminAuth, reconcileProjectAssignments)

router.post('/team/update-request', requireTeamAuth, submitProfileUpdateRequest)
router.post('/team/update-request/recall', requireTeamAuth, recallProfileUpdateRequest)
router.post('/team/custom-idea/request', requireTeamAuth, submitCustomProjectIdeaRequest)

// Team bulk custom project idea upload/preview (Excel/PDF)
router.post('/team/custom-idea/upload/preview', requireTeamAuth, uploadProjectFile.single('file'), previewTeamCustomIdeaUpload)
router.post('/team/custom-idea/upload', requireTeamAuth, uploadProjectFile.single('file'), uploadTeamCustomIdeaBulk)

router.post('/register', registerTeam)
router.get('/export', exportTeamsExcel)
router.get('/', getTeams)
router.get('/stats', getDashboardStats)

export default router
