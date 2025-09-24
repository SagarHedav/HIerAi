import express from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'
import { getAvailability, setAvailability, listMeetings, createMeeting, cancelMeeting } from '../controllers/schedule.controller.js'

const router = express.Router()
router.get('/availability/:userId', protectRoute, getAvailability)
router.put('/availability', protectRoute, setAvailability)
router.get('/meetings', protectRoute, listMeetings)
router.post('/meetings', protectRoute, createMeeting)
router.put('/meetings/:id/cancel', protectRoute, cancelMeeting)

export default router