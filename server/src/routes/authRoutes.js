import { Router } from 'express'
import {
	changeTeamPassword,
	forceResetTeamPassword,
	getCurrentAdmin,
	getCurrentTeam,
	getTeamPasswordResetActivity,
	loginAdmin,
	loginTeam,
	requestPasswordResetOtp,
	resetTeamPassword,
	verifyPasswordResetOtp
} from '../controllers/authController.js'
import { requireAdminAuth, requireTeamAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', loginAdmin)
router.get('/me', requireAdminAuth, getCurrentAdmin)
router.post('/team/login', loginTeam)
router.get('/team/me', requireTeamAuth, getCurrentTeam)
router.post('/team/change-password', requireTeamAuth, changeTeamPassword)
router.post('/team/password-reset/request-otp', requestPasswordResetOtp)
router.post('/team/password-reset/verify-otp', verifyPasswordResetOtp)
router.post('/team/password-reset/reset', resetTeamPassword)
router.get('/admin/team-passwords/activity', requireAdminAuth, getTeamPasswordResetActivity)
router.post('/admin/team-passwords/:teamId/force-reset', requireAdminAuth, forceResetTeamPassword)

export default router
