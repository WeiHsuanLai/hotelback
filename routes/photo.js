import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import upload from '../middlewares/upload.js'
import admin from '../middlewares/admin.js'
import { create } from '../controllers/photo.js'

const router = Router()

router.post('/', auth.jwt, upload, create)

export default router
