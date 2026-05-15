import { Router } from 'express'
import { getCurrentAdmin, loginAdmin } from '../controllers/authController.js'
import { requireAdminAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', loginAdmin)
router.get('/me', requireAdminAuth, getCurrentAdmin)

export default router
