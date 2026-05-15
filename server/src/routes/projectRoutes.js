import { Router } from 'express'
import {
  bulkUploadProjects,
  createProject,
  downloadProjectTemplate,
  getProjects,
  getProjectSummary,
  previewProjectsUpload
} from '../controllers/projectController.js'
import { requireAdminAuth } from '../middleware/auth.js'
import { uploadProjectFile } from '../middleware/upload.js'

const router = Router()

router.post('/', requireAdminAuth, createProject)
router.post('/upload/preview', requireAdminAuth, uploadProjectFile.single('file'), previewProjectsUpload)
router.post('/upload', requireAdminAuth, uploadProjectFile.single('file'), bulkUploadProjects)
router.get('/template', requireAdminAuth, downloadProjectTemplate)
router.get('/', getProjects)
router.get('/summary', getProjectSummary)

export default router
