import { Router } from 'express'
import {
  createRegistrationLookup,
  deleteRegistrationLookup,
  getAdminRegistrationLookups,
  getRegistrationLookups,
  updateRegistrationLookup
} from '../controllers/lookupController.js'
import { requireAdminAuth } from '../middleware/auth.js'

const router = Router()

router.get('/registration-options', getRegistrationLookups)

router.get('/admin/registration-options', requireAdminAuth, getAdminRegistrationLookups)
router.post('/admin/registration-options/:type', requireAdminAuth, createRegistrationLookup)
router.patch('/admin/registration-options/:type/:id', requireAdminAuth, updateRegistrationLookup)
router.delete('/admin/registration-options/:type/:id', requireAdminAuth, deleteRegistrationLookup)

export default router
